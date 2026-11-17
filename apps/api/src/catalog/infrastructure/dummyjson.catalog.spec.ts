import { describe, expect, it, vi } from 'vitest';
import { CatalogUnavailableError } from '../domain/catalog.errors.js';
import { DummyJsonCatalog } from './dummyjson.catalog.js';

const okResponse = (ids: number[]) =>
  new Response(
    JSON.stringify({
      products: ids.map((id) => ({
        id,
        title: `P${id}`,
        description: '',
        category: 'smartphones',
        price: 1,
        discountPercentage: 0,
        rating: 4,
        stock: 1,
        tags: [],
        images: [],
        thumbnail: 't',
      })),
    }),
  );

const setup = () => {
  let now = 0;
  const fetchFn = vi.fn<typeof fetch>();
  const catalog = new DummyJsonCatalog({ baseUrl: 'https://dj.test', ttlMs: 1000, now: () => now, fetchFn });
  return { catalog, fetchFn, advance: (ms: number) => (now += ms) };
};

describe('DummyJsonCatalog', () => {
  it('loads the whole catalog with limit=0', async () => {
    const { catalog, fetchFn } = setup();
    fetchFn.mockResolvedValue(okResponse([1, 2]));
    expect((await catalog.getAll()).map((p) => p.id)).toEqual([1, 2]);
    expect(String(fetchFn.mock.calls[0]?.[0])).toBe('https://dj.test/products?limit=0');
  });

  it('serves from cache within the TTL and refreshes after it', async () => {
    const { catalog, fetchFn, advance } = setup();
    fetchFn.mockResolvedValueOnce(okResponse([1])).mockResolvedValueOnce(okResponse([1, 2]));
    await catalog.getAll();
    advance(999);
    expect(await catalog.getAll()).toHaveLength(1);
    advance(1);
    expect(await catalog.getAll()).toHaveLength(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('shares one fetch between concurrent callers', async () => {
    const { catalog, fetchFn } = setup();
    fetchFn.mockResolvedValue(okResponse([1]));
    await Promise.all([catalog.getAll(), catalog.getAll(), catalog.getAll()]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('keeps serving the stale copy when DummyJSON is down', async () => {
    const { catalog, fetchFn, advance } = setup();
    fetchFn.mockResolvedValueOnce(okResponse([1])).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await catalog.getAll();
    advance(5000);
    expect((await catalog.getAll()).map((p) => p.id)).toEqual([1]);
  });

  it('throws CatalogUnavailable when down and nothing is cached (AC3.8)', async () => {
    const { catalog, fetchFn } = setup();
    fetchFn.mockResolvedValue(new Response('busy', { status: 503 }));
    await expect(catalog.getAll()).rejects.toBeInstanceOf(CatalogUnavailableError);
  });

  it('retries on the next call after a failure', async () => {
    const { catalog, fetchFn } = setup();
    fetchFn.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(okResponse([1]));
    await expect(catalog.getAll()).rejects.toBeInstanceOf(CatalogUnavailableError);
    expect(await catalog.getAll()).toHaveLength(1);
  });
});
