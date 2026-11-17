# QA report

/qa run 2026-11-17 · scope: `docs/requirements.md` · ✅ covered · 🟡 manual (smoke test only) · ❌ gap

## Coverage map
| AC | Covered by |
|---|---|
| AC1.1 message shown at once, input disabled | ✅ `ChatView.spec.tsx` "streams a new turn…" |
| AC1.2 empty message not sent | 🟡 smoke test (Send stays disabled); no test |
| AC2.1 progressive text | ✅ `ChatView.spec.tsx`, `chat.e2e-spec.ts` "streams tool output then text" · smoke test: 45 distinct text lengths in one reply |
| AC2.2 typing state | ✅ `ChatView.spec.tsx` |
| AC2.3 mid-stream error → partial text + Retry | ✅ `ChatView.spec.tsx`, `chat.e2e-spec.ts` "sends an error part…" |
| AC3.1 smartphones | ✅ eval `plain` |
| AC3.2 / R6 price limit | ✅ `filter-products.spec.ts` (inclusive and exact) · eval `price` |
| AC3.3 / R2 ambiguous | ✅ eval `ambiguous` · `chat-turn.service.spec.ts` (guessed needs an assumption) |
| AC3.4 / R3 off-catalog | ✅ eval `off-catalog` |
| AC3.5 / R4 multi-intent | ✅ eval `multi-intent` · e2e (tool-call order) |
| AC3.6 / R5 follow-up | ✅ eval `follow-up` · `compact-history.spec.ts` |
| AC3.7 / R8 no results | ✅ `filter-products.spec.ts` (total 0) · `ProductGroup` empty state · smoke test ("cheaper ones" → "none cheaper than $19.99") |
| AC3.8 Catalog down | ✅ `dummyjson.catalog.spec.ts`, `catalog.service.spec.ts`, `products.e2e-spec.ts` 503 · smoke test (API pointed at a dead host → "can't search right now") |
| AC3.9 / R9 out of stock | ✅ `filter-products.spec.ts` · every eval case |
| AC3.10 / R10 Recommended Group | ✅ `rank-by-similarity.spec.ts`, `recommendation.service.spec.ts`, `catalog.service.spec.ts`, `chat-turn.service.spec.ts`, `chat.e2e-spec.ts` (fake embedder), `MessageBubble.spec.tsx`, `chat-mapping.spec.ts` · eval `beach` + R10 on every case (S8) · smoke test (S8 re-verify: beach, cellphone, off-catalog, Show more, reload) |
| AC4.1 card fields, badge | ✅ `MessageBubble.spec.tsx` |
| AC4.2 label + "N more" | ✅ `MessageBubble.spec.tsx`, `product-view.spec.ts` |
| AC4.3 details popup | ✅ `ChatView.spec.tsx` (Esc / ✕ / backdrop, focus returns) |
| AC4.4 Show more | ✅ `ChatView.spec.tsx`, `resolve-paged-query.spec.ts` |
| AC4.5 image fallback | ✅ `MessageBubble.spec.tsx` |
| AC5.1 reload keeps history | ✅ `chat.e2e-spec.ts`, `ChatView.spec.tsx` · smoke test |
| AC5.2 corrupt data | ✅ `sqlite.conversation-repository.spec.ts` (bad row skipped) |
| AC5.3 storage cleared | 🟡 smoke test: browser storage holds nothing (server-side SQLite, ADR 0003); DB file deleted while running → no crash, lost after restart → "Conversation not found" + New chat |
| AC5.4 write fails | ✅ `chat-turn.service.spec.ts` "tells the Shopper when the reply could not be saved" |
| AC6.1 new chat | ✅ `router.spec.tsx` · smoke test |
| AC6.2 list, newest first, titles | ✅ `conversations.service.spec.ts`, e2e |
| AC6.3 switch back and continue | ✅ e2e reload · smoke test (switched back, follow-up used the earlier price) |
| AC6.4 delete (Could) | ✅ e2e DELETE |
| US6b widget (Should) | ✅ built after /qa in S7 — `WidgetShell.spec.tsx` (AC6b.1–6b.3), `router.spec.tsx` (`/`), `top-rated.spec.ts`, `products.e2e-spec.ts`; live check in Chrome (desktop + 606 px window, the narrowest Chrome allows) |
| AC7.1 offline flow | ✅ `chat.e2e-spec.ts` (MockLanguageModel + fake Catalog + in-memory SQLite) |
| AC7.2 live eval | ✅ `npm run eval`, 6 cases (below) |
| AC7.3 one command per suite | ✅ `npm test`, `npm run eval` |

