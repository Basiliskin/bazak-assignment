import { describe, expect, it } from 'vitest';
import { product } from '../../../test/support/product.fixture.js';
import { topRated } from './top-rated.js';

describe('topRated', () => {
  it('returns in-stock Products, highest rating first, at most `limit`', () => {
    const catalog = [
      product({ id: 1, rating: 3 }),
      product({ id: 2, rating: 4.9 }),
      product({ id: 3, rating: 5, stock: 0 }),
      product({ id: 4, rating: 4.5 }),
    ];
    expect(topRated(catalog, 2).map((p) => p.id)).toEqual([2, 4]);
  });

  it('breaks rating ties by id so the grid is stable', () => {
    const catalog = [product({ id: 9, rating: 4 }), product({ id: 1, rating: 4 })];
    expect(topRated(catalog, 10).map((p) => p.id)).toEqual([1, 9]);
  });

  it('does not mutate its input', () => {
    const catalog = [product({ id: 1, rating: 1 }), product({ id: 2, rating: 5 })];
    topRated(catalog, 1);
    expect(catalog.map((p) => p.id)).toEqual([1, 2]);
  });
});
