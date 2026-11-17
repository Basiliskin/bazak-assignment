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
