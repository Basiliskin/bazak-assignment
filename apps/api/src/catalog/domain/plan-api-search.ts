import type { CatalogQuery } from './filter-products.js';
import { normalizeKeyword } from './filter-products.js';

/** One paged DummyJSON list a search reads (ADR 0005). */
export type ApiSource =
  | { readonly kind: 'category'; readonly slug: string }
  | { readonly kind: 'search'; readonly q: string }
  | {
      readonly kind: 'all';
      readonly sortBy: 'rating' | 'price' | 'discountPercentage';
      readonly order: 'asc' | 'desc';
    };

export interface ApiSearchPlan {
  readonly sources: readonly ApiSource[];
  /**
   * The sources that decide whether the search saw every possible match: the category when there is one
   * (keyword hits are filtered to it anyway), else every keyword search, else the whole-Catalog list.
   */
  readonly decisive: readonly ApiSource[];
  /** Keywords beyond the cap were not searched — with no category that makes the result partial. */
  readonly droppedKeywords: readonly string[];
}

/** Only `/products` sorts server-side, so a search with no category and no keywords reads it in the query's order. */
const GLOBAL_ORDER: Record<CatalogQuery['sortBy'], Extract<ApiSource, { kind: 'all' }>> = {
  relevance: { kind: 'all', sortBy: 'rating', order: 'desc' },
  'rating-desc': { kind: 'all', sortBy: 'rating', order: 'desc' },
  'price-asc': { kind: 'all', sortBy: 'price', order: 'asc' },
  'price-desc': { kind: 'all', sortBy: 'price', order: 'desc' },
  'discount-desc': { kind: 'all', sortBy: 'discountPercentage', order: 'desc' },
};

/** Pure: which DummyJSON lists answer `query` — category pages, one search per keyword (capped), or `/products`. */
export function planApiSearch(query: CatalogQuery, maxKeywords: number): ApiSearchPlan {
  const keywords = [...new Set(query.keywords.map(normalizeKeyword).filter(Boolean))];
  const searches = keywords.slice(0, maxKeywords).map((q): ApiSource => ({ kind: 'search', q }));
  const droppedKeywords = keywords.slice(maxKeywords);
  if (query.category !== null) {
    const category: ApiSource = { kind: 'category', slug: query.category };
    return { sources: [category, ...searches], decisive: [category], droppedKeywords: [] };
  }
  if (searches.length > 0) return { sources: searches, decisive: searches, droppedKeywords };
  const all = GLOBAL_ORDER[query.sortBy];
  return { sources: [all], decisive: [all], droppedKeywords: [] };
}
