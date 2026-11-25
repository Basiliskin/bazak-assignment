import {
  ProductSearchPort,
  type Coverage,
  type ProductSearchResult,
} from '../application/product-search.port.js';
import { CatalogUnavailableError, ProductNotFoundError } from '../domain/catalog.errors.js';
import { filterProducts, type CatalogQuery } from '../domain/filter-products.js';
import { planApiSearch, type ApiSource } from '../domain/plan-api-search.js';
import type { Product } from '../domain/product.js';
import { topRated } from '../domain/top-rated.js';
import { parseCatalogPage, parseProduct } from './parse-catalog.js';
import { TtlCache } from './ttl-cache.js';

/** How much one search may do (ADR 0005). One object so the numbers are tuned in one place. */
export interface ApiSearchLimits {
  readonly pageSize: number;
  /** Pages read from a category or from `/products`. */
  readonly maxPages: number;
  /** Pages read from each keyword search. */
  readonly maxSearchPages: number;
  readonly maxKeywords: number;
  /** API calls in flight at once, across the whole search. */
  readonly concurrency: number;
  readonly callTimeoutMs: number;
  /** The whole search; when it runs out, whatever arrived is the answer. */
  readonly budgetMs: number;
  /** How long API responses and a search's fetched Products are reused — "live" enough for a chat (ADR 0005). */
  readonly cacheTtlMs: number;
  readonly cacheMaxEntries: number;
}

export const DEFAULT_API_SEARCH_LIMITS: ApiSearchLimits = {
  pageSize: 100,
  maxPages: 5,
  maxSearchPages: 2,
  maxKeywords: 3,
  concurrency: 4,
  callTimeoutMs: 3000,
  budgetMs: 4000,
  cacheTtlMs: 30_000,
  cacheMaxEntries: 200,
};

export interface ApiOnlyProductSearchOptions {
  baseUrl: string;
  limits?: Partial<ApiSearchLimits>;
  fetchFn?: typeof fetch;
  now?: () => number;
  onWarn?: (message: string) => void;
}

interface Page {
  products: Product[];
  total: number;
}

interface SourceOutcome {
  products: Product[];
  /** At least one page arrived. */
  reached: boolean;
  /** Every Product the list holds was read. */
  complete: boolean;
  /** A page of it failed or came too late (as opposed to being left out by the page cap). */
  failed: boolean;
}

/** What one search fetched, before price filter, sort and paging — reused for "Show more" and Follow-ups. */
interface Fetched {
  products: Product[];
  coverage: Coverage;
}

/** One search's shared state: the deadline, its abort signal and the in-flight call slots. */
interface Run {
  signal: AbortSignal;
  deadline: number;
  slot: <T>(task: () => Promise<T>) => Promise<T>;
}

/** A tiny semaphore: at most `n` tasks run at once, the rest wait in order. */
const limiter = (n: number) => {
  let active = 0;
  const queue: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= n) await new Promise<void>((resolve) => queue.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
};

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(timer), reject(signal.reason)), { once: true });
  });

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`DummyJSON responded ${status}`);
  }
}

/**
 * ProductSearchPort straight over the DummyJSON API, no copy of the Catalog (ADR 0005).
 * Reads the lists `planApiSearch` picks — in parallel, within `ApiSearchLimits` — then filters, scores and
 * sorts what arrived with the same `filterProducts` as memory mode. A page that fails or comes too late is
 * dropped and the result is marked incomplete (a Partial Result); only when nothing arrives is the Catalog unavailable.
 */
export class ApiOnlyProductSearch extends ProductSearchPort {
  private readonly limits: ApiSearchLimits;
  private readonly fetchFn: typeof fetch;
  private readonly now: () => number;
  private readonly warn: (message: string) => void;
  /** Valid pages by path: three Shoppers asking about phones within 30 s cost one set of calls. */
  private readonly pages: TtlCache<Page>;
  /** Fetched Products by plan: "Show more" pages through the same set, so its cards never shift (Q4). */
  private readonly searches: TtlCache<Fetched>;

  constructor(private readonly options: ApiOnlyProductSearchOptions) {
    super();
    this.limits = { ...DEFAULT_API_SEARCH_LIMITS, ...options.limits };
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? Date.now;
    this.warn = options.onWarn ?? (() => undefined);
    const { cacheTtlMs, cacheMaxEntries } = this.limits;
    this.pages = new TtlCache(cacheTtlMs, cacheMaxEntries, this.now);
    this.searches = new TtlCache(cacheTtlMs, cacheMaxEntries, this.now);
  }

  /** `similarityOrder` is ignored: API mode has no embeddings (ADR 0005). */
  async search(query: CatalogQuery): Promise<ProductSearchResult> {
    const { products, coverage } = await this.fetchFor(query);
    return { ...filterProducts(products, query, null), coverage };
  }

