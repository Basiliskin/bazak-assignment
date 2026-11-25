import { CATEGORY_SLUGS, SORT_OPTIONS } from '@app/contracts';
import { describe, expect, it } from 'vitest';
import { fakeDummyJson } from '../../../test/support/fake-dummyjson.js';
import { REAL_CATALOG } from '../../../test/support/real-catalog.js';
import type { CatalogQuery } from '../domain/filter-products.js';
import { ApiOnlyProductSearch } from './api-only.product-search.js';
import { InMemoryProductSearch } from './in-memory.product-search.js';

/**
 * ADR 0005: on the real 194-Product Catalog — small enough for the API mode to read in full — both
 * modes must give the same answer. The fake API searches title + description only, like the real one
 * (checked live 2026-11-25), which is why keyword-only searches are a subset, not equal.
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
const memory = new InMemoryProductSearch({ getAll: async () => REAL_CATALOG });
const api = () =>
  new ApiOnlyProductSearch({ baseUrl: 'https://dj.test', fetchFn: fakeDummyJson(REAL_CATALOG).fetchFn });

const sameAnswer = async (query: CatalogQuery) => {
  const [m, a] = await Promise.all([memory.search(query, null), api().search(query)]);
  expect(a.coverage.complete).toBe(true);
  expect(a.matchIds).toEqual(m.matchIds);
  expect(a.products.map((p) => p.id)).toEqual(m.products.map((p) => p.id));
  expect(a.total).toBe(m.total);
};

describe('same answer in both modes, on the real Catalog', () => {
  it('fixture is the full Catalog', () => expect(REAL_CATALOG).toHaveLength(194));

  it.each(CATEGORY_SLUGS)('category %s: plain, price-limited, paged', async (category) => {
    await sameAnswer(q({ category }));
    await sameAnswer(q({ category, maxPrice: 50, sortBy: 'price-asc' }));
    await sameAnswer(q({ category, minPrice: 20, sortBy: 'rating-desc', offset: 4 }));
  });

  it.each([
    ['smartphones', ['apple']],
    ['beauty', ['lipstick', 'mascara']],
    ['mens-watches', ['rolex']],
    ['furniture', ['bed', 'wooden']],
  ] as const)('category %s with keywords %o (brand and tags still count)', async (category, keywords) => {
    await sameAnswer(q({ category, keywords: [...keywords] }));
  });

  it.each(SORT_OPTIONS)('no category, no keywords, sorted %s', async (sortBy) => {
    await sameAnswer(q({ sortBy }));
    await sameAnswer(q({ sortBy, maxPrice: 30 }));
  });

  it.each(['apple', 'phone', 'lipstick', 'watch', 'shirt', 'bag'])(
    'keyword-only "%s": API matches are a subset (it searches title + description only)',
    async (keyword) => {
      const query = q({ keywords: [keyword] });
      const [m, a] = await Promise.all([memory.search(query, null), api().search(query)]);
      expect(a.matchIds.every((id) => m.matchIds.includes(id))).toBe(true);
      expect(a.matchIds.length).toBeGreaterThan(0);
    },
  );
});
