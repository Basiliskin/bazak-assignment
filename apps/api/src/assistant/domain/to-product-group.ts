import type { ProductCard, ProductGroup, SearchProductsInput } from '@app/contracts';

/** Heading of a Recommended Group; the Search Intent's label follows it. */
export const RECOMMENDED_PREFIX = 'You might also like';

/** Pure: one search_products call + its Catalog result → one Product Group (one Search Intent, R4). */
export const toProductGroup = (
  query: SearchProductsInput,
  result: { products: ProductCard[]; total: number },
): ProductGroup => ({
  kind: 'match',
  label: query.label,
  query,
  products: result.products,
  total: result.total,
});

/** Pure (ADR 0004): similar Products for one Search Intent, or null when none were similar enough. */
export const toRecommendedGroup = (
  query: SearchProductsInput,
  products: ProductCard[],
): ProductGroup | null =>
  products.length === 0
    ? null
    : {
        kind: 'recommended',
        label: `${RECOMMENDED_PREFIX} · ${query.label}`,
        query,
        products,
        total: products.length,
      };

/**
 * Pure: a Recommended Group belongs to a fresh search only, not to a "Show more" page. After an Off-catalog
 * Request the related "Instead: …" search may get one too (D49): its semanticQuery describes what the shop
 * does sell, and the similarity threshold keeps unrelated Products out.
 */
export const shouldRecommend = (query: SearchProductsInput): boolean =>
  query.offset === 0 && query.semanticQuery.trim() !== '';
