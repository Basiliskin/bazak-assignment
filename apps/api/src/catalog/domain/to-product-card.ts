import type { ProductCard } from '@app/contracts';
import type { Product } from './product.js';

/** Pure: Product → the fields a Product Card shows (keeps tool output and stored Messages small). */
export const toProductCard = (p: Product): ProductCard => ({
  id: p.id,
  title: p.title,
  description: p.description,
  price: p.price,
  discountPercentage: p.discountPercentage,
  rating: p.rating,
  thumbnail: p.thumbnail,
  category: p.category,
});
