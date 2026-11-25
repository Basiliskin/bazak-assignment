import { describe, expect, it } from 'vitest';
import { product } from '../../../test/support/product.fixture.js';
import { CatalogUnavailableError, ProductNotFoundError } from '../domain/catalog.errors.js';
import type { CatalogQuery } from '../domain/filter-products.js';
import { InMemoryProductSearch } from './in-memory.product-search.js';

const query: CatalogQuery = {
  category: null,
  keywords: [],
  minPrice: null,
  maxPrice: null,
  sortBy: 'relevance',
  offset: 0,
};
const all = [
  product({ id: 1, rating: 3 }),
  product({ id: 2, rating: 5 }),
  product({ id: 3, rating: 4, stock: 0 }),
];
const search = (products = all) => new InMemoryProductSearch({ getAll: async () => products });

describe('InMemoryProductSearch', () => {
  it('searches the whole Catalog, so the result is always complete', async () => {
    const r = await search().search(query, null);
    expect(r.matchIds).toEqual([2, 1]); // out of stock left out (R9)
    expect(r.coverage).toEqual({ checked: 3, complete: true });
  });

  it('passes the similarity order through', async () => {
    expect((await search().search(query, [1, 2])).matchIds).toEqual([1, 2]);
  });

  it('topRated and getById read the same copy', async () => {
    expect((await search().topRated(1)).map((p) => p.id)).toEqual([2]);
    expect((await search().getById(3)).id).toBe(3);
    await expect(search().getById(99)).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it('lets CatalogUnavailable through', async () => {
    const down = new InMemoryProductSearch({ getAll: () => Promise.reject(new CatalogUnavailableError()) });
    await expect(down.search(query, null)).rejects.toBeInstanceOf(CatalogUnavailableError);
  });
});
