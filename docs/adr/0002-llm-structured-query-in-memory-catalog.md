# 0002 — LLM translates requests into a structured query; catalog filtered in memory; no vector RAG

**Status:** accepted (2026-11-17, /architect round 1b — the structured-query-with-confidence idea came from the user). The "no vector RAG" part is superseded by ADR 0004.

## Context
DummyJSON search is a substring match: "cheap" → 0, "smartphone phone" → 0, "phone" mixes in accessories; there is no price filter. The catalog is 194 Products. Unconstrained, the model invents categories ("electronics"). Only `gpt-6-luna` is allowed and it cannot create embeddings.

## Decision
- The model calls `search_products` whose **input is the structured query**: `category` (enum of 24 real slugs | null), single-word `keywords`, `minPrice/maxPrice`, `sortBy`, `offset`, `label`, `confidence: clear | guessed`, `assumption` (required when guessed). `report_off_catalog` marks off-catalog requests.
- Confidence is a **label, not a number** — self-reported numeric confidence isn't calibrated, labels map directly to rule R2.
- The full catalog is loaded once (`GET /products?limit=0`, documented) and cached 10 min; `filterProducts` (pure) applies category, keywords, exact price range and sort.
- Rules that must hold (real Products only, price limits) are enforced in code, not the prompt.

## Alternatives rejected
- **Separate structured-output step then a second streamed call** — more predictable, but two LLM calls (+1–2 s to first token) and history plumbing for follow-ups. Kept as fallback if evals show the model skipping `assumption`.
- **Whole catalog in the prompt (~2.8k tokens)** — best semantic matching but doesn't scale and ids must be re-validated.
- **Vector RAG with `text-embedding-3-small`** — works on the key but is not an allowed model; at 194 items the LLM already does the semantic step by mapping to 24 categories.
- **DummyJSON call per search** — multi-word queries fail; sort/select on search/category undocumented.

## Consequences
Does not scale to large catalogs — there we'd move to per-request API/search-engine calls plus embeddings behind the same `CatalogPort`. Semantic hits like "for the beach" depend on the model's category mapping.
