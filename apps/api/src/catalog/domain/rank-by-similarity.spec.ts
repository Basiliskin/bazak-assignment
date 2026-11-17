import { describe, expect, it } from 'vitest';
import { product } from '../../../test/support/product.fixture.js';
import { cosine, rankBySimilarity, type IndexedProduct, type SimilarityQuery } from './rank-by-similarity.js';
import { toEmbeddingText } from './to-embedding-text.js';

const entry = (
  id: number,
  vector: number[],
  over: Parameters<typeof product>[0] | object = {},
): IndexedProduct => ({
  product: product({ id, ...over }),
  vector,
});

const query = (over: Partial<SimilarityQuery> = {}): SimilarityQuery => ({
  vector: [1, 0],
  minPrice: null,
  maxPrice: null,
  excludeIds: [],
  minScore: 0.35,
  k: 4,
  ...over,
});

describe('cosine', () => {
  it('is 1 for the same direction, 0 for orthogonal, independent of length', () => {
    expect(cosine([1, 0], [3, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 2])).toBeCloseTo(0);
  });

  it('is 0 (not NaN) for a zero vector', () => {
    expect(cosine([0, 0], [1, 0])).toBe(0);
  });
});

describe('rankBySimilarity (ADR 0004)', () => {
  it('orders by similarity, best first, and returns at most k', () => {
    const entries = [entry(1, [0.6, 0.8]), entry(2, [1, 0]), entry(3, [0.8, 0.6])];
    expect(rankBySimilarity(entries, query({ k: 2 })).map((p) => p.id)).toEqual([2, 3]);
  });

  it('drops Products below the minimum score (nothing similar → empty)', () => {
    const entries = [entry(1, [0.3, 0.95]), entry(2, [0, 1])];
    expect(rankBySimilarity(entries, query())).toEqual([]);
  });

  it('never returns an excluded (already matched) Product (R10)', () => {
    const entries = [entry(1, [1, 0]), entry(2, [0.9, 0.1])];
    expect(rankBySimilarity(entries, query({ excludeIds: [1] })).map((p) => p.id)).toEqual([2]);
  });

  it('keeps the price range, inclusive (R6) and skips out-of-stock Products (R9)', () => {
    const entries = [
      entry(1, [1, 0], { price: 600 }),
      entry(2, [1, 0], { price: 500 }),
      entry(3, [1, 0], { price: 5 }),
      entry(4, [1, 0], { price: 50, stock: 0 }),
    ];
    expect(rankBySimilarity(entries, query({ minPrice: 10, maxPrice: 500 })).map((p) => p.id)).toEqual([2]);
  });

  it('ignores category on purpose: similar Products may come from any category', () => {
    const entries = [entry(1, [1, 0], { category: 'sunglasses' }), entry(2, [1, 0], { category: 'tops' })];
    expect(rankBySimilarity(entries, query())).toHaveLength(2);
  });

  it('breaks score ties by id so results are stable', () => {
    const entries = [entry(5, [1, 0]), entry(2, [1, 0])];
    expect(rankBySimilarity(entries, query()).map((p) => p.id)).toEqual([2, 5]);
  });

  it('does not mutate its input', () => {
    const entries = [entry(2, [0.5, 0.5]), entry(1, [1, 0])];
    const copy = structuredClone(entries);
    rankBySimilarity(entries, query());
    expect(entries).toEqual(copy);
  });
});

describe('toEmbeddingText', () => {
  it('joins title, category, brand, tags and description', () => {
    const p = product({
      id: 1,
      title: 'Sunglasses',
      category: 'sunglasses',
      brand: 'Ray',
      tags: ['summer', 'eyewear'],
      description: 'UV400 lenses.',
    });
    expect(toEmbeddingText(p)).toBe('Sunglasses. sunglasses. Ray. summer, eyewear. UV400 lenses.');
  });

  it('skips a missing brand and empty tags', () => {
    expect(
      toEmbeddingText(product({ id: 1, title: 'Apple', category: 'groceries', description: 'Fresh.' })),
    ).toBe('Apple. groceries. Fresh.');
  });
});
