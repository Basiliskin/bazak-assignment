# Interview Prep

Likely "why X and not Y?" questions raised by each decision. Answers live in the linked docs.

## /grill-with-docs-simple (process setup)
- How did you use AI on this assignment, and how do you know the decisions are yours? → `docs/ai-log/SESSION-LOG.md`, `.claude/skills/_shared/PROTOCOL.md` §2
- Why role-based skills (product → architect → developer → qa → readme) instead of one long prompt? → `.claude/skills/`
- Your AI logs are in a public repo — how did you make sure no secret leaked? → `.claude/hooks/lib/ai-log.mjs` (`redact`), PROTOCOL §5

## /product
- "Something cheap and cool" — why search on a guess instead of asking first? What if the guess is wrong? → `docs/requirements.md` R2
- DummyJSON search returns 0 for "cheap" — so how does the Assistant turn vague words into a query? → requirements "Catalog facts", `docs/architecture.md`
- "A flight to Tokyo" — how do you guarantee suggested items are real and not hallucinated? → R1, R3
- Is "a car" off-catalog? How does the Assistant know what the shop sells? → R3
- Why one card group per intent rather than a merged list? → R4
- Why first-message titles and not LLM titles? Why no auth? → SESSION-LOG /product round 2

## /architect
- Why Vercel AI SDK and not from-scratch / LangChain / Mastra / CopilotKit? → ADR 0001
- Don't you need RAG? Why no embeddings? → ADR 0002 (allowed models, 194 items, LLM does the semantic mapping)
- Why is confidence a label and not a score? → ADR 0002
- Why load the entire catalog into memory? What changes at 1M products? → ADR 0002 Consequences
- How do you guarantee "under $500" and "no invented products" if the LLM is in charge? → architecture.md "Query-type behaviour" (code-enforced, cards only from tool outputs)
- The model sent `guessed` without an assumption — what happens? → schema refine + SDK retry
- Why server-side SQLite and not localStorage? What happens if the user clears storage? → ADR 0003, failure-mode table
- Why does the client send only the last message? → ADR 0003 (tamper-proof history)
- Why persist your own Message shape instead of the SDK's UIMessage? → architecture.md D4
- What does "functional core, imperative shell" mean in your code? Show a pure function and its test. → PROTOCOL §4, `catalog/domain/filter-products.ts`
- Your e2e uses a mock model — what can't it catch? → architecture.md Testing
- You first skipped a design step, then added one — why? → SESSION-LOG /architect round 4

## /designer
- Why a floating widget *and* a full page? Isn't that double work? → `docs/design.md` (shared ChatView + components; only shells differ; A is the fallback)
- Where does the widget remember the open conversation, and what if that's cleared? → design.md "State", ADR 0003 amendment
- Why not the results-panel layout (C)? → design.md "Rejected"
- Why hide out-of-stock products instead of labelling them? → requirements R9
- How did you make the prototypes modular, and how does that carry into React? → `prototypes/shared/` (pure model + pure render functions + one runtime) ↔ presentational components + containers
- Accessibility: what happens to keyboard focus when the dialog opens/closes? → design.md "Accessibility"

## /developer S0
- Why Vitest for a NestJS API instead of Jest? → architecture D17 (ESM-only `ai@7` + Nest 12; SWC for decorator metadata)
- How do the apps share types without copying them? → D18, `packages/contracts` built to `dist/`
- How do you make sure the API key can't leak and only `gpt-6-luna` is used? → `apps/api/src/shared/config/app-config.ts` (`z.literal`, errors never echo values) + spec
- Why is config parsing a pure function separate from the Nest module? → functional core: `parseConfig` unit-tested without Nest; `loadConfigOrExit` is the shell
- Where is `.env` loaded and why not a CLI flag or `@nestjs/config`? → D19, `apps/api/src/shared/config/config.module.ts` (app owns its config; works for every runner; cwd-independent paths)

## /developer S1
- Why part-of-word matching when it gives false hits like "ring" → "Touring"? → D20; category narrows; ranking by field; `filter-products.spec.ts`
- How is "under $500" guaranteed? → code, not prompt: `filterProducts` inclusive `maxPrice` (R6) + spec at 499.99/500/500.01
- What happens when DummyJSON is down? → D21: stale copy; none → `CatalogUnavailable` → 503 / tool error (AC3.8); `dummyjson.catalog.spec.ts`
- Why is `CatalogPort` an abstract class, not an interface? → it doubles as the Nest DI token without importing Nest into application/
- How do errors reach the client? → `toErrorResponse` (pure) + `DomainExceptionFilter`; unknown errors never leak messages

## /developer S2
- What happens if a stored message is corrupted? → `rowsToConversation` skips + counts, repo warns; spec "skips a corrupted Message row" (AC5.2)
- Why save the whole Conversation instead of `insertMessage`? → D22 aggregate persistence; insert-or-ignore makes retries idempotent; transaction + rollback spec
- Why is `appendMessage` a no-op for a known Message id? → client retries / regenerate can't duplicate a Message
- Why `node:sqlite` over a JSON file or an ORM? → ADR 0003; zero deps, transactions, per-row corruption isolation

## /developer S3
- Where does the AI SDK live, and how do you test the turn without it? → D24; `LlmPort` + fake in `chat-turn.service.spec.ts`; real adapter + `MockLanguageModelV4` in `test/chat.e2e-spec.ts`
- How can the LLM not invent a Product on screen? → cards render only from `tool-output-available` (real `filterProducts` results); text can't add cards (R1)
- What if the model keeps calling tools and never answers? → `stepCountIs(3)` + `prepareStep` forces `toolChoice: 'none'` on the last step (found live: empty reply to "a flight to Tokyo")
- How does "show me cheaper ones" work without replaying tool calls? → D25 system notes with id/title/price; why not inside assistant text (model copied them — seen live)
- What happens on LLM failure mid-reply / DB write failure / client disconnect? → `error` part (AC2.3) / "could not be saved" part (AC5.4) / controller keeps draining so the reply is still saved
- How are parallel tool calls kept in order in the saved Message? → slot reserved at call time in `createTurnTools`
