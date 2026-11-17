import type { SearchProductsInput } from '@app/contracts';
import type { Product } from './product.js';

/** Product Cards per page in a Product Group (R7). */
export const PAGE_SIZE = 4;

export type CatalogQuery = Pick<
  SearchProductsInput,
  'category' | 'keywords' | 'minPrice' | 'maxPrice' | 'sortBy' | 'offset'
>;

export interface SearchResult {
  readonly products: Product[];
  readonly total: number;
}

/** Where a keyword hit counts most (D20): the title says what the Product is; descriptions mention other things. */
const FIELD_WEIGHTS = { title: 3, tags: 2, brand: 2, description: 1 } as const;

/** Lower-case, trimmed, plural → singular ("lipsticks" → "lipstick") so it also matches inside "iPhone"/"Handbag". */
const normalizeKeyword = (k: string): string => {
  const w = k.trim().toLowerCase();
  return w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
};

/** Pure: weighted part-of-word score of one Product for the keywords. 0 = no match. */
export function scoreProduct(p: Product, keywords: readonly string[]): number {
  const fields = {
    title: p.title.toLowerCase(),
    tags: p.tags.join(' ').toLowerCase(),
    brand: (p.brand ?? '').toLowerCase(),
    description: p.description.toLowerCase(),
  };
  return keywords.reduce(
    (score, k) =>
      score +
      (Object.keys(FIELD_WEIGHTS) as (keyof typeof FIELD_WEIGHTS)[]).reduce(
        (s, field) => s + (fields[field].includes(k) ? FIELD_WEIGHTS[field] : 0),
        0,
      ),
    0,
  );
}

type Scored = { product: Product; score: number };

const byIdAsc = (a: Scored, b: Scored) => a.product.id - b.product.id;
const COMPARATORS: Record<CatalogQuery['sortBy'], (a: Scored, b: Scored) => number> = {
  relevance: (a, b) => b.score - a.score || b.product.rating - a.product.rating || byIdAsc(a, b),
  'price-asc': (a, b) => a.product.price - b.product.price || byIdAsc(a, b),
  'price-desc': (a, b) => b.product.price - a.product.price || byIdAsc(a, b),
  'rating-desc': (a, b) => b.product.rating - a.product.rating || byIdAsc(a, b),
  'discount-desc': (a, b) => b.product.discountPercentage - a.product.discountPercentage || byIdAsc(a, b),
};

/**
 * Pure: the in-memory Catalog search behind `search_products` (ADR 0002).
 * in stock (R9) → category → any keyword (D20) → price range, inclusive (R6) → sort → one page (R7).
 */
export function filterProducts(products: readonly Product[], query: CatalogQuery): SearchResult {
  const keywords = query.keywords.map(normalizeKeyword).filter(Boolean);
  const matches = products
    .filter((p) => p.stock > 0)
    .filter((p) => query.category === null || p.category === query.category)
    .filter((p) => query.minPrice === null || p.price >= query.minPrice)
    .filter((p) => query.maxPrice === null || p.price <= query.maxPrice)
    .map((product) => ({ product, score: scoreProduct(product, keywords) }))
    .filter((s) => keywords.length === 0 || s.score > 0)
    .sort(COMPARATORS[query.sortBy]);
  return {
    products: matches.slice(query.offset, query.offset + PAGE_SIZE).map((s) => s.product),
    total: matches.length,
  };
}
