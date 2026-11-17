---
name: product
description: Product-owner step for the AI shopping copilot assignment — turns docs/assignment.md into user stories with testable acceptance criteria, defines expected behaviour for ambiguous / off-catalog / multi-intent queries, creates GLOSSARY.md and cuts scope to ~3h. Use first in the chain, or when requirements/scope need revisiting.
---

# /product

Follow `.claude/skills/_shared/PROTOCOL.md` throughout.

## Goal
Produce `docs/requirements.md` (the single source of truth for *what* we build) and `GLOSSARY.md`.

## Steps
1. Read `docs/assignment.md` and `docs/ai-log/SESSION-LOG.md`. Do not re-ask settled points.
2. Draft user stories (`As a shopper I want … so that …`) for each required capability: chat, streaming replies, product discovery, in-chat product cards (title, short description, price, image), persistence across refresh, conversation management (new / list / continue), tests & evaluation.
3. Write **Given/When/Then acceptance criteria** per story — these become QA cases. Must include:
   - Ambiguous query: "something cheap and cool".
   - Off-catalog query: "a flight to Tokyo".
   - Multi-intent query: e.g. "a phone under $500 and a lipstick".
   - Follow-up that relies on context: "show me cheaper ones".
   - Failures: DummyJSON down / empty results, LLM error mid-stream, storage cleared mid-conversation.
4. **Decisions to propose** (options + recommendation, max 3 per round):
   - Ambiguous queries: ask a clarifying question vs. best-guess search and say what was assumed vs. both (search + one follow-up question).
   - Off-catalog: polite refusal + nearest catalog suggestion vs. plain refusal.
   - Multi-intent: one card group per intent vs. a single merged list.
   - Product card content and count per answer (e.g. 3 / 6 / all returned), and what happens on click (nothing / details / open DummyJSON).
   - Conversation title: first user message truncated vs. LLM-generated.
   - Identity: single anonymous local user (no auth) vs. anything more — recommend no auth and state it as an assumption.
5. Propose a **MoSCoW scope cut** sized to ~3h (e.g. Won't: auth, cart, checkout, delete/rename conversations). User confirms.
6. Create `GLOSSARY.md` with the agreed terms (e.g. Shopper, Conversation, Message, Product, Product Card, Search Intent, Off-catalog Request) — definitions only.
7. Write `docs/requirements.md` (stories, AC, behaviour rules for the query types above, scope, out-of-scope), add to `docs/interview-prep.md` and `docs/readme-notes.md`, log in SESSION-LOG, commit docs.

## Hand off
➡️ Next step: `/architect`
Suggested prompt: `/architect choose the agent framework, retrieval strategy, streaming transport and persistence for docs/requirements.md and plan the slices`
