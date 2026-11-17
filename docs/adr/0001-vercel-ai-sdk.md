# 0001 — Vercel AI SDK as the agent framework

**Status:** accepted (2026-11-17, /architect round 1)

## Context
Three hard parts: a tool-calling loop against `gpt-6-luna`, token streaming to the browser with tool results interleaved, and client-side chat state. `gpt-6-luna` rejects function tools on `/chat/completions` (needs `/responses`). Budget ~3h.

## Decision
Use Vercel AI SDK v7: `streamText` + `tool()` + `stopWhen(stepCountIs(3))` in `apps/api`, the UI message stream piped through NestJS, `useChat` in `apps/web`. Verified live: 2 parallel tool calls + streaming in 3.5 s. SDK types stay at the edges (`assistant/infrastructure`, `web/chat`); we persist our own `Message` shape.

## Alternatives rejected
- **From scratch with `openai` SDK** — ~200 extra lines (tool loop, stream protocol, client parser), about an hour of a 3h budget with no Shopper-visible gain.
- **LangChain / Mastra** — Mastra brings its own server and storage that compete with NestJS; LangChain adds abstraction layers around a single tool loop.
- **assistant-ui / CopilotKit** — own the whole UI and (CopilotKit) a runtime backend, hiding the streaming and persistence logic the assignment asks us to explain.

## Consequences
Coupling to SDK v7 stream format between api and web (acceptable: same repo, pinned version). Persisted data is SDK-independent, so a later swap only touches two adapters.
