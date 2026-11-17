import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { APP_CONFIG } from '../src/shared/config/config.module.js';
import { configureApp } from '../src/shared/configure-app.js';
import type { AppConfig } from '../src/shared/config/app-config.js';

const testConfig: AppConfig = {
  openAiKey: 'test',
  model: 'gpt-6-luna',
  port: 0,
  databasePath: ':memory:',
  dummyJsonUrl: 'http://catalog.invalid',
};

describe('GET /api/health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(testConfig)
      .compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(() => app.close());

  it('returns ok', () => request(app.getHttpServer()).get('/api/health').expect(200, { status: 'ok' }));
});
