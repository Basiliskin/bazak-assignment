import type { INestApplication } from '@nestjs/common';

/** Shared by main.ts and e2e tests so both run the same app setup (DRY). */
export function configureApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  return app;
}
