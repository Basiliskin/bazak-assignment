# README notes (raw one-liners; /readme turns these into README.md)

## Assumptions
- Single anonymous Shopper per machine, no auth; English only; USD prices from the Catalog.

## Trade-offs
- Vague requests: search on a stated Assumption + one follow-up question, rather than blocking on a clarifying question.
- Off-catalog: explicit "not sold here" + optional real suggestions; hard rule that no Product is ever invented.
- Multi-intent: one Product Group per intent; ≤4 cards per group with "N more" to keep messages compact.
- Conversation titles = first message (~40 chars): free and can't fail, vs. an extra LLM call.

## With more time
- LLM-generated Conversation Titles, rename/delete, stop-generation button.

## /architect
- Framework: Vercel AI SDK v7; rejected from-scratch (≈1h plumbing), LangChain/Mastra (competing server/abstractions), assistant-ui/CopilotKit (own UI + runtime, hide what we must explain). ADR 0001.
- Retrieval: LLM translates request → structured query via tool input (category enum, keywords, price range, sort, confidence label + assumption); full catalog (`limit=0`) filtered in memory by pure functions. ADR 0002.
- No vector RAG: only gpt-6-luna allowed and it can't embed; 194 items → LLM maps to 24 categories. With more time / bigger catalog: embeddings + search engine behind CatalogPort.
- DummyJSON quirks found: substring search ("cheap"→0, "smartphone phone"→0, "phone" returns accessories), no price filter, sort/select only documented on /products.
- gpt-6-luna quirk: function tools rejected on /chat/completions → Responses API.
- Persistence: server SQLite (`node:sqlite`); clearing browser storage loses nothing; corrupt rows skipped; client sends only the new message. ADR 0003.
- Code style: functional core (pure functions, mock-free unit tests), imperative shell (Nest services/adapters do I/O).
- Assumption: no auth → one shared Conversation list per server.
- With more time: Playwright E2E, LLM-judge evals, structured-output pipeline fallback if the model skips `assumption`.

## /designer
- UI: copilot as a floating widget on a shop page (primary) + full-page view via ⤢; same components, different shells. 4 directions prototyped (`prototypes/`), B and C rejected (carousel hides products on desktop; results panel moves cards out of the chat).
- Out-of-stock Products hidden from results (R9) — found while prototyping.
- Widget keeps only a pointer (active Conversation id) in localStorage; clearing it loses nothing.
- With more time: dark mode, keyboard shortcuts, virtualised long threads, widget as an embeddable script for any site.

## /developer S0
- Setup: Node ≥ 22.12 (built on 26), `npm install`, `cp .env.example .env` + key, `npm run dev` → web http://localhost:5173, API http://localhost:3001/api. `npm test`, `npm run lint`, `npm run typecheck`.
- Stack is ESM end to end; Vitest everywhere (Jest rejected: needs experimental flag for ESM-only AI SDK v7 / Nest 12).
- API refuses to start without a key or with any model other than `gpt-6-luna`.
- Config: the API loads the repo-root `.env` itself (`process.loadEnvFile`, path resolved from the module, not the cwd); real env vars win; relative paths (DB) resolve against the repo root. `@nestjs/config` would fit a larger app with multiple config namespaces/environments.

## /developer S1
- Retrieval: whole catalog (194) fetched once (`limit=0`), cached 10 min, refreshed on demand; stale copy served if DummyJSON fails. Filtering, price limits, ranking, paging are pure functions (`filterProducts`).
- Keyword matching is part-of-word (iPhone, Handbag) with field weights; false hits ("ring" → Touring) are kept out by the category the LLM chooses. Limitation: no synonyms/semantic match ("cellphone" → nothing unless the LLM picks category).
- Out-of-stock Products never appear in results (R9).

## /developer S2
- Storage: `data/app.db` (SQLite, WAL) at the repo root, created on first start; delete the file to reset. One row per Message, validated with zod on read — a corrupted row is skipped, the rest of the chat loads.
- Endpoints: `GET /api/conversations`, `GET|DELETE /api/conversations/:id`.

## /developer S3
- One turn: save user Message → `streamText` (gpt-6-luna, 2 tools, ≤3 steps, last step text-only) → UI message stream (SSE) → on finish save assistant Message with its Product Groups.
- Tools are the structured query: the LLM fills `search_products` (category enum, single-word keywords, price range, sort, offset, confidence + assumption); code enforces prices/stock/paging. `report_off_catalog` marks off-catalog requests.
- Live findings worth telling: the model initially searched for "flight" three times and replied with nothing → forced final text step + prompt rule; it copied history annotations into replies → moved them to system notes.
- History: last 20 Messages; Products each reply showed are passed as system notes (id, title, price) so follow-ups work.
- Latency ≈ 5–6 s per turn with tools (gpt-6-luna via Responses API).

