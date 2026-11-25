import { describe, expect, it } from 'vitest';
import { fakeDummyJson, generateCatalog } from '../../../test/support/fake-dummyjson.js';
import { CatalogUnavailableError, ProductNotFoundError } from '../domain/catalog.errors.js';
import { filterProducts, type CatalogQuery } from '../domain/filter-products.js';
import { ApiOnlyProductSearch, type ApiSearchLimits } from './api-only.product-search.js';

const q = (over: Partial<CatalogQuery> = {}): CatalogQuery => ({
  category: null,
  keywords: [],
  minPrice: null,
  maxPrice: null,
  sortBy: 'relevance',
  offset: 0,
  ...over,
});
const BIG = generateCatalog(10_000); // ~3,333 per category
const setup = (fetchFn: typeof fetch, limits: Partial<ApiSearchLimits> = {}) => {
  const warnings: string[] = [];
  const search = new ApiOnlyProductSearch({
    baseUrl: 'https://dj.test',
    fetchFn,
    limits,
    onWarn: (m) => warnings.push(m),
  });
  return { search, warnings };
};

describe('ApiOnlyProductSearch', () => {
  describe('on a Catalog too big to read', () => {
    it('reads at most maxPages of a category and marks the result partial', async () => {
      const api = fakeDummyJson(BIG);
      const r = await setup(api.fetchFn).search.search(q({ category: 'laptops', maxPrice: 50 }));
      expect(api.requests.filter((u) => u.includes('/category/laptops'))).toHaveLength(5);
      expect(r.coverage).toEqual({ checked: 500, complete: false });
      expect(r.products.every((p) => p.category === 'laptops' && p.price <= 50)).toBe(true);
      expect(r.total).toBe(r.matchIds.length);
    });

    it('fetches pages in parallel, never more than `concurrency` at once', async () => {
      const api = fakeDummyJson(BIG);
      let active = 0;
      let peak = 0;
      const tracked: typeof fetch = async (...args) => {
        peak = Math.max(peak, ++active);
        await new Promise((r) => setTimeout(r, 5));
        try {
          return await api.fetchFn(...args);
        } finally {
          active--;
        }
      };
      await setup(tracked, { concurrency: 3 }).search.search(
        q({ category: 'laptops', keywords: ['waterproof'] }),
      );
      expect(peak).toBe(3);
    });

    it('caps keyword searches and calls the result partial when one was dropped', async () => {
      const api = fakeDummyJson(generateCatalog(30));
      const r = await setup(api.fetchFn, { maxKeywords: 1 }).search.search(
        q({ keywords: ['phone', 'shirt'] }),
      );
      expect(api.requests).toEqual(['/products/search?q=phone&limit=100&skip=0']);
      expect(r.coverage.complete).toBe(false);
    });
  });

  describe('on a Catalog it can read in full', () => {
    const SMALL = generateCatalog(194);
    const queries: CatalogQuery[] = [
      q({ category: 'smartphones', maxPrice: 300, sortBy: 'price-asc' }),
      q({ category: 'tops', keywords: ['waterproof'] }),
      q({ keywords: ['laptop'], minPrice: 100, sortBy: 'rating-desc' }),
      q({ sortBy: 'discount-desc', offset: 4 }),
      q({ maxPrice: 20 }),
    ];

    it.each(queries)('gives the same answer as memory mode: %o', async (query) => {
      const r = await setup(fakeDummyJson(SMALL).fetchFn).search.search(query);
      const expected = filterProducts(SMALL, query);
      expect(r.coverage).toEqual({ checked: expect.any(Number), complete: true });
      expect(r.matchIds).toEqual(expected.matchIds);
      expect(r.products.map((p) => p.id)).toEqual(expected.products.map((p) => p.id));
    });

    it('reads page 1 first and only the pages that exist', async () => {
      const api = fakeDummyJson(SMALL);
      await setup(api.fetchFn).search.search(q({ category: 'smartphones' })); // 65 phones = 1 page
      expect(api.requests).toEqual(['/products/category/smartphones?limit=100&skip=0']);
    });
  });

  describe('when calls fail', () => {
    const failing =
      (fail: (url: string) => Response | null, base = fakeDummyJson(generateCatalog(1000))): typeof fetch =>
      async (input, init) =>
        fail(String(input)) ?? base.fetchFn(input, init);

    it('drops a failed page, keeps the rest and says the result is partial', async () => {
      const fetchFn = failing((u) => (u.includes('skip=200') ? new Response('', { status: 500 }) : null));
      const { search, warnings } = setup(fetchFn);
      const r = await search.search(q({ category: 'laptops' })); // 333 laptops = 4 pages, the 3rd fails
      expect(r.coverage).toEqual({ checked: 233, complete: false });
      expect(warnings.join()).toContain('responded 500');
    });

    it('returns what arrived when the search budget runs out', async () => {
      const api = fakeDummyJson(generateCatalog(1000));
      const slowAfterFirst: typeof fetch = async (input, init) => {
        if (!String(input).includes('skip=0'))
          await new Promise((_, reject) =>
            init!.signal!.addEventListener('abort', () => reject(new Error('aborted'))),
          );
        return api.fetchFn(input, init);
      };
      const started = Date.now();
      const r = await setup(slowAfterFirst, { budgetMs: 50 }).search.search(q({ category: 'laptops' }));
      expect(Date.now() - started).toBeLessThan(500);
      expect(r.coverage).toEqual({ checked: 100, complete: false });
    });

    it('retries a 429 once when Retry-After fits the budget', async () => {
      let calls = 0;
      const api = fakeDummyJson(generateCatalog(30));
      const fetchFn: typeof fetch = async (input, init) =>
        ++calls === 1
          ? new Response('', { status: 429, headers: { 'retry-after': '0' } })
          : api.fetchFn(input, init);
      const r = await setup(fetchFn).search.search(q({ category: 'tops' }));
      expect(calls).toBe(2);
      expect(r.coverage.complete).toBe(true);
    });

    it('does not wait for a Retry-After longer than the budget', async () => {
      const fetchFn = failing((u) =>
        u.includes('skip=100') ? new Response('', { status: 429, headers: { 'retry-after': '10' } }) : null,
      );
      const started = Date.now();
      const r = await setup(fetchFn).search.search(q({ category: 'laptops' }));
      expect(Date.now() - started).toBeLessThan(500);
      expect(r.coverage.complete).toBe(false);
    });

    it('is unavailable only when nothing arrived', async () => {
      const down: typeof fetch = async () => new Response('', { status: 503 });
      await expect(setup(down).search.search(q())).rejects.toBeInstanceOf(CatalogUnavailableError);
      await expect(setup(down).search.topRated(4)).rejects.toBeInstanceOf(CatalogUnavailableError);
      await expect(setup(down).search.getById(1)).rejects.toBeInstanceOf(CatalogUnavailableError);
    });
  });

  it('topRated reads /products sorted by rating, in stock only', async () => {
    const SMALL = generateCatalog(194);
    const top = await setup(fakeDummyJson(SMALL).fetchFn).search.topRated(4);
    expect(top.map((p) => p.id)).toEqual(
      SMALL.filter((p) => p.stock > 0)
        .toSorted((a, b) => b.rating - a.rating || a.id - b.id)
        .slice(0, 4)
        .map((p) => p.id),
    );
  });

  it('getById reads one Product; an unknown id is ProductNotFound', async () => {
    const { search } = setup(fakeDummyJson(generateCatalog(10)).fetchFn);
    expect((await search.getById(7)).id).toBe(7);
    await expect(search.getById(99)).rejects.toBeInstanceOf(ProductNotFoundError);
  });
});
