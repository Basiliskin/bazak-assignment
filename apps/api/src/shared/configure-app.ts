import type { INestApplication } from '@nestjs/common';
import { DomainExceptionFilter } from './presentation/domain-exception.filter.js';

/** Shared by main.ts and e2e tests so both run the same app setup (DRY). */
export function configureApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new DomainExceptionFilter());
  app.enableShutdownHooks();
  return app;
}
