import type { IndexedProduct, SimilarityQuery } from '../domain/rank-by-similarity.js';
import type { Product } from '../domain/product.js';

/**
 * Port: stores Product vectors and finds the nearest ones. The query carries the filters and `k`,
 * so a pgvector adapter can run it as one SQL query (D41). POC adapter: in memory.
 */
export abstract class VectorIndexPort {
  abstract replaceAll(entries: readonly IndexedProduct[]): Promise<void>;
  abstract nearest(query: SimilarityQuery): Promise<Product[]>;
}
