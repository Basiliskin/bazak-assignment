import { isAbsolute, join } from 'node:path';
import { z } from 'zod';

/** The only model this assignment's key may use. */
export const ALLOWED_MODEL = 'gpt-6-luna';

/**
 * Who runs the Assistant. `openai` (gpt-6-luna) is what the assignment allows and the default; `anthropic` is a
 * local-development option on the Claude API, billed to the developer's own Claude Console account.
 */
export const LLM_PROVIDERS = ['openai', 'anthropic'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];
export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5-5';

/** Where searches look (ADR 0005): `memory` = the whole Catalog downloaded; `api` = DummyJSON per search. */
export const CATALOG_MODES = ['memory', 'api'] as const;
export type CatalogMode = (typeof CATALOG_MODES)[number];

const MISSING_KEY = 'OPENAI_KEY is missing — copy .env.example to .env and fill it in';

/** An optional URL; an empty `.env` line (`OPENAI_BASE_URL=`) counts as not set. */
const optionalUrl = z.preprocess((v) => (v === '' ? undefined : v), z.url().optional());

const EnvSchema = z
  .object({
    LLM_PROVIDER: z.enum(LLM_PROVIDERS).default('openai'),
    OPENAI_KEY: z.string().optional(),
    OPENAI_MODEL: z.literal(ALLOWED_MODEL).default(ALLOWED_MODEL),
    /** e.g. a proxy or gateway; unset = the provider's own API. */
    OPENAI_BASE_URL: optionalUrl,
    ANTHROPIC_BASE_URL: optionalUrl,
    /** Credentials are not read here: the SDK finds ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile. */
    ANTHROPIC_MODEL: z.string().min(1).default(DEFAULT_ANTHROPIC_MODEL),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_PATH: z.string().min(1).default('data/app.db'),
    DUMMYJSON_URL: z.url().default('https://dummyjson.com'),
    MODEL_CACHE_DIR: z.string().min(1).default('data/models'),
    CATALOG_MODE: z.enum(CATALOG_MODES).default('memory'),
  })
  .superRefine((e, ctx) => {
    if (e.LLM_PROVIDER === 'openai' && !e.OPENAI_KEY)
      ctx.addIssue({ code: 'custom', path: ['OPENAI_KEY'], message: MISSING_KEY });
  });

export interface AppConfig {
  readonly llmProvider: LlmProvider;
  /** Set when `llmProvider` is `openai`. */
  readonly openAiKey: string | null;
  /** Where each provider's API is called; null = the provider's default. */
  readonly openAiBaseUrl: string | null;
  readonly anthropicBaseUrl: string | null;
  /** The model the Assistant runs on: gpt-6-luna, or `ANTHROPIC_MODEL` with the anthropic provider. */
  readonly model: string;
  readonly port: number;
  readonly databasePath: string;
  readonly dummyJsonUrl: string;
  /** Where the local embedding model is downloaded to (ADR 0004). */
  readonly modelCacheDir: string;
  readonly catalogMode: CatalogMode;
}

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; errors: string[] };

/**
 * Pure: raw environment → validated config, or readable errors (never echoes values — the key stays secret).
 * Relative paths are resolved against `rootDir` (the repo root), never the working directory.
 */
export function parseConfig(env: Record<string, string | undefined>, rootDir: string): ConfigResult {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  }
  const e = parsed.data;
  return {
    ok: true,
    config: {
      llmProvider: e.LLM_PROVIDER,
      openAiKey: e.OPENAI_KEY || null,
      openAiBaseUrl: e.OPENAI_BASE_URL ?? null,
      anthropicBaseUrl: e.ANTHROPIC_BASE_URL ?? null,
      model: e.LLM_PROVIDER === 'anthropic' ? e.ANTHROPIC_MODEL : e.OPENAI_MODEL,
      port: e.PORT,
      databasePath:
        e.DATABASE_PATH === ':memory:' || isAbsolute(e.DATABASE_PATH)
          ? e.DATABASE_PATH
          : join(rootDir, e.DATABASE_PATH),
      dummyJsonUrl: e.DUMMYJSON_URL,
      modelCacheDir: isAbsolute(e.MODEL_CACHE_DIR) ? e.MODEL_CACHE_DIR : join(rootDir, e.MODEL_CACHE_DIR),
      catalogMode: e.CATALOG_MODE,
    },
  };
}
