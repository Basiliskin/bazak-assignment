import { Logger, Module } from '@nestjs/common';
import { APP_CONFIG } from '../shared/config/config.module.js';
import type { AppConfig } from '../shared/config/app-config.js';
import { CatalogPort } from './application/catalog.port.js';
import { CatalogService } from './application/catalog.service.js';
import { DummyJsonCatalog } from './infrastructure/dummyjson.catalog.js';
import { ProductsController } from './presentation/products.controller.js';

const CATALOG_TTL_MS = 10 * 60 * 1000;

@Module({
  controllers: [ProductsController],
  providers: [
    {
      provide: CatalogPort,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => {
        const logger = new Logger('Catalog');
        return new DummyJsonCatalog({
          baseUrl: config.dummyJsonUrl,
          ttlMs: CATALOG_TTL_MS,
          onWarn: (m) => logger.warn(m),
        });
      },
    },
    {
      provide: CatalogService,
      inject: [CatalogPort],
      useFactory: (port: CatalogPort) => new CatalogService(port),
    },
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
