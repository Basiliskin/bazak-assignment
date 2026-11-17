# 0004 — Local embeddings add a Recommended Group to every search

**Status:** accepted (2026-11-17, /readme RAG detour D40–D42 + /architect D43–D45). Supersedes the "no vector RAG" part of ADR 0002; the structured query and in-memory keyword filter stay.

## Context
Keyword matching (`filterProducts`) is exact, but it finds nothing when the request and the Product share no word: "cellphone", "something for the beach". ADR 0002 skipped vectors because `gpt-6-luna` can't embed and `text-embedding-3-small` isn't an allowed model.

Probe (2026-11-17, `@huggingface/transformers@4.3.2`, `Xenova/all-MiniLM-L6-v2` q8, Node 26 ESM, live catalog):
- 24 MB model; first load ~13 s (download), cached 74 ms; 194 Products embed in 0.5 s; one query 2–3 ms.
- "cellphone" → 4 smartphones (0.41). Raw "something for the beach" → Fish Steak first (0.28); the expanded "summer beach items: swimwear, sunglasses, sun hat, sandals, beach bag" → sunglasses and a summer dress (0.45–0.49).
- No real match (gaming, flights) → irrelevant items at ≤ 0.31.
- `onnxruntime-node` adds ~470 MB to `node_modules` (all platform binaries); its postinstall isn't needed on macOS arm64.

## Decision
- **Embeddings come from a local model** (all-MiniLM-L6-v2, in-process). Assumption: "gpt-6-luna only" covers the OpenAI models on the key, not a local embedder.
- `search_products` gains a required **`semanticQuery`**: an expanded description of what fits, written by the model per Search Intent.
- One call returns **`{ match, recommended | null }`**. Both are Product Groups, now with `kind: 'match' | 'recommended'`. `recommended` is built in code with no extra LLM step: cosine similarity on `semanticQuery`, the same stock and price filters, category ignored, every match id excluded, **minimum score 0.35**, at most 4. If nothing passes, it is `null`. It is skipped on Show-more pages and has no Show more of its own.
- Ports: `EmbeddingPort.embed(texts)` and `VectorIndexPort.nearest({ vector, minPrice, maxPrice, excludeIds, minScore, k })`. The port takes the filters and `k`, so a pgvector adapter can push them into SQL. POC adapters: the local model and an in-memory index built by the pure `rankBySimilarity`.
- **Lifecycle:** the model loads in the background at startup, and vectors are rebuilt when the catalog cache refreshes. If the model is still loading or failed, search returns only `match` and logs a warning; a turn never fails because of recommendations.

## Alternatives rejected
- **`text-embedding-3-small`**: better quality, but not an allowed model.
- **gpt-6-luna re-ranking a candidate list**: allowed, but adds a ~5 s call per search and doesn't scale.
- **One fused list (Reciprocal Rank Fusion)**: loses the "exact match vs. similar" distinction the Shopper sees.
- **Always the top 4 / a relative threshold**: shows junk ("Touring" car for a flight) when nothing is similar.
- **BM25**: fixes ranking within lexical matches, not requests with no lexical match. At 100K it comes with the search store.
- **Postgres + pgvector now**: not needed for 194 vectors; the ports keep that swap local.

## Consequences
- First start needs internet once (model download into `data/models/`). Tests use a fake `EmbeddingPort`, so they stay offline.
- The +470 MB install is a cost of local inference.
- 0.35 is tuned on one probe; the eval guards it (R10 + a "beach" case).
- Production (100K Products): a pgvector adapter on `VectorIndexPort` and BM25-like keyword search behind `CatalogPort.search(query)`, both in Postgres, which also replaces SQLite. Incremental embedding with content hashes; the category enum becomes the top-N categories by vector.