  /** The plan (lists to read) is the key: price limits, sort and offset don't change what is fetched. */
  private async fetchFor(query: CatalogQuery): Promise<Fetched> {
    const plan = planApiSearch(query, this.limits.maxKeywords);
    const key = JSON.stringify([plan.sources, plan.droppedKeywords]);
    const cached = this.searches.get(key);
    if (cached) return cached;

    const outcomes = await this.withRun((run) =>
      Promise.all(
        plan.sources.map(async (source) => ({ source, outcome: await this.readSource(source, run) })),
      ),
    );
    if (!outcomes.some(({ outcome }) => outcome.reached)) throw new CatalogUnavailableError();

    const seen = new Map<number, Product>();
    for (const { outcome } of outcomes) for (const p of outcome.products) seen.set(p.id, p);
    const complete =
      plan.droppedKeywords.length === 0 &&
      outcomes.every(({ source, outcome }) => !plan.decisive.includes(source) || outcome.complete);
    const fetched = { products: [...seen.values()], coverage: { checked: seen.size, complete } };
    // A failed page isn't remembered: the next search gets a chance to read it.
    if (!outcomes.some(({ outcome }) => outcome.failed)) this.searches.set(key, fetched);
    return fetched;
  }

  async topRated(limit: number): Promise<Product[]> {
    const page = await this.withRun((run) =>
      this.readPage({ kind: 'all', sortBy: 'rating', order: 'desc' }, 0, run),
    );
    if (!page) throw new CatalogUnavailableError();
    return topRated(page.products, limit);
  }

  async getById(id: number): Promise<Product> {
    try {
      return parseProduct(await this.withRun((run) => this.call(`/products/${id}`, run)));
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) throw new ProductNotFoundError(id);
      this.warn(`Product ${id} lookup failed: ${(e as Error).message}`);
      throw new CatalogUnavailableError();
    }
  }

  /** Runs `body` under one deadline: when the budget is spent, every pending call is aborted. */
  private async withRun<T>(body: (run: Run) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('search budget spent')), this.limits.budgetMs);
    try {
      return await body({
        signal: controller.signal,
        deadline: this.now() + this.limits.budgetMs,
        slot: limiter(this.limits.concurrency),
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /** Page 1 tells how many Products the list holds; the remaining pages (up to the cap) are read in parallel. */
  private async readSource(source: ApiSource, run: Run): Promise<SourceOutcome> {
    const first = await this.readPage(source, 0, run);
    if (!first) return { products: [], reached: false, complete: false, failed: true };
    const { pageSize } = this.limits;
    const cap = source.kind === 'search' ? this.limits.maxSearchPages : this.limits.maxPages;
    const pages = Math.min(cap, Math.ceil(first.total / pageSize));
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
        this.readPage(source, (i + 1) * pageSize, run),
      ),
    );
    const products = [first, ...rest].flatMap((p) => p?.products ?? []);
    const failed = !rest.every(Boolean);
    return { products, reached: true, complete: !failed && pages * pageSize >= first.total, failed };
  }

  /** One page, or null when it failed — a failed page is dropped, never fatal on its own. */
  private async readPage(source: ApiSource, skip: number, run: Run): Promise<Page | null> {
    const path = this.pathFor(source, skip);
    const cached = this.pages.get(path);
    if (cached) return cached;
    try {
      const { products, skipped, total } = parseCatalogPage(await run.slot(() => this.call(path, run)));
      if (skipped > 0) this.warn(`Skipped ${skipped} invalid products from ${path}`);
      this.pages.set(path, { products, total });
      return { products, total };
    } catch (e) {
      this.warn(`Dropped ${path}: ${(e as Error).message}`);
      return null;
    }
  }

  private pathFor(source: ApiSource, skip: number): string {
    const page = `limit=${this.limits.pageSize}&skip=${skip}`;
    switch (source.kind) {
      case 'category':
        return `/products/category/${encodeURIComponent(source.slug)}?${page}`;
      case 'search':
        return `/products/search?q=${encodeURIComponent(source.q)}&${page}`;
      case 'all':
        return `/products?sortBy=${source.sortBy}&order=${source.order}&${page}`;
    }
  }

  /** GET with a per-call timeout; a 429 is retried once, only if its `Retry-After` still fits the budget. */
  private async call(path: string, run: Run, retried = false): Promise<unknown> {
    const res = await this.fetchFn(new URL(path, this.options.baseUrl), {
      signal: AbortSignal.any([run.signal, AbortSignal.timeout(this.limits.callTimeoutMs)]),
    });
    if (res.status === 429 && !retried) {
      const waitMs = Number(res.headers.get('retry-after') ?? NaN) * 1000;
      if (Number.isFinite(waitMs) && this.now() + waitMs < run.deadline) {
        await wait(waitMs, run.signal);
        return this.call(path, run, true);
      }
    }
    if (!res.ok) throw new HttpError(res.status);
    return res.json();
  }
}
