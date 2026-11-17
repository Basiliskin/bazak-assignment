import { describe, expect, it, vi } from 'vitest';
import { product } from '../../../test/support/product.fixture.js';
import { InMemoryVectorIndex } from '../infrastructure/in-memory.vector-index.js';
import type { Product } from '../domain/product.js';
import type { CatalogPort } from './catalog.port.js';
import type { EmbeddingPort } from './embedding.port.js';
import { RecommendationService } from './recommendation.service.js';

/** Fake embedder: one dimension per vocabulary word, 1 when the text contains it. */
const VOCAB = ['beach', 'sun', 'phone'];
const vectorOf = (text: string) => VOCAB.map((w) => (text.toLowerCase().includes(w) ? 1 : 0));
const fakeEmbedder = () => {
  const embed = vi.fn(async (texts: readonly string[]) => texts.map(vectorOf));
  return { embedder: { embed } as EmbeddingPort, embed };
};

const PRODUCTS: Product[] = [
  product({
    id: 1,
    title: 'Sunglasses',
    description: 'for the beach and sun',
    price: 20,
    category: 'sunglasses',
  }),
  product({ id: 2, title: 'Beach Dress', description: 'beach summer', price: 40, category: 'tops' }),
  product({ id: 3, title: 'iPhone', description: 'a phone', price: 500 }),
];

const setup = (catalog: CatalogPort = { getAll: async () => PRODUCTS }, embedder = fakeEmbedder()) => {
  const warn = vi.fn();
  const service = new RecommendationService(catalog, embedder.embedder, new InMemoryVectorIndex(), warn);
  return { service, warn, embed: embedder.embed };
};

const ask = { semanticQuery: 'beach sun', minPrice: null, maxPrice: null, excludeIds: [] as number[] };

describe('RecommendationService (ADR 0004, D44, D47)', () => {
  it('recommends similar Products once warmed up, best first', async () => {
    const { service } = setup();
    await service.warmUp();
    expect((await service.recommend(ask)).map((p) => p.id)).toEqual([1, 2]);
  });

  it('returns Product Cards, not full Products', async () => {
    const { service } = setup();
    await service.warmUp();
    expect((await service.recommend(ask))[0]).not.toHaveProperty('stock');
  });

  it('excludes matched ids and keeps the price limit (R10)', async () => {
    const { service } = setup();
    await service.warmUp();
    expect((await service.recommend({ ...ask, excludeIds: [1] })).map((p) => p.id)).toEqual([2]);
    expect((await service.recommend({ ...ask, maxPrice: 30 })).map((p) => p.id)).toEqual([1]);
  });

  it('returns nothing while the index is still being built — the turn never waits for it', async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const slow = fakeEmbedder();
    slow.embed.mockImplementationOnce(async (texts) => (await gate, texts.map(vectorOf)));
    const { service } = setup(undefined, slow);
    expect(await service.recommend(ask)).toEqual([]);
    release();
    await service.warmUp();
    expect(await service.recommend(ask)).toHaveLength(2);
  });

  it('degrades to no recommendations when the model fails, and tries again later', async () => {
    const failing = fakeEmbedder();
    failing.embed.mockRejectedValueOnce(new Error('model download failed'));
    const { service, warn } = setup(undefined, failing);
    await expect(service.warmUp()).resolves.toBeUndefined();
    expect(await service.recommend(ask)).toEqual([]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('model download failed'));
    await service.warmUp();
    expect(await service.recommend(ask)).toHaveLength(2);
  });

  it('returns nothing (no throw) when the Catalog is unavailable', async () => {
    const { service } = setup({ getAll: () => Promise.reject(new Error('down')) });
    await service.warmUp();
    expect(await service.recommend(ask)).toEqual([]);
  });

  it('embeds the Catalog once while it stays the same, and once per concurrent rebuild', async () => {
    const { service, embed } = setup();
    await Promise.all([service.warmUp(), service.warmUp()]);
    await service.recommend(ask);
    await service.recommend(ask);
    const catalogEmbeds = embed.mock.calls.filter(([texts]) => texts.length === PRODUCTS.length);
    expect(catalogEmbeds).toHaveLength(1);
  });

  it('re-embeds when the Catalog changes (cache refresh) and keeps serving the old index meanwhile', async () => {
    let current = PRODUCTS;
    const embedder = fakeEmbedder();
    const { service } = setup({ getAll: async () => current }, embedder);
    await service.warmUp();

    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    embedder.embed.mockImplementationOnce(async (texts) => (await gate, texts.map(vectorOf)));
    current = [
      ...PRODUCTS,
      product({
        id: 4,
        title: 'Beach Towel',
        description: 'beach sun',
        price: 15,
        category: 'home-decoration',
      }),
    ];
    expect((await service.recommend(ask)).map((p) => p.id)).toEqual([1, 2]); // rebuild started, old index answers

    release();
    await service.warmUp();
    expect((await service.recommend(ask)).map((p) => p.id)).toEqual([1, 4, 2]); // towel (beach + sun) outranks the dress (beach only)
  });
  describe('similarityOrder (Q1, D54)', () => {
    it('ranks every indexed Product, most similar first — no threshold, no cap', async () => {
      const { service } = setup();
      await service.warmUp();
      expect(await service.similarityOrder('beach sun')).toEqual([1, 2, 3]);
    });

    it('returns null (rating order applies) while not ready, on a blank query, or on failure', async () => {
      const failing = fakeEmbedder();
      const { service, warn } = setup(undefined, failing);
      expect(await service.similarityOrder('beach')).toBeNull(); // index still building
      await service.warmUp();
      expect(await service.similarityOrder('  ')).toBeNull();
      failing.embed.mockRejectedValueOnce(new Error('boom'));
      expect(await service.similarityOrder('beach')).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });
  });
});
