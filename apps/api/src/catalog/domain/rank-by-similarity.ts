import type { Product } from './product.js';

/** Below this cosine nothing is "similar" (ADR 0004 probe: relevant ≥ 0.41, unrelated ≤ 0.31). */
export const MIN_SIMILARITY = 0.35;

export interface IndexedProduct {
  readonly product: Product;
  readonly vector: readonly number[];
}

/** One similarity lookup. Filters and `k` travel with the query so a pgvector adapter can push them into SQL. */
export interface SimilarityQuery {
  readonly vector: readonly number[];
  readonly minPrice: number | null;
  readonly maxPrice: number | null;
  /** Products already in the match group — a Recommended Group never repeats them (R10). */
  readonly excludeIds: readonly number[];
  readonly minScore: number;
  readonly k: number;
}

/** Pure: cosine similarity; 0 when either vector has no length. */
export function cosine(a: readonly number[], b: readonly number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return na === 0 || nb === 0 ? 0 : dot / Math.sqrt(na * nb);
}

/**
 * Pure (ADR 0004): in stock (R9) → price range, inclusive (R6) → not excluded (R10) → cosine ≥ minScore → best k.
 * Category is ignored on purpose: "You might also like" may cross categories.
 */
export function rankBySimilarity(entries: readonly IndexedProduct[], q: SimilarityQuery): Product[] {
  const excluded = new Set(q.excludeIds);
  return entries
    .filter(({ product: p }) => p.stock > 0 && !excluded.has(p.id))
    .filter(({ product: p }) => q.minPrice === null || p.price >= q.minPrice)
    .filter(({ product: p }) => q.maxPrice === null || p.price <= q.maxPrice)
    .map(({ product, vector }) => ({ product, score: cosine(vector, q.vector) }))
    .filter((s) => s.score >= q.minScore)
    .sort((a, b) => b.score - a.score || a.product.id - b.product.id)
    .slice(0, q.k)
    .map((s) => s.product);
}
