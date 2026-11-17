---
name: qa
description: QA and final-review step for the AI shopping copilot assignment — maps every acceptance criterion to a test, runs all suites plus the live LLM eval, smoke-tests the app (streaming, cards, refresh, conversation switching, ambiguous/off-catalog/multi-intent queries), audits SOLID/KISS/DRY/DDD and NestJS/React practice, and checks the repo is safe to publish. Use after the last /developer slice.
---

# /qa

Follow `.claude/skills/_shared/PROTOCOL.md` throughout.

## Steps
1. **Coverage map** in `docs/qa-report.md`: each acceptance criterion in `docs/requirements.md` → covering test, eval case, or "manual". Mark gaps. Keep it short.
2. **Run** typecheck, lint, unit, e2e and the live eval suite; paste real results (eval: pass rate per case, cost/latency if cheap to capture).
3. **Smoke test** the running app: tokens visibly stream; product cards show title, description, price, image; refresh keeps history; new conversation, list, switch back and continue; "something cheap and cool", "a flight to Tokyo", a multi-intent query, a follow-up ("cheaper ones"); DummyJSON unreachable; invalid key; storage cleared mid-conversation.
4. **Audit** the code and cite `file:line`: framework/SDK imports in domain; fat controllers; retrieval or prompt logic in `apps/web`; duplicated types; SRP/DIP violations; unhandled stream errors; dead code; prompt-injection exposure from product text.
5. Propose fixes as options (fix now / defer to README "with more time" / ignore) with a recommendation; **wait**, then apply the chosen small fixes or hand larger ones back to `/developer`.
6. **Release readiness** (public repo): no key anywhere — `grep -rE 'sk-[A-Za-z0-9_-]{16,}' --exclude-dir=node_modules .` and `git log -p | grep -E 'sk-…'` both empty; `.env` ignored and `.env.example` present; clean `npm install && npm run dev` from scratch works; `docs/ai-log/` contains no secrets.
7. Add interview-prep / readme-notes entries (especially "what the tests would *not* catch"), log, commit.

## Hand off
If gaps remain:
➡️ Next step: `/developer`
Suggested prompt: `/developer fix <gap> from docs/qa-report.md`

Otherwise:
➡️ Next step: `/readme`
Suggested prompt: `/readme write the final README from docs/readme-notes.md, docs/architecture.md, docs/adr and docs/qa-report.md`
