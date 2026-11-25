import type { ProductCard } from '@app/contracts';
import { describe, expect, it, vi } from 'vitest';
import { CatalogUnavailableError, ProductNotFoundError } from '../domain/catalog.errors.js';
import { product } from '../../../test/support/product.fixture.js';
import { CatalogService } from './catalog.service.js';
import { InMemoryProductSearch } from '../infrastructure/in-memory.product-search.js';
import type { RecommendationService } from './recommendation.service.js';
import type { CatalogQuery } from '../domain/filter-products.js';

const port = (products = [product({ id: 1, price: 100 }), product({ id: 2, price: 900 })]) =>
  new InMemoryProductSearch({ getAll: async () => products });
const query: CatalogQuery = {
  category: null,
  keywords: [],
  minPrice: null,
  maxPrice: 500,
  sortBy: 'relevance',
  offset: 0,
};

describe('CatalogService', () => {
  it('search returns Product Cards, the total and the coverage', async () => {
    const r = await new CatalogService(port()).search(query);
    expect(r.total).toBe(1);
    expect(r.coverage).toEqual({ checked: 2, complete: true });
    expect(r.products[0]).not.toHaveProperty('stock');
    expect(r.products[0]?.id).toBe(1);
  });

  it('getById returns full details', async () => {
    expect((await new CatalogService(port()).getById(2)).stock).toBe(10);
  });

  it('getById throws ProductNotFound for an unknown id', async () => {
    await expect(new CatalogService(port()).getById(99)).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it('lets CatalogUnavailable through for callers to handle', async () => {
    const down = new InMemoryProductSearch({ getAll: () => Promise.reject(new CatalogUnavailableError()) });
    await expect(new CatalogService(down).search(query)).rejects.toBeInstanceOf(CatalogUnavailableError);
  });

  describe('with recommendations (ADR 0004)', () => {
    const products = [
      product({ id: 1, title: 'Beach Sunglasses', price: 20, category: 'sunglasses' }),
      product({ id: 2, title: 'Beach Dress', price: 40, category: 'tops' }),
      product({ id: 3, title: 'Beach Hat', price: 30, category: 'tops' }),
    ];
    const recommendations = (impl = async () => [] as ProductCard[], order: number[] | null = null) => {
      const recommend = vi.fn(impl);
      const similarityOrder = vi.fn(async () => order);
      return {
        service: { recommend, similarityOrder } as unknown as RecommendationService,
        recommend,
        similarityOrder,
      };
    };

    it('asks for recommendations excluding every match (D56), with the same price range', async () => {
      const r = recommendations();
      const many = Array.from({ length: 6 }, (_, i) => product({ id: i + 10, price: 30, category: 'tops' }));
      const service = new CatalogService(port(many), r.service);
      await service.search(
        { ...query, category: 'tops', maxPrice: 50 },
        { semanticQuery: 'beach outfit', recommend: true },
      );
      expect(r.recommend).toHaveBeenCalledWith({
        semanticQuery: 'beach outfit',
        minPrice: null,
        maxPrice: 50,
        excludeIds: [10, 11, 12, 13, 14, 15], // all 6 matches, not just page 1
      });
    });

    it('returns them next to the matches', async () => {
      const card = { id: 1, title: 'Beach Sunglasses' } as ProductCard;
      const service = new CatalogService(port(products), recommendations(async () => [card]).service);
      const r = await service.search(
        { ...query, category: 'tops' },
        { semanticQuery: 'beach', recommend: true },
      );
      expect(r.products.map((p) => p.id)).toEqual([2, 3]);
      expect(r.recommended).toEqual([card]);
    });

    it('does not ask when no recommendation is wanted', async () => {
      const r = recommendations();
      const result = await new CatalogService(port(products), r.service).search(query);
      expect(r.recommend).not.toHaveBeenCalled();
      expect(result.recommended).toEqual([]);
    });
    it('orders keyword-less relevance matches by similarity to semanticQuery (Q1), on every page', async () => {
      const r = recommendations(undefined, [3, 1, 2]);
      const service = new CatalogService(port(products), r.service);
      const page1 = await service.search(
        { ...query, maxPrice: null },
        { semanticQuery: 'beach', recommend: true },
      );
      expect(page1.products.map((p) => p.id)).toEqual([3, 1, 2]);
      expect(r.recommend).toHaveBeenCalledWith(expect.objectContaining({ excludeIds: [3, 1, 2] }));
      await service.search({ ...query, maxPrice: null, offset: 4 }, { semanticQuery: 'beach' }); // "Show more"
      expect(r.similarityOrder).toHaveBeenCalledTimes(2);
      expect(r.recommend).toHaveBeenCalledTimes(1);
    });

    it('does not ask for an order when keywords rank the matches', async () => {
      const r = recommendations(undefined, [3, 1, 2]);
      await new CatalogService(port(products), r.service).search(
        { ...query, keywords: ['beach'] },
        { semanticQuery: 'beach' },
      );
      expect(r.similarityOrder).not.toHaveBeenCalled();
    });
  });
});