## Suite results (2026-11-17)
| Command | Result |
|---|---|
| `npm run typecheck` | ✅ 0 errors (4 workspaces) |
| `npm run lint` | ✅ clean |
| `npx prettier --check .` | ✅ clean |
| `npm test` | ✅ api 104/104 (21 files, e2e included) · web 50/50 · evals 22/22 → after the fixes: api 105/105 · web 50/50 · evals 22/22 |
| `npm run eval` | ✅ 6/6 before the fixes (3.6–10.9 s per case) and 6/6 after (3.2–8.1 s per case, table below) |
| `npm run build` | ❌ on a clean clone (`evals` has no `build` script) → ✅ fixed with `--if-present` (A3) |
| clean clone `npm install` + start API | ✅ health ok |

## Smoke test (Chrome, gpt-6-luna, real DummyJSON)
| Scenario | Result |
|---|---|
| Tokens visibly stream | ✅ 94 DOM updates, 45 distinct text lengths; typing dots, then the input is disabled ("Assistant is replying…") |
| Cards | ✅ image, title, 2-line description, price, rating, −% badge, Assumption chip, "1 more match" + Show more |
| "something cheap and cool" | ✅ sunglasses ≤ $50, Assumption stated, one follow-up question |
| "cheaper ones" | ✅ group "no matches" + "no sunglasses below $19.99", asks what to try next |
| "a flight to Tokyo" | ✅ "Not sold here" notice, suggests bags/sunglasses. In both eval runs it also added an **empty** related group, "Travel bags… (0 of 0)" |
| multi-intent | ✅ 2 groups (phones ≤ $499.99, lipstick) |
| Refresh | ✅ same Conversation, 4 groups, 9 images |
| New chat → switch back → continue | ✅ old one stays in the list; continuation used context |
| DummyJSON unreachable | ✅ "I can't search the smartphone catalog right now", no Products, no crash |
| Invalid key | ✅ error part "could not finish… try again" + Retry; user Message saved; key masked in log. ⚠ Retry can't fix a bad key |
| Storage cleared | ✅ see AC5.3 |
| Console | ✅ no errors |

## S8 re-verify (2026-11-17, after RAG)
| Check | Result |
|---|---|
| `npm run typecheck` / `lint` | ✅ 0 errors / clean |
| `npx prettier --check .` | ✅ code clean · ⚠ `README.md` (untracked /readme draft) |
| `npm test` | ✅ api 144/144 (24 files) · web 68/68 · evals 27/27 |
| `npm run build` | ✅ (Vite chunk-size warning only) |
| `npm run eval` | ✅ 7/7, 3.5–9.1 s per case (table below) |
| Smoke: "something for the beach" | ✅ ✨ "You might also like · Similar to Beach essentials": Sunglasses, Girl Summer Dress, Classic Sun Glasses, Juice. ⚠ the match group above it is "1–4 of 190": Amazon Echo Plus, Matebook X Pro, Rolex, Water (Q1) |
| Smoke: Show more | ✅ match page 5–8 added, no new Recommended Group on the page, the Recommended Group has no Show more |
| Smoke: "I need a cellphone" | ✅ "Cellphones · no matches" + recommended iPhone 6, iPhone 13 Pro…; reply says no exact match, points to the suggestions |
| Smoke: "a flight to Tokyo" | ✅ "Not sold here" + no Recommended Group (threshold kept junk out). Empty "Instead: travel accessories" group again (B1) |
| Smoke: reload | ✅ ✨ heading, both match pages and the Recommended Group come back from SQLite |
| Console / API log | ✅ no errors, no recommendation warnings |

