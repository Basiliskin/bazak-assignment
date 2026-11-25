import type { Coverage } from '@app/contracts';
import type { CatalogQuery } from '../domain/filter-products.js';
import type { Product } from '../domain/product.js';

export type { Coverage };

export interface ProductSearchResult {
  /** One page (PAGE_SIZE) of matches, in the query's order. */
  readonly products: Product[];
  readonly total: number;
  /** Every match found, on every page — what a Recommended Group must not repeat (D56). */
  readonly matchIds: number[];
  readonly coverage: Coverage;
}

/**
 * Port: answers a Catalog search (ADR 0005). Adapters decide how much of the Catalog they can see:
 * the in-memory one sees all of it; an API-only one sees only the pages it fetched.
 * Throws CatalogUnavailableError when the Catalog can't be reached.
 */
export abstract class ProductSearchPort {
  /** `similarityOrder`: Product ids most similar first, for keyword-less relevance searches (Q1, D54). */
  abstract search(
    query: CatalogQuery,
    similarityOrder: readonly number[] | null,
  ): Promise<ProductSearchResult>;
  /** The shop page grid: in-stock Products, highest rating first. */
  abstract topRated(limit: number): Promise<Product[]>;
  /** Throws ProductNotFoundError for an unknown id. */
  abstract getById(id: number): Promise<Product>;
}
