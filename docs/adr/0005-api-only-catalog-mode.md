# 0005 — API-only Catalog mode: search the API per request, answer with Partial Results

**Status:** proposed (2026-11-25, grilling session). Adds a mode next to ADR 0002; the in-memory Catalog stays the default.

## Context
ADR 0002 downloads the whole Catalog (194 Products) and filters it in memory; it says this does not scale. For a large Catalog (~1M Products) owned by a third party, that is always live and may not be copied, the DummyJSON API lacks what we need: no price/rating/brand filter, substring-only search, no search inside a category, and `sortBy` only on `/products` (not on `/products/search` or `/products/category/{slug}`). The category list may change, so it can't stay a constant either.

## Decision
- `CatalogService` talks to a new `ProductSearchPort` — `search(query) → { products, total, matchIds, coverage }`, `topRated`, `getById` — instead of the whole-Catalog `CatalogPort.getAll()`. `InMemoryProductSearch` wraps `filterProducts` over `CatalogPort`, which stays for memory mode only (the Recommended Group embeds every Product). A new API-only adapter is chosen by `CATALOG_MODE=memory|api` (default `memory`); `total` counts the matches found among the checked Products, and `coverage.complete` says whether that is all of them.
- One LLM call produces the structured query; code fans it out to category pages and single-keyword searches in parallel, merges by id, then filters (price, stock), scores and sorts in code. No category and no keywords → `/products?sortBy=…` (the only true global sort). In API mode keywords are required for vague requests.
- Bounded work: ≤ 5 category pages of 100, ≤ 3 keyword searches, ≤ 4 calls in flight, 3 s per call, 4 s per search. Failed or late pages are dropped and the result is marked incomplete; one retry on 429 only if `Retry-After` fits the budget; all calls failed → `CatalogUnavailableError`. No circuit breaker.
- Sorting and "N more" apply only to what was fetched; an incomplete search is a **Partial Result** and the Assistant says how much it checked. "Show more" pages through the cached matches of that search; when they run out it says so instead of scanning further.
- API responses and match lists are cached 30 s; that much staleness counts as "live".
- The Recommended Group is off in API mode: embeddings need the whole Catalog (ADR 0004).

## Considered options
- **Synced database as a search index** (full paged reload on a schedule, live check by id): complete results and global sort, but prices up to one sync old, and copying isn't allowed in this scenario. The right choice if data may be copied and minutes of staleness are acceptable.
- **LLM agent loop** (model runs and refines searches itself): flexible, but +1–2 s per round, non-deterministic, hard to test.
- **Embedding only the fetched pool for recommendations**: ~1–3 s per request and "similar" only within what was fetched.

## Consequences
- Answers in API mode can miss matches beyond the checked pages; the shopper is told, never misled.
- In a Partial Result `total` is a lower bound ("9 found in the 500 checked"), so the Assistant's wording must come from `coverage`.
- Keyword-only searches find fewer Products in API mode: DummyJSON's search matches title and description only (checked live 2026-11-25), while memory mode also matches brand and tags ("apple": 10 vs 14+). With a category the answers are the same, because the whole category is read.
- Proven by a same-answer test: with limits large enough to see everything, both adapters return the same results on the recorded real 194-Product Catalog (category, price, sort and paging queries); keyword-only results are checked to be a subset.
