import { Logger, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { APP_CONFIG } from '../shared/config/config.module.js';
import type { AppConfig } from '../shared/config/app-config.js';
import { CatalogPort } from './application/catalog.port.js';
import { CatalogService } from './application/catalog.service.js';
import { EmbeddingPort } from './application/embedding.port.js';
import { ProductSearchPort } from './application/product-search.port.js';
import { RecommendationService } from './application/recommendation.service.js';
import { VectorIndexPort } from './application/vector-index.port.js';
import { DummyJsonCatalog } from './infrastructure/dummyjson.catalog.js';
import { InMemoryProductSearch } from './infrastructure/in-memory.product-search.js';
import { InMemoryVectorIndex } from './infrastructure/in-memory.vector-index.js';
import { LocalEmbedding } from './infrastructure/local-embedding.js';
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
      provide: EmbeddingPort,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new LocalEmbedding(config.modelCacheDir),
    },
    { provide: VectorIndexPort, useClass: InMemoryVectorIndex },
    {
      provide: RecommendationService,
      inject: [CatalogPort, EmbeddingPort, VectorIndexPort],
      useFactory: (catalog: CatalogPort, embedder: EmbeddingPort, index: VectorIndexPort) => {
        const logger = new Logger('Recommendations');
        return new RecommendationService(catalog, embedder, index, (m) => logger.warn(m));
      },
    },
    {
      provide: ProductSearchPort,
      inject: [CatalogPort],
      useFactory: (catalog: CatalogPort) => new InMemoryProductSearch(catalog),
    },
    {
      provide: CatalogService,
      inject: [ProductSearchPort, RecommendationService],
      useFactory: (search: ProductSearchPort, recommendations: RecommendationService) =>
        new CatalogService(search, recommendations),
    },
  ],
  exports: [CatalogService, RecommendationService],
})
export class CatalogModule implements OnApplicationBootstrap {
  constructor(private readonly recommendations: RecommendationService) {}

  /** Load the model and embed the Catalog in the background — startup never waits for it (D44). */
  onApplicationBootstrap(): void {
    void this.recommendations.warmUp();
  }
}
