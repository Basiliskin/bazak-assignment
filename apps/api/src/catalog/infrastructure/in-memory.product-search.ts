import type { CatalogPort } from '../application/catalog.port.js';
import { ProductSearchPort, type ProductSearchResult } from '../application/product-search.port.js';
import { ProductNotFoundError } from '../domain/catalog.errors.js';
import { filterProducts, type CatalogQuery } from '../domain/filter-products.js';
import type { Product } from '../domain/product.js';
import { topRated } from '../domain/top-rated.js';

/** ProductSearchPort over the whole Catalog held in memory (ADR 0002): every search sees every Product. */
export class InMemoryProductSearch extends ProductSearchPort {
  constructor(private readonly catalog: CatalogPort) {
    super();
  }

  async search(query: CatalogQuery, similarityOrder: readonly number[] | null): Promise<ProductSearchResult> {
    const all = await this.catalog.getAll();
    return {
      ...filterProducts(all, query, similarityOrder),
      coverage: { checked: all.length, complete: true },
    };
  }

  async topRated(limit: number): Promise<Product[]> {
    return topRated(await this.catalog.getAll(), limit);
  }

  async getById(id: number): Promise<Product> {
    const found = (await this.catalog.getAll()).find((p) => p.id === id);
    if (!found) throw new ProductNotFoundError(id);
    return found;
  }
}