### S8 audit (catalog ports, `RecommendationService`)
Clean: ports are framework-free abstract classes in `catalog/application/`; `rankBySimilarity`, `cosine`, `toEmbeddingText` are pure and unit-tested; the filters + `k` travel in `SimilarityQuery`, so a pgvector adapter fits `VectorIndexPort` unchanged; `@huggingface/transformers` is imported lazily, only in `infrastructure/local-embedding.ts`; every recommendation failure becomes "no Recommended Group" plus a warning (8 specs in `recommendation.service.spec.ts`); recommended titles are JSON-quoted in history notes (`compact-history.ts:34`); `semanticQuery` is never put into a prompt.

| # | Sev | Where | Finding |
|---|---|---|---|
| Q1 | med | `catalog/domain/filter-products.ts` (sort `relevance`) + `catalog.service.ts:30` | A broad search (no category, no keywords, no price) returns the whole Catalog as the **match** group, ordered by rating (no keyword scores, `filter-products.ts:49`): "Beach essentials 1–4 of 190" = Echo, Matebook, Rolex, Water, while the reply says "no exact match". The good results sit below in "You might also like". Seen in the browser and in eval `beach`/`ambiguous` ("4 of 190"); the eval passes because no rule checks match relevance. **D51 a → `/developer`** (order relevance-sorted, keyword-less matches by similarity to `semanticQuery`). |
| Q2 | low | `recommendation.service.ts:70-80` + `local-embedding.ts:26-29` | After a failed model load (e.g. offline first start), every search starts a new background load of the whole Catalog and logs a warning. No latency (background), but log noise and repeated download attempts. **D52 a → README** |
| Q3 | low | `chat-turn.service.ts:39` / `catalog.service.ts:37` | Exclusion is per Search Intent: in a multi-intent turn a Recommended Group may repeat a Product shown in another intent's match group. R10 only forbids the same intent, so it is allowed, but it looks like a duplicate. **D53 a → README** |
| Q4 | low | `recommendation.service.ts:75` | `vectors[i] ?? []` silently indexes a Product with no vector if the embedder returns fewer vectors; it then never scores (cosine 0). Harmless. **D53 a → ignore** |

## Audit (SOLID / KISS / DRY / DDD)
Clean: no framework imports in `domain/` or `application/`; thin controllers; no retrieval or prompt logic in web; all types come from `@app/contracts`; domain functions are pure (time and ids injected); every stream failure becomes an SSE error part (LLM error, catalog error, save error, client disconnect drains and saves).

