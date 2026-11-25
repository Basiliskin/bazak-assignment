import type { Product } from '../domain/product.js';

/**
 * Port: the whole Catalog as one copy — only for memory mode (ADR 0002): the in-memory search and the
 * Recommended Group's embeddings (ADR 0004) need every Product. Throws CatalogUnavailableError when it can't be loaded.
 */
export abstract class CatalogPort {
  abstract getAll(): Promise<readonly Product[]>;
}
