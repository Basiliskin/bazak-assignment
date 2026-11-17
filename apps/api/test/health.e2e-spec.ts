import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { createTestApp } from './support/create-test-app.js';

describe('GET /api/health', () => {
  let app: INestApplication;
  beforeAll(async () => (app = await createTestApp()));
  afterAll(() => app.close());

  it('returns ok', () => request(app.getHttpServer()).get('/api/health').expect(200, { status: 'ok' }));
});
