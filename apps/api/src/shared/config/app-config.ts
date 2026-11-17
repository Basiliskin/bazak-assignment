import { isAbsolute, join } from 'node:path';
import { z } from 'zod';

/** The only model this assignment's key may use. */
export const ALLOWED_MODEL = 'gpt-6-luna';

const MISSING_KEY = 'OPENAI_KEY is missing — copy .env.example to .env and fill it in';

const EnvSchema = z.object({
  OPENAI_KEY: z.string({ error: MISSING_KEY }).min(1, MISSING_KEY),
  OPENAI_MODEL: z.literal(ALLOWED_MODEL).default(ALLOWED_MODEL),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_PATH: z.string().min(1).default('data/app.db'),
  DUMMYJSON_URL: z.url().default('https://dummyjson.com'),
});

export interface AppConfig {
  readonly openAiKey: string;
  readonly model: typeof ALLOWED_MODEL;
  readonly port: number;
  readonly databasePath: string;
  readonly dummyJsonUrl: string;
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
    },
  };
}
