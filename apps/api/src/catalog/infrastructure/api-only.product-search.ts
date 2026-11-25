import { ProductSearchPort, type ProductSearchResult } from '../application/product-search.port.js';
import { CatalogUnavailableError, ProductNotFoundError } from '../domain/catalog.errors.js';
import { filterProducts, type CatalogQuery } from '../domain/filter-products.js';
import { planApiSearch, type ApiSource } from '../domain/plan-api-search.js';
import type { Product } from '../domain/product.js';
import { topRated } from '../domain/top-rated.js';
import { parseCatalogPage, parseProduct } from './parse-catalog.js';

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
}

export const DEFAULT_API_SEARCH_LIMITS: ApiSearchLimits = {
  pageSize: 100,
  maxPages: 5,
  maxSearchPages: 2,
  maxKeywords: 3,
  concurrency: 4,
  callTimeoutMs: 3000,
  budgetMs: 4000,
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

  constructor(private readonly options: ApiOnlyProductSearchOptions) {
    super();
    this.limits = { ...DEFAULT_API_SEARCH_LIMITS, ...options.limits };
    this.fetchFn = options.fetchFn ?? fetch;
    this.now = options.now ?? Date.now;
    this.warn = options.onWarn ?? (() => undefined);
  }

  /** `similarityOrder` is ignored: API mode has no embeddings (ADR 0005). */
  async search(query: CatalogQuery): Promise<ProductSearchResult> {
    const plan = planApiSearch(query, this.limits.maxKeywords);
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
    return { ...filterProducts([...seen.values()], query, null), coverage: { checked: seen.size, complete } };
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
    if (!first) return { products: [], reached: false, complete: false };
    const { pageSize } = this.limits;
    const cap = source.kind === 'search' ? this.limits.maxSearchPages : this.limits.maxPages;
    const pages = Math.min(cap, Math.ceil(first.total / pageSize));
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, i) =>
        this.readPage(source, (i + 1) * pageSize, run),
      ),
    );
    const products = [first, ...rest].flatMap((p) => p?.products ?? []);
    return { products, reached: true, complete: rest.every(Boolean) && pages * pageSize >= first.total };
  }

  /** One page, or null when it failed — a failed page is dropped, never fatal on its own. */
  private async readPage(source: ApiSource, skip: number, run: Run): Promise<Page | null> {
    const path = this.pathFor(source, skip);
    try {
      const { products, skipped, total } = parseCatalogPage(await run.slot(() => this.call(path, run)));
      if (skipped > 0) this.warn(`Skipped ${skipped} invalid products from ${path}`);
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
