import { describe, expect, it } from 'vitest';
import { filterProducts, PAGE_SIZE, type CatalogQuery } from './filter-products.js';
import { product } from '../../../test/support/product.fixture.js';

const q = (over: Partial<CatalogQuery> = {}): CatalogQuery => ({
  category: null,
  keywords: [],
  minPrice: null,
  maxPrice: null,
  sortBy: 'relevance',
  offset: 0,
  ...over,
});
const ids = (r: { products: { id: number }[] }) => r.products.map((p) => p.id);

describe('filterProducts', () => {
  it('pages results: at most 4 per page, with the full total (R7)', () => {
    const all = Array.from({ length: 10 }, (_, i) => product({ id: i + 1 }));
    const r = filterProducts(all, q());
    expect(PAGE_SIZE).toBe(4);
    expect(r.products).toHaveLength(4);
    expect(r.total).toBe(10);
    expect(ids(filterProducts(all, q({ offset: 8 })))).toHaveLength(2);
  });

  it('never returns out-of-stock Products (R9)', () => {
    const r = filterProducts([product({ id: 1, stock: 0 }), product({ id: 2 })], q());
    expect(ids(r)).toEqual([2]);
    expect(r.total).toBe(1);
  });

  it('matches the category exactly', () => {
    const all = [
      product({ id: 1, category: 'smartphones' }),
      product({ id: 2, category: 'mobile-accessories' }),
    ];
    expect(ids(filterProducts(all, q({ category: 'smartphones' })))).toEqual([1]);
  });

  it('respects price limits inclusively and exactly (R6)', () => {
    const all = [
      product({ id: 1, price: 499.99 }),
      product({ id: 2, price: 500 }),
      product({ id: 3, price: 500.01 }),
    ];
    expect(ids(filterProducts(all, q({ maxPrice: 500, sortBy: 'price-asc' })))).toEqual([1, 2]);
    expect(ids(filterProducts(all, q({ minPrice: 500, sortBy: 'price-asc' })))).toEqual([2, 3]);
  });

  describe('keywords (D20: part-of-word, any keyword, ranked by field)', () => {
    it('matches inside words: "phone" finds iPhone, "bag" finds Handbag', () => {
      const all = [
        product({ id: 1, title: 'iPhone 9' }),
        product({ id: 2, title: "Blue Women's Handbag", category: 'womens-bags' }),
        product({ id: 3, title: 'Desk Lamp' }),
      ];
      expect(ids(filterProducts(all, q({ keywords: ['phone'] })))).toEqual([1]);
      expect(ids(filterProducts(all, q({ keywords: ['bag'] })))).toEqual([2]);
    });

    it('is case-insensitive and treats a plural keyword like the singular', () => {
      const all = [product({ id: 1, title: 'Red Lipstick' })];
      expect(ids(filterProducts(all, q({ keywords: ['LIPSTICKS'] })))).toEqual([1]);
    });

    it('lets the category keep false part-of-word hits out ("ring" ≠ Touring)', () => {
      const all = [
        product({ id: 1, title: 'Green Crystal Earring', category: 'womens-jewellery' }),
        product({ id: 2, title: '300 Touring', category: 'vehicle' }),
      ];
      expect(ids(filterProducts(all, q({ keywords: ['ring'] })))).toEqual([1, 2]);
      expect(ids(filterProducts(all, q({ keywords: ['ring'], category: 'womens-jewellery' })))).toEqual([1]);
    });

    it('ranks title hits above tag/brand hits above description hits, then by rating', () => {
      const all = [
        product({ id: 1, description: 'works with any phone', rating: 5 }),
        product({ id: 2, tags: ['phone'], rating: 3 }),
        product({ id: 3, title: 'Phone X', rating: 1 }),
        product({ id: 4, brand: 'Phonely', rating: 4 }),
      ];
      expect(ids(filterProducts(all, q({ keywords: ['phone'] })))).toEqual([3, 4, 2, 1]);
    });

    it('matches any keyword and scores Products matching more keywords higher', () => {
      const all = [
        product({ id: 1, title: 'Wireless Earphones' }),
        product({ id: 2, title: 'Wireless Charger' }),
        product({ id: 3, title: 'Lamp' }),
      ];
      expect(ids(filterProducts(all, q({ keywords: ['wireless', 'earphones'] })))).toEqual([1, 2]);
    });

    it('ignores blank keywords instead of matching everything', () => {
      const all = [product({ id: 1, title: 'Lamp' })];
      expect(filterProducts(all, q({ keywords: ['  '] })).total).toBe(1);
      expect(filterProducts(all, q({ keywords: ['  ', 'phone'] })).total).toBe(0);
    });
  });

  it.each([
    ['price-asc', [2, 3, 1]],
    ['price-desc', [1, 3, 2]],
    ['rating-desc', [3, 1, 2]],
    ['discount-desc', [2, 1, 3]],
  ] as const)('sorts by %s', (sortBy, expected) => {
    const all = [
      product({ id: 1, price: 30, rating: 4, discountPercentage: 10 }),
      product({ id: 2, price: 10, rating: 3, discountPercentage: 20 }),
      product({ id: 3, price: 20, rating: 5, discountPercentage: 0 }),
    ];
    expect(ids(filterProducts(all, q({ sortBy })))).toEqual(expected);
  });

  describe('similarity order (Q1, D54)', () => {
    const all = [
      product({ id: 1, title: 'Smart Speaker', rating: 5 }),
      product({ id: 2, title: 'Sunglasses', rating: 3 }),
      product({ id: 3, title: 'Summer Dress', rating: 4 }),
      product({ id: 4, title: 'Laptop', rating: 2 }),
    ];
    const order = [3, 2] as const; // most similar first; 1 and 4 were not ranked

    it('orders keyword-less relevance matches by similarity, unranked ones last by rating', () => {
      expect(ids(filterProducts(all, q(), order))).toEqual([3, 2, 1, 4]);
    });

    it('keeps the order across pages, so "Show more" neither repeats nor skips', () => {
      const many = Array.from({ length: 6 }, (_, i) => product({ id: i + 1, rating: i }));
      const similar = [5, 3, 1, 6, 2, 4];
      const pages = [0, 4].flatMap((offset) => ids(filterProducts(many, q({ offset }), similar)));
      expect(pages).toEqual(similar);
    });

    it('is ignored when there are keywords or another sort', () => {
      const phones = [
        product({ id: 1, title: 'Phone', rating: 1 }),
        product({ id: 2, title: 'Phone', rating: 5 }),
      ];
      expect(ids(filterProducts(phones, q({ keywords: ['phone'] }), [1, 2]))).toEqual([2, 1]);
      expect(ids(filterProducts(all, q({ sortBy: 'rating-desc' }), order))).toEqual([1, 3, 2, 4]);
    });

    it('falls back to rating without an order', () => {
      expect(ids(filterProducts(all, q(), null))).toEqual([1, 3, 2, 4]);
    });
  });

  it('returns total 0 (not an error) when nothing matches (R8)', () => {
    expect(filterProducts([product({ id: 1 })], q({ keywords: ['flight'] }))).toEqual({
      products: [],
      total: 0,
    });
  });

  it('does not mutate its input', () => {
    const all = Object.freeze([product({ id: 2, price: 5 }), product({ id: 1, price: 1 })]);
    filterProducts(all, q({ sortBy: 'price-asc' }));
    expect(all.map((p) => p.id)).toEqual([2, 1]);
  });
});
