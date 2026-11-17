import type { ProductCard } from '@app/contracts';
import { ProductNotFoundError } from '../domain/catalog.errors.js';
import { filterProducts, type CatalogQuery } from '../domain/filter-products.js';
import type { Product } from '../domain/product.js';
import { toProductCard } from '../domain/to-product-card.js';
import type { CatalogPort } from './catalog.port.js';

export interface CatalogSearchResult {
  products: ProductCard[];
  total: number;
}

/** Use cases over the Catalog. Only I/O here; the logic is in domain/ pure functions. */
export class CatalogService {
  constructor(private readonly catalog: CatalogPort) {}

  async search(query: CatalogQuery): Promise<CatalogSearchResult> {
    const { products, total } = filterProducts(await this.catalog.getAll(), query);
    return { products: products.map(toProductCard), total };
  }

  async getById(id: number): Promise<Product> {
    const found = (await this.catalog.getAll()).find((p) => p.id === id);
    if (!found) throw new ProductNotFoundError(id);
    return found;
  }
}
