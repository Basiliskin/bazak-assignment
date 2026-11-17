import { describe, expect, it } from 'vitest';
import { toProductCard } from './to-product-card.js';
import { product } from '../../../test/support/product.fixture.js';

describe('toProductCard', () => {
  it('keeps only the card fields', () => {
    const p = product({
      id: 7,
      title: 'iPhone 9',
      price: 549,
      brand: 'Apple',
      tags: ['phone'],
      images: ['a'],
    });
    expect(toProductCard(p)).toEqual({
      id: 7,
      title: 'iPhone 9',
      description: '',
      price: 549,
      discountPercentage: 0,
      rating: 4,
      thumbnail: 'https://img/7.png',
      category: 'smartphones',
    });
  });
});
