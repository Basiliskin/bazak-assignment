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
