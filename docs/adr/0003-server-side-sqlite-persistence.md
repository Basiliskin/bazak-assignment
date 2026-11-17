# 0003 — Conversations persisted server-side in SQLite

**Status:** accepted (2026-11-17, /architect round 2)

## Context
Conversations must survive refresh; the README must explain behaviour when storage is full, corrupted or cleared mid-conversation. No auth (single anonymous Shopper).

## Decision
SQLite file via Node's built-in `node:sqlite` (no native dependency). The client sends only the new message; the server loads history, so the LLM context cannot be tampered with from the browser. Active Conversation lives in the URL (`/c/:id`). Message payloads are validated with zod on read; corrupt rows are skipped and logged.

## Alternatives rejected
- **localStorage** — clearing site data loses everything mid-conversation; ~5 MB quota fills with Product Groups; client-sent history is tamperable.
- **IndexedDB** — same loss-on-clear problem with a clumsier API.

## Consequences
Everyone using the same server sees the same Conversation list (acceptable without auth; documented assumption). Adding users later = a `shopperId` column plus auth.
