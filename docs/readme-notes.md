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