| # | Sev | Where | Finding | Status (D35 a) |
|---|---|---|---|---|
| A1 | med | `assistant/domain/compact-history.ts:25-36` + `infrastructure/ai-sdk.llm.ts:23,50` | History notes are **system-role** messages that interpolate raw Product titles, model-written labels and `offCatalog.request` (shopper text) without escaping. Catalog or user text reaches system authority (prompt injection). | ✅ fixed: every interpolated string is JSON-quoted, and the prompt says quoted strings are data; new spec feeds in a title containing a newline and a fake "SYSTEM:" line |
| A2 | med | `catalog/infrastructure/dummyjson.catalog.ts:41` | `fetch` has no timeout. A hung DummyJSON stalls every turn via the shared in-flight load. | ✅ fixed: `AbortSignal.timeout` (5 s default) → CatalogUnavailable; new spec for a hung fetch |
| A3 | low | `package.json` `build` | Root build fails (evals has no build script). | ✅ fixed |
| A4 | low | `web/src/api/client.ts:21`, `conversations/domain/conversation.ts:30` | Dead code: `isNotFound` is unused (`ChatView.tsx:30` repeats the check), and `toSummary` is used only by its spec (the repository builds the summary by hand at `sqlite.conversation-repository.ts:66`). | ✅ fixed: `ChatView` uses `isNotFound`; `toSummary` removed |
| A5 | low | `assistant/presentation/chat.controller.ts:21-26` | `Readable.fromWeb(...).pipe(res)` has no `error` listener. Unlikely to fire, because `createUIMessageStream` catches its own errors. | deferred → README |
| A6 | low | `assistant/application/chat-turn.service.ts:8` | Depends on the concrete `CatalogService` from another bounded context, not a port. Acceptable at this size. | deferred → README |
| A7 | low | `packages/contracts/src/index.ts:63-84` | `minPrice > maxPrice` isn't rejected and silently returns an empty group. | deferred → README |
| A8 | low | `.gitignore:12` | `docs/dummyjson_products_openapi.yaml` is ignored, but `architecture.md` and the protocol cite it, so it is missing from the public repo. | ✅ fixed (D36): spec committed |
| B1 | low | prompt (`system-prompt.ts`) | Off-catalog turns sometimes add an empty related group (eval, 2 of 2 runs). R8 is satisfied (the empty group explains itself) but it looks odd. | deferred → README (looked fine in the post-fix eval run, no group) |
| B2 | low | `ai-sdk.llm.ts:67-69` | Auth or config errors give the same "try again" message as transient ones. | deferred → README |

## Release readiness
✅ `grep -rE 'sk-…'` on the tree: none · `git log -p` all branches: 0 matches · `.env` and `data/` ignored, `.env.example` present (names only) · `docs/ai-log/` has no key (only false "task-" hits) · ✅ root `npm run build` (A3 fixed) · the DummyJSON OpenAPI spec is now committed (D36).

<!-- eval:start -->
## Live eval

`npm run eval` · model `gpt-6-luna` · real DummyJSON Catalog · 2026-11-17 17:35 · **7/7 cases passed**

Rules: R1 real Products · R2 Assumption + question · R3 off-catalog reported · R4 one group per intent · R5 follow-up cheaper · R6 price limit · R7 ≤ 4 cards · R9 in stock · R10 Recommended Group repeats no match, keeps price + stock · similar = "You might also like" shown · reply has text.

| Case | Request | Groups | Checks | Time |
|---|---|---|---|---|
| plain | show me smartphones | Smartphones (4 of 15); You might also like · Smartphones (4 of 4) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R10 · ✅ R4 | 4.3 s |
| price | a phone under $500 | Phones under $500 (4 of 12); You might also like · Phones under $500 (3 of 3) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R10 · ✅ R4 · ✅ R6 | 4.6 s |
| ambiguous | something cheap and cool | Affordable cool picks (4 of 190); You might also like · Affordable cool picks (1 of 1) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R10 · ✅ R2 | 5.8 s |
| off-catalog | a flight to Tokyo | — | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R10 · ✅ R3 | 3.5 s |
| multi-intent | a phone under $500 and a lipstick | Phones under $500 (4 of 12); You might also like · Phones under $500 (3 of 3); Lipsticks (1 of 1); You might also like · Lipsticks (3 of 3) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R10 · ✅ R4 · ✅ R6 | 5.0 s |
| follow-up | show me men's watches, most expensive first → show me cheaper ones | Men’s watches — cheaper than $8,999.98 (2 of 2); You might also like · Men’s watches — cheaper than $8,999.98 (4 of 4) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R10 · ✅ R4 · ✅ R5 | 9.1 s |
| beach | something for the beach | Beach essentials (4 of 190); You might also like · Beach essentials (4 of 4) | ✅ R1 · ✅ R7 · ✅ R9 · ✅ reply · ✅ R10 · ✅ similar | 5.6 s |

No failures.
<!-- eval:end -->
