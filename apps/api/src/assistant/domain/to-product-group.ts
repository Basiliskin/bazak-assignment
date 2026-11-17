import type { ProductCard, ProductGroup, SearchProductsInput } from '@app/contracts';

/** Pure: one search_products call + its Catalog result → one Product Group (one Search Intent, R4). */
export const toProductGroup = (
  query: SearchProductsInput,
  result: { products: ProductCard[]; total: number },
): ProductGroup => ({ label: query.label, query, products: result.products, total: result.total });
