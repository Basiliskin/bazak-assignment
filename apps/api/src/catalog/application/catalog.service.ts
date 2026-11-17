import type { ProductCard } from '@app/contracts';
import { ProductNotFoundError } from '../domain/catalog.errors.js';
import { filterProducts, type CatalogQuery } from '../domain/filter-products.js';
import type { Product } from '../domain/product.js';
import { toProductCard } from '../domain/to-product-card.js';
import { topRated } from '../domain/top-rated.js';
import type { CatalogPort } from './catalog.port.js';
import type { RecommendationService } from './recommendation.service.js';

export interface CatalogSearchResult {
  products: ProductCard[];
  total: number;
  /** "You might also like": similar Products, none of them a match (ADR 0004). Empty when not asked for. */
  recommended: ProductCard[];
}

export interface SearchOptions {
  /** Similarity text to recommend from (the model's `semanticQuery`); null/absent = no recommendations. */
  recommend?: string | null;
}

/** Use cases over the Catalog. Only I/O here; the logic is in domain/ pure functions. */
export class CatalogService {
  constructor(
    private readonly catalog: CatalogPort,
    private readonly recommendations: RecommendationService | null = null,
  ) {}

  async search(query: CatalogQuery, options: SearchOptions = {}): Promise<CatalogSearchResult> {
    const { products, total } = filterProducts(await this.catalog.getAll(), query);
    const recommended =
      options.recommend && this.recommendations
        ? await this.recommendations.recommend({
            semanticQuery: options.recommend,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
            excludeIds: products.map((p) => p.id), // the shown page only (D50)
          })
        : [];
    return { products: products.map(toProductCard), total, recommended };
  }

  async topRated(limit: number): Promise<ProductCard[]> {
    return topRated(await this.catalog.getAll(), limit).map(toProductCard);
  }

  async getById(id: number): Promise<Product> {
    const found = (await this.catalog.getAll()).find((p) => p.id === id);
    if (!found) throw new ProductNotFoundError(id);
    return found;
  }
}
