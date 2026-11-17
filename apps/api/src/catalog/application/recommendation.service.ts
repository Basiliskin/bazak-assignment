import type { ProductCard } from '@app/contracts';
import type { Product } from '../domain/product.js';
import { MIN_SIMILARITY } from '../domain/rank-by-similarity.js';
import { PAGE_SIZE } from '../domain/filter-products.js';
import { toEmbeddingText } from '../domain/to-embedding-text.js';
import { toProductCard } from '../domain/to-product-card.js';
import type { CatalogPort } from './catalog.port.js';
import type { EmbeddingPort } from './embedding.port.js';
import type { VectorIndexPort } from './vector-index.port.js';

export interface RecommendRequest {
  semanticQuery: string;
  minPrice: number | null;
  maxPrice: number | null;
  /** Every match, on every page (D56, replaces D50): "You might also like" never repeats a match — not even
   *  one hidden behind "Show more". A broad search may get none; its matches are already similarity-ordered (D54). */
  excludeIds: readonly number[];
}

/**
 * "You might also like" (ADR 0004). Recommendations are extra: when the model is still loading, failed,
 * or the Catalog is down, the answer is "no recommendations" — never an error and never a wait (D44).
 * The index follows the Catalog: a new Catalog copy (cache refresh) starts one background re-embed,
 * and the old index keeps answering until it is done (D47).
 */
export class RecommendationService {
  private indexedFor: readonly Product[] | null = null;
  private ready = false;
  private building: Promise<void> | null = null;

  constructor(
    private readonly catalog: CatalogPort,
    private readonly embedder: EmbeddingPort,
    private readonly index: VectorIndexPort,
    private readonly warn: (message: string) => void = () => undefined,
  ) {}

  /** Builds (or refreshes) the index. Resolves when done; never rejects. */
  async warmUp(): Promise<void> {
    try {
      this.rebuildIfChanged(await this.catalog.getAll());
    } catch (e) {
      this.warn(`Recommendations unavailable: ${(e as Error).message}`);
    }
    await this.building;
  }

  async recommend(req: RecommendRequest): Promise<ProductCard[]> {
    try {
      this.rebuildIfChanged(await this.catalog.getAll());
      if (!this.ready || !req.semanticQuery.trim()) return [];
      const [vector] = await this.embedder.embed([req.semanticQuery]);
      if (!vector) return [];
      const products = await this.index.nearest({
        vector,
        minPrice: req.minPrice,
        maxPrice: req.maxPrice,
        excludeIds: req.excludeIds,
        minScore: MIN_SIMILARITY,
        k: PAGE_SIZE,
      });
      return products.map(toProductCard);
    } catch (e) {
      this.warn(`Recommendations skipped: ${(e as Error).message}`);
      return [];
    }
  }

  /**
   * Every indexed Product id, most similar to `semanticQuery` first — no threshold, no cap — so the match
   * group of a keyword-less search can be ordered by it (Q1, D54). null = not ready, blank query or failure.
   */
  async similarityOrder(semanticQuery: string): Promise<number[] | null> {
    try {
      this.rebuildIfChanged(await this.catalog.getAll());
      if (!this.ready || !this.indexedFor || !semanticQuery.trim()) return null;
      const [vector] = await this.embedder.embed([semanticQuery]);
      if (!vector) return null;
      const ranked = await this.index.nearest({
        vector,
        minPrice: null,
        maxPrice: null,
        excludeIds: [],
        minScore: -Infinity,
        k: this.indexedFor.length,
      });
      return ranked.map((p) => p.id);
    } catch (e) {
      this.warn(`Similarity order skipped: ${(e as Error).message}`);
      return null;
    }
  }

  /** Starts one background re-embed when the Catalog copy changed; concurrent callers share it. */
  private rebuildIfChanged(products: readonly Product[]): void {
    if (products === this.indexedFor || this.building) return;
    this.building = this.embedder
      .embed(products.map(toEmbeddingText))
      .then(async (vectors) => {
        await this.index.replaceAll(products.map((product, i) => ({ product, vector: vectors[i] ?? [] })));
        this.indexedFor = products;
        this.ready = true;
      })
      .catch((e: unknown) => this.warn(`Embedding the Catalog failed: ${(e as Error).message}`))
      .finally(() => (this.building = null));
  }
}
