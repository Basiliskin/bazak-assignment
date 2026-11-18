# Interview Prep

Likely "why X and not Y?" questions raised by each decision. Each `→` lists the `file:line` targets that answer it (decision rows in `docs/ai-log/SESSION-LOG.md` are written `SL:<line>`). Lines are as of 2026-11-18; if one drifted, `grep -n` the named symbol.

## /grill-with-docs-simple (process setup)
- How did you use AI on this assignment, and how do you know the decisions are yours? → `.claude/skills/_shared/PROTOCOL.md:19` (§2 Propose, never decide); retrieval idea you brought in: SL:111-122
- Why role-based skills (product → architect → developer → qa → readme) instead of one long prompt? → `.claude/skills/`; designer added back: SL:153-165
- Your AI logs are in a public repo — how did you make sure no secret leaked? → `.claude/hooks/lib/ai-log.mjs:34` (`redact`), `.gitignore:1-3`

## /product
- "Something cheap and cool" — why search on a guess instead of asking first? What if the guess is wrong? → `docs/requirements.md:13` (R2), `apps/api/src/assistant/domain/system-prompt.ts:20`
- DummyJSON search returns 0 for "cheap" — so how does the Assistant turn vague words into a query? → `docs/requirements.md:5` (Catalog facts), `system-prompt.ts:14`
- "A flight to Tokyo" — how do you guarantee suggested items are real and not hallucinated? → `docs/requirements.md:12,14` (R1, R3), `apps/web/src/chat/to-chat-items.ts:36-37`
- Is "a car" off-catalog? How does the Assistant know what the shop sells? → `system-prompt.ts:8-10` (category slugs + vehicle note), `docs/requirements.md:14`
- Why one card group per intent rather than a merged list? → `docs/requirements.md:15` (R4), `system-prompt.ts:19`
- Why first-message titles and not LLM titles? Why no auth? → SL:69-80 (/product round 2, D5)

## /architect
- Why Vercel AI SDK and not from-scratch / LangChain / Mastra / CopilotKit? → `docs/adr/0001-vercel-ai-sdk.md:8`, README "Architecture & framework choice"
- Don't you need RAG? Why no embeddings? → `docs/adr/0002-llm-structured-query-in-memory-catalog.md:8` (superseded in part by ADR 0004)
- Why is confidence a label and not a score? → ADR 0002:8, `packages/contracts/src/index.ts:86-97`
- Why load the entire catalog into memory? What changes at 1M products? → ADR 0002:20 (Consequences), `apps/api/src/catalog/infrastructure/dummyjson.catalog.ts:45`
- How do you guarantee "under $500" and "no invented products" if the LLM is in charge? → `docs/architecture.md:157` (Query-type behaviour), `apps/api/src/catalog/domain/filter-products.ts:87`, `to-chat-items.ts:36-37`
- The model sent `guessed` without an assumption — what happens? → `contracts/src/index.ts:93-103` (refine), `apps/api/test/chat.e2e-spec.ts:147` (model retries)
- Why server-side SQLite and not localStorage? What happens if the user clears storage? → `docs/adr/0003-server-side-sqlite-persistence.md:8`, README "Conversation & state"
- Why does the client send only the last message? → ADR 0003:8, `apps/web/src/chat/to-chat-request.ts:8`
- Why persist your own Message shape instead of the SDK's UIMessage? → `docs/architecture.md:11` (D4)
- What does "functional core, imperative shell" mean in your code? Show a pure function and its test. → `PROTOCOL.md:50` (§4), `filter-products.ts:73`, `filter-products.spec.ts:41`
- Your e2e uses a mock model — what can't it catch? → `docs/architecture.md:209-213` (Testing & evaluation), `apps/api/test/support/mock-model.ts`
- You first skipped a design step, then added one — why? → SL:153-165 (/architect round 4)

