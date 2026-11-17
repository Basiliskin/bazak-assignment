import { Global, Module } from '@nestjs/common';
import { parseConfig, type AppConfig } from './app-config.js';

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Imperative shell: reads process.env once at boot and fails fast with readable errors. */
export function loadConfigOrExit(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const result = parseConfig(env);
  if (result.ok) return result.config;
  console.error(`Invalid configuration:\n  ${result.errors.join('\n  ')}`);
  process.exit(1);
}

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfigOrExit() }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
