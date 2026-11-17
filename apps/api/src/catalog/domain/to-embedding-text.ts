import type { Product } from './product.js';

/** Pure: the text a Product is embedded as — what it is, where it sits, and what it says about itself. */
export const toEmbeddingText = (p: Product): string =>
  [p.title, p.category, p.brand ?? '', p.tags.join(', '), p.description]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('. ');
