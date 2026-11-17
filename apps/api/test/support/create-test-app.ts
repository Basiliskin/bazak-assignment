import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module.js';
import { CatalogPort } from '../../src/catalog/application/catalog.port.js';
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
};

/** The real app with fakes at the ports — no network, no files. */
export async function createTestApp(fakes: { catalog?: CatalogPort } = {}): Promise<INestApplication> {
  const catalog: CatalogPort = fakes.catalog ?? { getAll: async (): Promise<Product[]> => [] };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(APP_CONFIG)
    .useValue(testConfig)
    .overrideProvider(CatalogPort)
    .useValue(catalog)
    .compile();
  const app = configureApp(moduleRef.createNestApplication({ logger: false }));
  await app.init();
  return app;
}
