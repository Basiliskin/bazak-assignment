import { fileURLToPath } from 'node:url';
import { Global, Module } from '@nestjs/common';
import { parseConfig, type AppConfig } from './app-config.js';

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Repo root, resolved from this file (same depth in src/ and dist/) — independent of the working directory. */
const ROOT_DIR = fileURLToPath(new URL('../../../../../', import.meta.url));
const ROOT_ENV_FILE = new URL('../../../../../.env', import.meta.url);

/** Loads `.env` into process.env if present. Variables already set in the environment win. */
function loadEnvFileIfPresent(file: URL): void {
  try {
    process.loadEnvFile(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
}

/** Imperative shell: reads the environment once at boot and fails fast with readable errors. */
export function loadConfigOrExit(): AppConfig {
  loadEnvFileIfPresent(ROOT_ENV_FILE);
  const result = parseConfig(process.env, ROOT_DIR);
  if (result.ok) return result.config;
  console.error(`Invalid configuration:\n  ${result.errors.join('\n  ')}`);
  process.exit(1);
}

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: loadConfigOrExit }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
