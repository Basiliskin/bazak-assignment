import { describe, expect, it } from 'vitest';
import { CatalogUnavailableError, ProductNotFoundError } from '../domain/catalog.errors.js';
import { product } from '../../../test/support/product.fixture.js';
import { CatalogService } from './catalog.service.js';
import type { CatalogPort } from './catalog.port.js';
import type { CatalogQuery } from '../domain/filter-products.js';

const port = (products = [product({ id: 1, price: 100 }), product({ id: 2, price: 900 })]): CatalogPort => ({
  getAll: async () => products,
});
const query: CatalogQuery = {
  category: null,
  keywords: [],
  minPrice: null,
  maxPrice: 500,
  sortBy: 'relevance',
  offset: 0,
};

describe('CatalogService', () => {
  it('search returns Product Cards and the total', async () => {
    const r = await new CatalogService(port()).search(query);
    expect(r.total).toBe(1);
    expect(r.products[0]).not.toHaveProperty('stock');
    expect(r.products[0]?.id).toBe(1);
  });

  it('getById returns full details', async () => {
    expect((await new CatalogService(port()).getById(2)).stock).toBe(10);
  });

  it('getById throws ProductNotFound for an unknown id', async () => {
    await expect(new CatalogService(port()).getById(99)).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it('lets CatalogUnavailable through for callers to handle', async () => {
    const down: CatalogPort = { getAll: () => Promise.reject(new CatalogUnavailableError()) };
    await expect(new CatalogService(down).search(query)).rejects.toBeInstanceOf(CatalogUnavailableError);
  });
});