## /designer
- Why a floating widget *and* a full page? Isn't that double work? → `docs/design.md:16` (shells share `ChatView`), SL:198-208 (D16)
- Where does the widget remember the open conversation, and what if that's cleared? → `docs/design.md:61` (State), ADR 0003:18 (amendment), `apps/web/src/lib/widget-state.ts:14`
- Why not the results-panel layout (C)? → `docs/design.md:10` (Rejected)
- Why hide out-of-stock products instead of labelling them? → `docs/requirements.md:20` (R9), `filter-products.ts:84`
- How did you make the prototypes modular, and how does that carry into React? → `prototypes/shared/`, SL:184 ↔ `apps/web/src/lib/product-view.ts:14` + containers
- Accessibility: what happens to keyboard focus when the dialog opens/closes? → `docs/design.md:55`, `apps/web/src/components/Modal.tsx:10`

## /developer S0
- Why Vitest for a NestJS API instead of Jest? → `docs/architecture.md:17` (D17)
- How do the apps share types without copying them? → `docs/architecture.md:18` (D18), `packages/contracts/src/index.ts`
- How do you make sure the API key can't leak and only `gpt-6-luna` is used? → `apps/api/src/shared/config/app-config.ts:9-11` (`z.literal`), `:31-37` (errors never echo values)
- Why is config parsing a pure function separate from the Nest module? → `app-config.ts:34` (`parseConfig`, pure) vs `apps/api/src/shared/config/config.module.ts:27` (`loadConfigOrExit`, shell)
- Where is `.env` loaded and why not a CLI flag or `@nestjs/config`? → `docs/architecture.md:45` (D19), `config.module.ts:12`

## /developer S1
- Why part-of-word matching when it gives false hits like "ring" → "Touring"? → SL:256 (D20), `filter-products.ts:20-45`, `filter-products.spec.ts:67`
- How is "under $500" guaranteed? → `filter-products.ts:87` (inclusive `maxPrice`), `filter-products.spec.ts:41`
- What happens when DummyJSON is down? → SL:257 (D21), `dummyjson.catalog.ts:53-58`, `dummyjson.catalog.spec.ts:57,65`
- Why is `CatalogPort` an abstract class, not an interface? → `apps/api/src/catalog/application/catalog.port.ts:4` (doubles as the Nest DI token)
- How do errors reach the client? → `apps/api/src/shared/presentation/error-response.ts:30` (`toErrorResponse`, pure), `domain-exception.filter.ts:7`

## /developer S2
- What happens if a stored message is corrupted? → `apps/api/src/conversations/infrastructure/conversation-rows.ts:24` (`rowsToConversation`), `sqlite.conversation-repository.spec.ts:59`
- Why save the whole Conversation instead of `insertMessage`? → SL:274 (D22), `sqlite.conversation-repository.ts:69-75` (`INSERT OR IGNORE`), spec `:92` (rollback)
- Why is `appendMessage` a no-op for a known Message id? → `apps/api/src/conversations/domain/conversation.ts:26`
- Why `node:sqlite` over a JSON file or an ORM? → ADR 0003:8

## /developer S3
- Where does the AI SDK live, and how do you test the turn without it? → SL:295 (D24); `apps/api/src/assistant/application/llm.port.ts:25`; fake in `chat-turn.service.spec.ts:77`; real adapter + mock model in `apps/api/test/chat.e2e-spec.ts:54`
- How can the LLM not invent a Product on screen? → `to-chat-items.ts:11-17,36-37`
- What if the model keeps calling tools and never answers? → `apps/api/src/assistant/infrastructure/ai-sdk.llm.ts:65-67` (`toolChoice: 'none'` on the last step), `chat.e2e-spec.ts:207`, SL:304
- How does "show me cheaper ones" work without replaying tool calls? → SL:296 (D25), `apps/api/src/assistant/domain/compact-history.ts:32-52`, `system-prompt.ts:24`, `chat.e2e-spec.ts:214`
- What happens on LLM failure mid-reply / DB write failure / client disconnect? → `ai-sdk.llm.ts:70-83`, `chat.e2e-spec.ts:162,184`; `apps/api/src/assistant/presentation/chat.controller.ts:23-25`
- How are parallel tool calls kept in order in the saved Message? → `apps/api/src/assistant/application/chat-turn.service.ts:36,46`, `chat-turn.service.spec.ts:88`