## /developer S4
- Full page at `/chat` (redirects to `/chat/<new id>`) and `/chat/:id`: sidebar with Conversations (newest first, delete on hover), New chat, streaming replies with "Searching: …" status, typing dots, caret, disabled input, error + Retry.
- The browser holds no history of its own: `useChat` is seeded from `GET /api/conversations/:id`, and each request sends only the new Message.
- Trade-off: switching Conversations shows a short "Loading conversation…" because history is always fetched fresh rather than served from cache.
- With more time: code-split the web bundle (>500 kB with zod + AI SDK), confirm before delete with undo, stop-generation button.

## /developer S5
- Product Cards: image (📦 placeholder if it fails), discount badge from 5%, 1-line title, 2-line description, price, ★ rating; groups show "1–4 of N", the 💡 Assumption chip on guessed searches, "N more match · Show more".
- Details popup: native `<dialog>` (Esc, focus trap, backdrop click), bottom sheet on phones; fetched from `GET /api/products/:id` and validated with the shared `ProductDetailsSchema`.
- Presentational components hold no logic: display rules are pure functions in `lib/product-view.ts`; containers own state and fetching.
- Trade-off: "Show more" goes through the LLM (one model call, ~5 s, persisted like any turn) instead of a direct paging endpoint.
- Found live: on "Show more" the model changed the sort order, so a Product repeated. Fix: paging reuses the stored search in code (only the offset comes from the model), and history notes now name the search so the reply text matches.

## /developer S6
- `npm run eval` runs 6 live cases (plain, price-limited, ambiguous, off-catalog, multi-intent, follow-up) against `gpt-6-luna` and the real Catalog, ~35 s, a few cents; writes the table to `docs/qa-report.md` and exits 1 on any failure. Not part of `npm test` (costs money, non-deterministic).
- Rules are checked in code on the saved Message — R1 ids/titles exist, R2 guessed search + Assumption + a question, R3 `report_off_catalog` called, R4 one group per intent, R5 cheaper than before, R6 price limit, R7 ≤ 4 cards, R9 in stock. The checks themselves are pure and unit-tested offline.
- Trade-off: one run per case; a pass is a smoke signal, not a pass rate. Wording quality is not checked.
- Found by the eval: "a flight to Tokyo" makes a related search ("Travel bags…") that returns 0 Products — an empty group under a correct refusal. Allowed by the rules (reply explains), but noisy.
- With more time: repeat each case N times and report a pass rate, an LLM judge for wording/Assumption quality, more cases (0 results, show more, prompt injection in Product text).

## /qa
- Verified: all suites green (api 105, web 50, evals 22), live eval 6/6 twice, smoke test of streaming, cards, ambiguous/off-catalog/multi-intent/follow-up, refresh, switching chats, Catalog down, invalid key. Full map: `docs/qa-report.md`.
- Fixed in /qa: Product titles and Shopper text in system-role history notes are now JSON-quoted (prompt-injection hardening); 5 s timeout on the DummyJSON fetch; root `npm run build` works on a clean clone.
- What the tests would *not* catch: reply wording and tone, whether a guessed Assumption is sensible, layout and visual regressions, model variance (each eval case runs once), deleting the SQLite file while the API runs (no crash, but the data is gone on restart).
- With more time: a distinct message for auth/config errors instead of "try again"; reject `minPrice > maxPrice` in the tool schema; `stream.pipeline` with an error callback in the chat controller; a narrow search port instead of `ChatTurnService` depending on `CatalogService`; a test for "empty message not sent" (AC1.2); a prompt rule against empty related groups on off-catalog replies (seen in 2 of 3 eval runs).

## /developer S7
- `/` is a shop page (top-rated in-stock Products from `GET /api/products?limit=10`, details popup on click) with the copilot as a floating ✦ widget: 420×680 window on desktop, full screen below 640 px, Product Groups as a carousel. ☰ lists Conversations, ＋ new chat, ⤢ opens the same Conversation at `/chat/:id`.
- The widget remembers only `{ open, conversationId }` in localStorage (zod-validated; corrupted/blocked storage → closed widget on a new chat). Chats themselves stay on the server.
- With more time: a "back to shop" path from the full page that reopens the widget; focus trap inside the widget on phones (it is full screen but not modal).
