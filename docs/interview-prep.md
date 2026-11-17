# Interview Prep

Likely "why X and not Y?" questions raised by each decision. Answers live in the linked docs.

## /grill-with-docs-simple (process setup)
- How did you use AI on this assignment, and how do you know the decisions are yours? → `docs/ai-log/SESSION-LOG.md`, `.claude/skills/_shared/PROTOCOL.md` §2
- Why role-based skills (product → architect → developer → qa → readme) instead of one long prompt? → `.claude/skills/`
- Your AI logs are in a public repo — how did you make sure no secret leaked? → `.claude/hooks/lib/ai-log.mjs` (`redact`), PROTOCOL §5
