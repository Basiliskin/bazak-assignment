import { describe, expect, it } from 'vitest';
import { parseCatalogResponse } from './parse-catalog.js';

const raw = (over: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'iPhone 9',
  description: 'A phone',
  category: 'smartphones',
  price: 549,
  discountPercentage: 12.96,
  rating: 4.69,
  stock: 94,
  tags: ['smartphones'],
  brand: 'Apple',
  images: ['https://img/1.png'],
  thumbnail: 'https://img/t.png',
  reviews: [{ ignored: true }],
  ...over,
});

describe('parseCatalogResponse', () => {
  it('maps DummyJSON products to Products, dropping unused fields', () => {
    const r = parseCatalogResponse({ products: [raw()], total: 1 });
    expect(r.skipped).toBe(0);
    expect(r.products[0]).toEqual({
      id: 1,
      title: 'iPhone 9',
      description: 'A phone',
      category: 'smartphones',
      price: 549,
      discountPercentage: 12.96,
      rating: 4.69,
      stock: 94,
      tags: ['smartphones'],
      brand: 'Apple',
      images: ['https://img/1.png'],
      thumbnail: 'https://img/t.png',
    });
  });

  it('accepts Products without a brand (92 of 194 have none)', () => {
    const { brand: _b, ...noBrand } = raw();
    expect(parseCatalogResponse({ products: [noBrand] }).products[0]?.brand).toBeUndefined();
  });

  it('skips invalid Products instead of failing the whole catalog', () => {
    const r = parseCatalogResponse({
      products: [raw(), raw({ id: 2, price: 'free' }), raw({ id: 3, category: 'spaceships' })],
    });
    expect(r.products.map((p) => p.id)).toEqual([1]);
    expect(r.skipped).toBe(2);
  });

  it('throws when the response itself is not a catalog', () => {
    expect(() => parseCatalogResponse({ message: 'rate limited' })).toThrow();
  });
});
