import type { Product } from '../../src/catalog/domain/product.js';

/** Test fixture builder (used only by specs): a valid Product with overrides. */
export const product = (over: Partial<Product> & Pick<Product, 'id'>): Product => ({
  title: `Product ${over.id}`,
  description: '',
  price: 10,
  discountPercentage: 0,
  rating: 4,
  thumbnail: `https://img/${over.id}.png`,
  category: 'smartphones',
  stock: 10,
  images: [],
  tags: [],
  ...over,
});
