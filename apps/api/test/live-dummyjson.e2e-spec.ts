import { describe, expect, it } from 'vitest';
import type { CatalogQuery } from '../src/catalog/domain/filter-products.js';
import { ApiOnlyProductSearch } from '../src/catalog/infrastructure/api-only.product-search.js';

/**
 * Opt-in smoke test against the real DummyJSON (ADR 0005) — never in CI. Run with:
 *   LIVE_DUMMYJSON=1 npx vitest run test/live-dummyjson.e2e-spec.ts
 * It checks that the endpoints still behave as the API-only search assumes (paging `total`, server sort).
 */
const q = (over: Partial<CatalogQuery>): CatalogQuery => ({
  category: null,
  keywords: [],
  minPrice: null,
  maxPrice: null,
  sortBy: 'relevance',
  offset: 0,
  ...over,
});

describe.skipIf(!process.env.LIVE_DUMMYJSON)('live DummyJSON (opt-in)', () => {
  const search = new ApiOnlyProductSearch({ baseUrl: process.env.DUMMYJSON_URL ?? 'https://dummyjson.com' });

  it('a category search with a price limit', async () => {
    const r = await search.search(q({ category: 'smartphones', maxPrice: 500, sortBy: 'price-asc' }));
    expect(r.coverage.complete).toBe(true);
    expect(r.products.length).toBeGreaterThan(0);
    expect(r.products.every((p) => p.category === 'smartphones' && p.price <= 500)).toBe(true);
    const prices = r.products.map((p) => p.price);
    expect(prices).toEqual(prices.toSorted((a, b) => a - b));
  }, 10_000);

  it('a keyword search and a server-sorted global search', async () => {
    expect((await search.search(q({ keywords: ['sunglasses'] }))).products.length).toBeGreaterThan(0);
    const cheapest = await search.search(q({ sortBy: 'price-asc' }));
    expect(cheapest.coverage.complete).toBe(true);
    expect(cheapest.products[0]!.price).toBeLessThanOrEqual(cheapest.products[1]!.price);
  }, 10_000);

  it('topRated and getById', async () => {
    expect(await search.topRated(4)).toHaveLength(4);
    expect((await search.getById(1)).id).toBe(1);
  }, 10_000);
});
