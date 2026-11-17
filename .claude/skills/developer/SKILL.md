---
name: developer
description: Developer step for the AI shopping copilot assignment — implements exactly one vertical slice from docs/architecture.md (S0…Sn), proposing implementation options first, then writing code test-first and committing when green. Use with a slice id, e.g. "/developer S2".
---

# /developer <slice>

Follow `.claude/skills/_shared/PROTOCOL.md` throughout.

## Goal
Deliver one slice, green and committed, without scope creep.

## Steps
1. Read the slice in `docs/architecture.md`, its acceptance criteria in `docs/requirements.md`, and SESSION-LOG. If no slice is given, pick the next unfinished one and say so.
2. Propose **2–3 implementation options** for the slice's real choices only (e.g. tool-loop written by hand vs. SDK helper; `EventSource` vs. `fetch` reader; TanStack Query vs. custom hook; prompt in code vs. prompt file). Recommend one. **Wait** for the user.
3. Implement **test-first** where logic exists: failing test → code → green.
   - Backend logic tested with fake `LlmPort` / `CatalogPort` — no network in unit/e2e tests.
   - API slices get a supertest e2e that reads the stream and asserts the event sequence.
4. Keep the bar:
   - Domain/application code has no Nest, OpenAI SDK or HTTP imports; adapters live in infrastructure.
   - Controllers only map HTTP ↔ application; DTOs validated; errors mapped in one filter; stream errors sent as an `error` event, not a dropped connection.
   - React: containers fetch/stream, presentational components render; no prompt or retrieval logic in the browser.
   - Shared types come from the contracts location, never duplicated.
   - Never log or hard-code the API key; read it via config.
5. Run lint, typecheck and tests. Report the real output; fix failures before handing off.
6. List changed files, add interview-prep / readme-notes entries for choices made, log in SESSION-LOG, then commit (secret check from PROTOCOL §5 first).

## Hand off
If slices remain:
➡️ Next step: `/developer`
Suggested prompt: `/developer S<next> <slice title from docs/architecture.md>`

If all slices are done:
➡️ Next step: `/qa`
Suggested prompt: `/qa verify the full build against docs/requirements.md, run the eval suite and audit SOLID/KISS/DRY/DDD`
