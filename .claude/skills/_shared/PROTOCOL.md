# Skill Protocol (shared by product, architect, developer, qa, readme)

Every skill in this repo follows these rules. Read this file before acting.

## 0. Fixed facts (never re-ask)
- Task: AI shopping copilot (chat → understand intent → DummyJSON products → product cards in chat). Source: `docs/assignment.md`.
- Stack: TypeScript everywhere, NestJS backend, React frontend.
- Model: **only `gpt-6-luna`** via the OpenAI API (the optional Decisions API uses the same key). Key lives in `.env` (`OPENAI_KEY`, `OPENAI_MODEL`), never in code, docs or logs.
- Catalog: DummyJSON `https://dummyjson.com/products`. Check real behaviour (OpenAPI file if present in `docs/`, otherwise the live API) before relying on any endpoint or parameter — never assume one exists.
- Budget: **~3 hours total**. It is a home assignment, not a production product. Simplest thing that works; YAGNI beats cleverness.
- The repo is **public**. Anything written to it (code, docs, logs) is published.
- Graded on: the README answers and the candidate defending every decision in an interview.

## 1. Ground yourself first
- Read `docs/assignment.md`, `docs/requirements.md`, `GLOSSARY.md`, `docs/adr/`, `docs/ai-log/SESSION-LOG.md` (settled decisions) and the outputs of earlier skills that exist.
- Do not re-ask anything already decided in SESSION-LOG or an ADR.
- Use Glossary terms exactly. If a new term is needed, propose it and add it to `GLOSSARY.md` once the user agrees (glossary = definitions only, no implementation details).

## 2. Propose, never decide
- For every non-trivial decision present **2–3 options**, each with concrete trade-offs (KISS / SOLID / DRY / DDD / time cost / what breaks), and mark one `(Recommended)`.
- Format:
  ```
  ❓ D<n> — <decision title>
  (a) … (Recommended)
  (b) …
  (c) …
  ➡️ why the recommendation, in one or two sentences
  ```
- Max **3 decisions per round**. Smaller choices become stated defaults listed at the end of the round (the user can object).
- **Stop and wait.** The user picks a letter, mixes options, or writes their own. Never proceed on an unanswered decision.
- Options must be real alternatives for *this* assignment, not generic pros/cons — the README must name rejected alternatives with concrete reasons, and these rounds are where those reasons come from.

## 3. Record everything
- The hooks write every user prompt and Claude's final reply, timestamped and tagged with the active skill, to `docs/ai-log/CONVERSATION.md` (secrets redacted). Do not edit that file.
- After every user answer, append to `docs/ai-log/SESSION-LOG.md`:
  ```
  ## <YYYY-MM-DD HH:MM> : /<skill> — <step>

  **User input:**
  > <verbatim>

  **Options offered:** D1 (a/b/c) …
  **Decision:** …
  **Artifacts:** files created/changed
  ```
- **Interview prep**: for each decision taken, append the 2–3 "why X and not Y?" / "what happens when…?" questions it will likely raise to `docs/interview-prep.md` under a `## /<skill>` heading (question only + one-line pointer to where the answer lives). Do not quiz the user.
- **README notes**: append one-liners for assumptions, trade-offs and "with more time" items to `docs/readme-notes.md`; `/readme` turns them into the final README.
- Hard-to-reverse + surprising + real trade-off → offer an ADR in `docs/adr/NNNN-title.md` (Context / Decision / Alternatives rejected / Consequences).

## 4. Engineering bar
- SOLID, KISS, DRY, DDD — applied proportionally to a 3-hour build.
- Domain/application code has no framework imports. External systems (OpenAI, DummyJSON, storage) sit behind ports (interfaces) so tests can swap in fakes.
- NestJS: feature modules, thin controllers, DTOs validated (`class-validator` or zod — architect decides), config via `@nestjs/config`, domain errors mapped in one exception filter, no business logic in controllers.
- React: function components + hooks, container vs presentational split, one API client, no business rules in the UI, shared types from one contracts location (never duplicated).
- Secrets: `.env` is gitignored; ship `.env.example` with names only.

## 5. Commits
- `/developer` commits after each slice once lint, typecheck and tests are green (Conventional Commits, e.g. `feat(chat): stream assistant replies over SSE`).
- Other skills commit their docs at the end of their run (e.g. `docs(architecture): …`).
- Before every commit: `git diff --cached | grep -E 'sk-[A-Za-z0-9_-]{16,}'` must be empty. Never commit `.env`.
- Never push unless the user asks.

## 6. Hand off
End every run with:
```
✅ Done: <what was produced>

➡️ Next step: /<next-skill>
Prompt to paste:
/<next-skill> <ready-to-run prompt with concrete context>
```
Chain: `/product` → `/architect` → `/developer <slice>` (repeat per slice) → `/qa` → `/readme` → `/interview`.
Log the suggested next step in SESSION-LOG too.
