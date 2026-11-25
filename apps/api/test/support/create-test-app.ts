import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { LanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { AppModule } from '../../src/app.module.js';
import { LANGUAGE_MODEL } from '../../src/assistant/assistant.module.js';
import { CatalogPort } from '../../src/catalog/application/catalog.port.js';
import { EmbeddingPort } from '../../src/catalog/application/embedding.port.js';
import { keywordEmbedding } from './fake-embedding.js';
import type { Product } from '../../src/catalog/domain/product.js';
import { APP_CONFIG } from '../../src/shared/config/config.module.js';
import type { AppConfig } from '../../src/shared/config/app-config.js';
import { configureApp } from '../../src/shared/configure-app.js';

export const testConfig: AppConfig = {
  openAiKey: 'test',
  model: 'gpt-6-luna',
  port: 0,
  databasePath: ':memory:',
  dummyJsonUrl: 'http://catalog.invalid',
  modelCacheDir: '/nonexistent/models',
  catalogMode: 'memory',
};

/** The real app with fakes at the ports — no network, no files. */
export async function createTestApp(
  fakes: {
    catalog?: CatalogPort;
    model?: LanguageModel;
    embedding?: EmbeddingPort;
    config?: Partial<AppConfig>;
  } = {},
): Promise<INestApplication> {
  const catalog: CatalogPort = fakes.catalog ?? { getAll: async (): Promise<Product[]> => [] };
  const model =
    fakes.model ??
    new MockLanguageModelV4({ doStream: () => Promise.reject(new Error('no LLM in this test')) });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue({ ...testConfig, ...fakes.config })
    .overrideProvider(CatalogPort)
    .useValue(catalog)
    .overrideProvider(LANGUAGE_MODEL)
    .useValue(model)
    .overrideProvider(EmbeddingPort)
    .useValue(fakes.embedding ?? keywordEmbedding())
    .compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.init();
  return app;
}
