import type { Product } from './product.js';

/** Pure: the shop page grid — in-stock Products (R9), highest rating first, ties by id. */
export const topRated = (products: readonly Product[], limit: number): Product[] =>
  products
    .filter((p) => p.stock > 0)
    .toSorted((a, b) => b.rating - a.rating || a.id - b.id)
    .slice(0, limit);
