import { CatalogPort } from '../application/catalog.port.js';
import { cacheStatus, type CacheEntry } from '../domain/cache-policy.js';
import { CatalogUnavailableError } from '../domain/catalog.errors.js';
import type { Product } from '../domain/product.js';
import { parseCatalogResponse } from './parse-catalog.js';

export interface DummyJsonCatalogOptions {
  baseUrl: string;
  ttlMs: number;
  now?: () => number;
  fetchFn?: typeof fetch;
  onWarn?: (message: string) => void;
}

/**
 * CatalogPort adapter (D21): whole catalog via `GET /products?limit=0`, kept `ttlMs`.
 * Concurrent callers share one fetch; when DummyJSON fails the stale copy is served; with no copy → CatalogUnavailable.
 */
export class DummyJsonCatalog extends CatalogPort {
  private entry: CacheEntry<readonly Product[]> | null = null;
  private inFlight: Promise<readonly Product[]> | null = null;
  private readonly now: () => number;
  private readonly fetchFn: typeof fetch;
  private readonly warn: (message: string) => void;

  constructor(private readonly options: DummyJsonCatalogOptions) {
    super();
    this.now = options.now ?? Date.now;
    this.fetchFn = options.fetchFn ?? fetch;
    this.warn = options.onWarn ?? (() => undefined);
  }

  async getAll(): Promise<readonly Product[]> {
    if (cacheStatus(this.entry, this.now(), this.options.ttlMs) === 'fresh') return this.entry!.value;
    this.inFlight ??= this.load().finally(() => (this.inFlight = null));
    return this.inFlight;
  }

  private async load(): Promise<readonly Product[]> {
    try {
      const res = await this.fetchFn(new URL('/products?limit=0', this.options.baseUrl));
      if (!res.ok) throw new Error(`DummyJSON responded ${res.status}`);
      const { products, skipped } = parseCatalogResponse(await res.json());
      if (skipped > 0) this.warn(`Skipped ${skipped} invalid catalog products`);
      this.entry = { value: products, loadedAt: this.now() };
      return products;
    } catch (e) {
      if (this.entry) {
        this.warn(`Catalog refresh failed, serving cached copy: ${(e as Error).message}`);
        return this.entry.value;
      }
      throw new CatalogUnavailableError();
    }
  }
}