## /developer S4
- Why seed `useChat` with stored Messages instead of rendering two lists? → SL:319 (D26), `apps/web/src/chat/to-ui-messages.ts:10`, `chat-mapping.spec.ts:8`
- Can a stream chunk put a fake Product on screen? → `to-chat-items.ts:11-17` (`ProductGroupSchema` / `SearchProductsOutputSchema`)
- How does "New chat" get its id, and what does refreshing an unsent chat show? → SL:320-323 (D27), `apps/web/src/shells/PageShell.tsx:26` (`NewChatRedirect`), `apps/web/src/chat/ChatView.tsx:17` (`fresh`)
- Why does `ChatView` wait for `isFetchedAfterMount` instead of using the cached history? → `ChatView.tsx:30`
- What does Retry send, and why can't it duplicate a Message? → `apps/web/src/chat/useShoppingChat.ts:47` (`regenerate`), `to-chat-request.ts:8`, `conversation.ts:26`

## /developer S5
- Why the native `<dialog>` and not a hand-made overlay or Radix? → SL:339 (D28), `Modal.tsx:10`, `apps/web/src/test-setup.ts:3` (jsdom stub)
- How "dumb" are the product components, and where does the logic live? → SL:333,344 (D29), `apps/web/src/lib/product-view.ts:14`, `apps/web/src/products/ProductDetailsContainer.tsx:11`
- Why parse the details response with zod when the API is ours? → SL:341 (D30), `contracts/src/index.ts:53`, `apps/api/src/catalog/infrastructure/parse-catalog.ts:1`
- How does "Show more" work, and what can go wrong? → SL:149 (sends a chat message), SL:349-355 (model changed `sortBy` on page 2)
- How do you stop "Show more" from repeating or skipping Products? → SL:354 (D31), `apps/api/src/assistant/domain/resolve-paged-query.ts:15-19`, `compact-history.ts:14-23`, `system-prompt.ts:25`
- What if the model reuses a label for a genuinely different search? → `resolve-paged-query.ts:15`, `resolve-paged-query.spec.ts:35`
- What if the model sends offset 0 or renames the label on "Show more"? → `resolve-paged-query.ts:15,19` (falls back to the model's query), `resolve-paged-query.spec.ts:49`; no eval case (README "Known limitations")

## /developer S6
- Why does the eval boot the real Nest app in-process instead of calling `streamText` or a running server? → SL:369 (D32), `evals/run-evals.eval.ts:10,82`
- How do you check an LLM's answer without an LLM judge? → SL:370 (D33), `evals/checks.ts:172`, `evals/checks.spec.ts`
- What can the coded checks *not* catch? → `docs/qa-report.md:117` (rules line), README "Evaluation → What gets through"
- One run per case on a non-deterministic model — how much is a pass worth? → `docs/readme-notes.md:12` (With more time)
- How did you stop the follow-up case from passing vacuously? → `evals/cases.ts:44-50`
- Why does the eval write only a marked section of `qa-report.md`? → SL:371 (D34), `evals/report.ts:63` (`replaceEvalSection`)

## /qa
- Product titles go into system-role history notes. Isn't that prompt injection? → SL:392 (D35), `compact-history.ts:25-29`, `system-prompt.ts:23,33`, `compact-history.spec.ts:83`
- What happens when DummyJSON hangs rather than refuses? → `dummyjson.catalog.ts:46` (5 s abort), `dummyjson.catalog.spec.ts:71`
- What do your tests *not* catch? → `docs/qa-report.md:117`, README "Evaluation → What gets through"
- What happens with an invalid API key? → `docs/qa-report.md:107` (B2, deferred), `ai-sdk.llm.ts:18`
- Why is AC5.3 (storage cleared) "manual"? → ADR 0003:8, `widget-state.ts:14-21`, `apps/web/src/shells/useWidgetState.ts:20`

## /developer S7
- Why a separate `topRated` instead of reusing `filterProducts`? → SL:409 (D37), `apps/api/src/catalog/domain/top-rated.ts:4`
- What exactly does the widget keep in localStorage, and what if it is corrupted, blocked or points to a deleted chat? → SL:410 (D38), `widget-state.ts:11-21`, `useWidgetState.ts:10-16`, `ChatView.tsx:17` (`fresh`)
- Why does ⤢ pass `{ fresh: true }`? → `PageShell.tsx:18` (`chatLocation`)
- How much did the widget cost given the full page existed? → `apps/web/src/conversations/WidgetConversations.tsx:11`, `ChatView.tsx:19` (`layout` prop)

## /readme — RAG detour
- Why a local embedding model and not text-embedding-3-small? → SL:458-466 (D40), `docs/readme-notes.md:85`
- Why two groups (match + recommended) instead of one fused list? → SL:460-466 (D42)
- Why no BM25? What changes at 100K products? → SL:469-475, `docs/readme-notes.md:85`
- What has to change to swap the in-memory vector index for pgvector? → SL:459,466 (D41), `apps/api/src/catalog/application/vector-index.port.ts:8`

## /architect — RAG (S8)
- Why a fixed 0.35 threshold, and what happens when it's wrong? → SL:485 (D43), `docs/adr/0004-local-embeddings-recommended-group.md:14`, probe numbers `docs/architecture.md:61-63`
- Why does the model write `semanticQuery` instead of embedding the user's raw message? → `docs/architecture.md:63` (beach 0.28 vs 0.49), `system-prompt.ts:15`
- What happens if the embedding model fails to download or load? → SL:486 (D44), `apps/api/src/catalog/application/recommendation.service.ts:21-22,104`
- Why does the Recommended Group ignore category but keep the price filter? → `docs/architecture.md:153`, `apps/api/src/catalog/domain/rank-by-similarity.ts:38-45`
- Is a local embedding model within "gpt-6-luna only"? → ADR 0004:15

## /developer S8
- Why exclude every match from recommendations, not just the shown page? → SL:607 (D56), `docs/architecture.md:43` (D50 replaced), `apps/api/src/catalog/application/catalog.service.ts:46`
- Why were recommendations after an off-catalog report allowed after all? → SL:505 (D49), `chat-turn.service.spec.ts:140`
- How do old saved conversations survive the new `kind`/`semanticQuery` fields? → SL:502 (D46), `contracts/src/index.ts:107-117`
- What happens on the first chat right after startup, before the model is loaded? → SL:486,503 (D44/D47), `recommendation.service.ts:73` (`similarityOrder` → null)
- Why is the recommendation built in code instead of a second tool the model calls? → SL:460 (D42), ADR 0004:14, `apps/api/src/assistant/domain/to-product-group.ts:38`

## /qa S8 re-verify
- "Something for the beach" shows an Echo and a Rolex as matches — why, and why didn't the eval catch it? → `docs/qa-report.md:88` (Q1), SL:519 (D51)
- What do the tests and eval *not* catch about RAG? → `docs/readme-notes.md:100`
- What happens if the embedding model can't be downloaded on first start? → `docs/qa-report.md:89` (Q2), SL:520 (D52)
- Can a recommendation repeat a product from another intent in the same turn? → `docs/qa-report.md:90` (Q3), SL:521 (D53)

## /developer Q1 fix
- Why order the match page by similarity and not filter it by the 0.35 threshold? → SL:534 (D54), `filter-products.ts:60-82`
- Why does "Show more" still get the similarity order when it gets no Recommended Group? → `catalog.service.ts:17-22,52-56` (`semanticQuery` on every page, `recommend` only on page 1), `to-product-group.ts:38`
- Why a category allow-list for the beach rule and not an LLM judge? → SL:535 (D55), `evals/checks.ts:162`, `evals/cases.ts:55`
