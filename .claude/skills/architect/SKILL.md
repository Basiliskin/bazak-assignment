---
name: architect
description: Architect step for the AI shopping copilot assignment — chooses agent framework, LLM usage, DummyJSON retrieval strategy, streaming transport, persistence and test strategy, designs the NestJS/React structure along DDD lines and plans ordered vertical slices. Use after /product, or when structure/framework decisions need revisiting.
---

# /architect

Follow `.claude/skills/_shared/PROTOCOL.md` throughout.

## Goal
Produce `docs/architecture.md`, the shared contracts (types for messages, stream events, product cards, conversations), ADRs for hard-to-reverse choices, and an ordered list of vertical slices for `/developer`.

## Before proposing
- Read `docs/requirements.md`, `GLOSSARY.md`, SESSION-LOG.
- Verify the DummyJSON surface yourself (OpenAPI file in `docs/` if present, else `curl` the live API): which endpoints exist (`/products/search?q=`, `/products/categories`, `/products/category/{slug}`, `limit`/`skip`/`select`/`sortBy`/`order`), what search actually matches on, and that there is **no server-side price filter**. Write the findings down — the README retrieval section depends on them.
- Check what `gpt-6-luna` supports via the key in `.env` (tool/function calling, streaming, structured output, Decisions API) with a tiny script in the scratchpad — never print the key.

## Decision checklist (every item must be put to the user; options + recommendation; ≤3 per round)
1. **Agent framework** — from scratch with the OpenAI SDK vs. Vercel AI SDK vs. LangChain / Mastra vs. a UI kit (assistant-ui / CopilotKit). The README must reject **at least two** with concrete, assignment-specific reasons — make sure the user picks reasons they can defend.
2. **How the LLM drives retrieval** — tool calling (`search_products`, `list_categories`, …) in an agent loop vs. a fixed pipeline (classify/extract intent → query API → LLM writes the reply) vs. Decisions API for intent classification + chat model for the reply.
3. **Retrieval strategy** — which endpoints/params, category mapping vs. free-text search, client-side price filtering/sorting, result limits, and the exact behaviour for ambiguous / off-catalog / multi-intent / follow-up queries (must match requirements).
4. **Streaming transport & message shape** — SSE vs. fetch `ReadableStream` vs. WebSocket; how product cards travel in the stream (typed events such as `text-delta` / `products` / `done` / `error`) and how they are persisted as part of a Message.
5. **Persistence** — server-side (SQLite / JSON file) vs. browser (localStorage / IndexedDB) vs. both; behaviour when storage is full, corrupted, or cleared mid-conversation; what gets sent to the LLM as history (all vs. last N).
6. **Structure** — npm-workspaces monorepo (`apps/api`, `apps/web`, `packages/contracts`) vs. two folders; bounded contexts / Nest modules (e.g. `conversations`, `catalog`, `assistant`) and the ports between them (`LlmPort`, `CatalogPort`, `ConversationRepository`).
7. **Frontend** — Vite + React; data layer (TanStack Query vs. custom hooks); stream consumption hook; styling (CSS modules vs. Tailwind); conversation sidebar + chat + card list layout.
8. **Test & eval strategy** — what runs offline in CI (fake LLM + fake catalog, unit + e2e through the HTTP stream) vs. a small live LLM eval set (golden queries → expected tool calls/categories/behaviour) and how it is run.

## Output
- `docs/architecture.md`: context diagram (mermaid), folder tree, request flow for one chat turn (sequence diagram), stream event table, endpoint table, persistence + failure-mode table, DummyJSON findings, prompt/tool design.
- Contracts types in the agreed location.
- **Ordered vertical slices**, e.g. `S0 scaffold + tooling`, `S1 catalog adapter + tests`, `S2 assistant turn (LLM + tools) with fake LLM tests`, `S3 streaming endpoint + e2e`, `S4 conversations persistence + API`, `S5 web chat + stream hook`, `S6 product cards`, `S7 conversation sidebar`, `S8 eval suite`. Each slice: goal, files, acceptance criteria it satisfies, tests.
- ADRs for framework choice, retrieval approach and persistence (if they meet the ADR bar). Interview-prep + readme-notes entries. Log, commit docs.

## Hand off
➡️ Next step: `/developer`
Suggested prompt: `/developer S0 scaffold + tooling from docs/architecture.md`
