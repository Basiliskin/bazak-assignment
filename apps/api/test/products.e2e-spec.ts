import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { CatalogUnavailableError } from '../src/catalog/domain/catalog.errors.js';
import { product } from './support/product.fixture.js';
import { createTestApp } from './support/create-test-app.js';

describe('GET /api/products/:id', () => {
  let app: INestApplication;
  afterEach(() => app.close());

  it('returns the Product details', async () => {
    app = await createTestApp({
      catalog: { getAll: async () => [product({ id: 5, title: 'iPhone 9', images: ['a'] })] },
    });
    const res = await request(app.getHttpServer()).get('/api/products/5').expect(200);
    expect(res.body).toMatchObject({ id: 5, title: 'iPhone 9', images: ['a'], stock: 10 });
  });

  it('404s with the error shape for an unknown id', async () => {
    app = await createTestApp();
    await request(app.getHttpServer())
      .get('/api/products/999')
      .expect(404, { error: { code: 'PRODUCT_NOT_FOUND', message: 'Product 999 not found' } });
  });

  it('400s for a non-numeric id', async () => {
    app = await createTestApp();
    const res = await request(app.getHttpServer()).get('/api/products/abc').expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('503s when the Catalog is unavailable (AC3.8)', async () => {
    app = await createTestApp({ catalog: { getAll: () => Promise.reject(new CatalogUnavailableError()) } });
    const res = await request(app.getHttpServer()).get('/api/products/1').expect(503);
    expect(res.body.error.code).toBe('CATALOG_UNAVAILABLE');
  });
});
