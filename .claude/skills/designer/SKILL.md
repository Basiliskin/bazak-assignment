---
name: designer
description: UI/UX step for the AI shopping copilot assignment — builds 2 clickable static HTML prototypes (fake data, simulated streaming) covering the key chat moments, lets the user pick or mix, and writes docs/design.md for the web slices. Use after /architect and before the web slices (S4/S5), or when the UI direction needs revisiting.
---

# /designer

Follow `.claude/skills/_shared/PROTOCOL.md` throughout.

## Goal
A UI direction chosen by the user from real clickable options, written to `docs/design.md` so `/developer` S4–S5 implement it without re-deciding.

## Steps
1. Read `docs/requirements.md` (US1–US6, R1–R8), `docs/architecture.md` (Frontend, contracts), `GLOSSARY.md`, SESSION-LOG.
2. Propose **2 layout directions** in one line each (e.g. A: persistent sidebar + chat, card grid inside the reply; B: collapsible sidebar, horizontal card carousel per Product Group) plus any 1–2 open UX questions (how the Assumption is shown, how Off-catalog looks, empty state). Recommend one. **Wait.**
3. Build the 2 prototypes as **single self-contained HTML files** in `prototypes/` (`a-<name>.html`, `b-<name>.html`): Tailwind via CDN, inline JS, fake data shaped like `packages/contracts` (real DummyJSON titles/prices/thumbnail URLs). No build step, no framework. Each must show, switchable from a small "scenario" menu:
   - empty new chat (with example prompts),
   - simulated streaming text + typing state,
   - plain search (1 Product Group, "N more" + Show more),
   - Ambiguous Request (Assumption visible + follow-up question),
   - Off-catalog Request (+ real suggestions),
   - Multi-intent Request (2 labelled groups),
   - LLM error mid-reply with Retry,
   - Product details popup (Esc / backdrop close), broken-image placeholder,
   - sidebar with several Conversations, active one highlighted; narrow-screen behaviour.
4. Tell the user how to open them (`open prototypes/a-….html`). Ask them to pick A, B, or a mix (e.g. "A layout, B cards"), and any changes. **Wait.** Apply changes to the chosen prototype only if small.
5. Write `docs/design.md`: chosen direction and why, component list mapped to `docs/architecture.md` (MessageBubble, ProductGroup, ProductCard, ProductDetailsDialog, ConversationSidebar…), how each scenario looks, spacing/colour tokens (Tailwind classes), accessibility basics (focus, alt text, Esc, contrast), responsive rule.
6. Interview-prep + readme-notes entries, log in SESSION-LOG, commit (`docs(design): …` + prototypes).

## Hand off
➡️ Next step: `/developer`
Suggested prompt: `/developer S0 scaffold + tooling from docs/architecture.md`
