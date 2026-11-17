import type { Product } from '../domain/product.js';

/** Port: where the Catalog comes from. Throws CatalogUnavailableError when it can't be loaded. */
export abstract class CatalogPort {
  abstract getAll(): Promise<readonly Product[]>;
}
