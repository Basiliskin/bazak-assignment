import { describe, expect, it } from 'vitest';
import type { CatalogQuery } from './filter-products.js';
import { planApiSearch } from './plan-api-search.js';

const q = (over: Partial<CatalogQuery> = {}): CatalogQuery => ({
  category: null,
  keywords: [],
  minPrice: null,
  maxPrice: null,
  sortBy: 'relevance',
  offset: 0,
  ...over,
});

describe('planApiSearch', () => {
  it('a category decides completeness; keyword searches only add hits', () => {
    const plan = planApiSearch(q({ category: 'smartphones', keywords: ['waterproof'] }), 3);
    expect(plan.sources).toEqual([
      { kind: 'category', slug: 'smartphones' },
      { kind: 'search', q: 'waterproof' },
    ]);
    expect(plan.decisive).toEqual([{ kind: 'category', slug: 'smartphones' }]);
  });

  it('keywords only: one search per normalized, distinct keyword, capped', () => {
    const plan = planApiSearch(q({ keywords: ['Phones', 'phone', ' ', 'case', 'cover', 'stand'] }), 3);
    expect(plan.sources.map((s) => s.kind === 'search' && s.q)).toEqual(['phone', 'case', 'cover']);
    expect(plan.decisive).toBe(plan.sources);
    expect(plan.droppedKeywords).toEqual(['stand']);
  });

  it.each([
    ['relevance', 'rating', 'desc'],
    ['price-asc', 'price', 'asc'],
    ['discount-desc', 'discountPercentage', 'desc'],
  ] as const)('nothing to narrow by: %s reads /products sorted by the API', (sortBy, field, order) => {
    expect(planApiSearch(q({ sortBy }), 3).sources).toEqual([{ kind: 'all', sortBy: field, order }]);
  });
});
