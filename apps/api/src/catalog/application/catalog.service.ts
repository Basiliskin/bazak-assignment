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
  /** The model's `semanticQuery`: orders keyword-less relevance matches (Q1) and seeds recommendations. */
  semanticQuery?: string;
  /** Build a Recommended Group (first page only; "Show more" pages don't get one). */
  recommend?: boolean;
}

/** Use cases over the Catalog. Only I/O here; the logic is in domain/ pure functions. */
export class CatalogService {
  constructor(
    private readonly catalog: CatalogPort,
    private readonly recommendations: RecommendationService | null = null,
  ) {}

  async search(
    query: CatalogQuery,
    { semanticQuery = '', recommend = false }: SearchOptions = {},
  ): Promise<CatalogSearchResult> {
    const { products, total, matchIds } = filterProducts(
      await this.catalog.getAll(),
      query,
      await this.similarityOrder(query, semanticQuery),
    );
    const recommended =
      recommend && semanticQuery.trim() && this.recommendations
        ? await this.recommendations.recommend({
            semanticQuery,
            minPrice: query.minPrice,
            maxPrice: query.maxPrice,
            excludeIds: matchIds, // every match, not just the shown page (D56)
          })
        : [];
    return { products: products.map(toProductCard), total, recommended };
  }

  /** Only when keywords can't rank the matches (Q1, D54); null = rating order. */
  private async similarityOrder(query: CatalogQuery, semanticQuery: string): Promise<number[] | null> {
    const needsOrder = query.sortBy === 'relevance' && !query.keywords.some((k) => k.trim());
    return needsOrder && this.recommendations ? this.recommendations.similarityOrder(semanticQuery) : null;
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
