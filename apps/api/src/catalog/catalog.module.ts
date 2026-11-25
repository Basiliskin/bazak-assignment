import { Inject, Logger, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { APP_CONFIG } from '../shared/config/config.module.js';
import type { AppConfig } from '../shared/config/app-config.js';
import { CatalogPort } from './application/catalog.port.js';
import { CatalogService } from './application/catalog.service.js';
import { EmbeddingPort } from './application/embedding.port.js';
import { ProductSearchPort } from './application/product-search.port.js';
import { RecommendationService } from './application/recommendation.service.js';
import { VectorIndexPort } from './application/vector-index.port.js';
import { DummyJsonCatalog } from './infrastructure/dummyjson.catalog.js';
import { ApiOnlyProductSearch } from './infrastructure/api-only.product-search.js';
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
      inject: [APP_CONFIG, CatalogPort],
      useFactory: (config: AppConfig, catalog: CatalogPort) => {
        if (config.catalogMode === 'memory') return new InMemoryProductSearch(catalog);
        const logger = new Logger('Catalog');
        return new ApiOnlyProductSearch({ baseUrl: config.dummyJsonUrl, onWarn: (m) => logger.warn(m) });
      },
    },
    {
      provide: CatalogService,
      inject: [APP_CONFIG, ProductSearchPort, RecommendationService],
      // API mode has no Recommended Group: embeddings need the whole Catalog (ADR 0005).
      useFactory: (config: AppConfig, search: ProductSearchPort, recommendations: RecommendationService) =>
        new CatalogService(search, config.catalogMode === 'memory' ? recommendations : null),
    },
  ],
  exports: [CatalogService, RecommendationService],
})
export class CatalogModule implements OnApplicationBootstrap {
  constructor(
    private readonly recommendations: RecommendationService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Load the model and embed the Catalog in the background — startup never waits for it (D44). Memory mode only. */
  onApplicationBootstrap(): void {
    if (this.config.catalogMode === 'memory') void this.recommendations.warmUp();
  }
}
