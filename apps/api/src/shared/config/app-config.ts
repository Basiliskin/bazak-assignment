import { isAbsolute, join } from 'node:path';
import { z } from 'zod';

/** The only model this assignment's key may use. */
export const ALLOWED_MODEL = 'gpt-6-luna';

/** Where searches look (ADR 0005): `memory` = the whole Catalog downloaded; `api` = DummyJSON per search. */
export const CATALOG_MODES = ['memory', 'api'] as const;
export type CatalogMode = (typeof CATALOG_MODES)[number];

const MISSING_KEY = 'OPENAI_KEY is missing — copy .env.example to .env and fill it in';

const EnvSchema = z.object({
  OPENAI_KEY: z.string({ error: MISSING_KEY }).min(1, MISSING_KEY),
  OPENAI_MODEL: z.literal(ALLOWED_MODEL).default(ALLOWED_MODEL),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_PATH: z.string().min(1).default('data/app.db'),
  DUMMYJSON_URL: z.url().default('https://dummyjson.com'),
  MODEL_CACHE_DIR: z.string().min(1).default('data/models'),
  CATALOG_MODE: z.enum(CATALOG_MODES).default('memory'),
});

export interface AppConfig {
  readonly openAiKey: string;
  readonly model: typeof ALLOWED_MODEL;
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
      openAiKey: e.OPENAI_KEY,
      model: e.OPENAI_MODEL,
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
