import { VectorIndexPort } from '../application/vector-index.port.js';
import type { Product } from '../domain/product.js';
import { rankBySimilarity, type IndexedProduct, type SimilarityQuery } from '../domain/rank-by-similarity.js';

/** VectorIndexPort for the POC (D41): 194 vectors in an array, a full scan per query (< 1 ms). */
export class InMemoryVectorIndex extends VectorIndexPort {
  private entries: readonly IndexedProduct[] = [];

  async replaceAll(entries: readonly IndexedProduct[]): Promise<void> {
    this.entries = entries;
  }

  async nearest(query: SimilarityQuery): Promise<Product[]> {
    return rankBySimilarity(this.entries, query);
  }
}
