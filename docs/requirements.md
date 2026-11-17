# Requirements — AI Shopping Copilot

Source: `docs/assignment.md`. Terms: `GLOSSARY.md`. Decisions: `docs/ai-log/SESSION-LOG.md` (/product rounds 1–2).

## Catalog facts (checked live, 2026-11-17)
- 194 Products, 24 categories (incl. non-obvious ones: `vehicle`, `motorcycle`, `groceries`).
- Free-text search matches product text, not intent: `search?q=cheap` → 0 results. Vague words must be interpreted before querying.

## Behaviour rules
| # | Rule |
|---|------|
| R1 | **Never invent Products.** Every Product shown or named comes from a real Catalog query in this turn or earlier in the Conversation. |
| R2 | **Ambiguous Request** → search on a best-guess Assumption, state the Assumption in the reply, ask one follow-up question. |
| R3 | **Off-catalog Request** → say clearly the shop doesn't sell it; optionally suggest related Catalog Products (real ones, per R1). Something sold in the Catalog (e.g. "a car" → `vehicle`) is not off-catalog. |
| R4 | **Multi-intent Request** → one labelled Product Group per Search Intent, one combined text reply. |
| R5 | **Follow-up** → interpreted using earlier Messages of the same Conversation. |
| R6 | Price constraints ("under $500") are respected exactly: no Product above the limit is shown. |
| R7 | Each Product Group shows up to **4** Product Cards plus "N more match" when there are more. |
| R8 | If a search returns nothing, say so and suggest a broader alternative — never an empty group with no explanation. |
| R9 | Out-of-stock Products (`stock: 0`, 4 of 194) are never shown in search results. |
| R10 | A **Recommended Group** (S8, ADR 0004) never repeats a Product from the match group of the same Search Intent, obeys R6 and R9, and is left out when nothing is similar enough. |

## User stories and acceptance criteria

### US1 — Chat
As a Shopper I want to type what I'm looking for in plain language so that I don't have to browse categories.
- **AC1.1** Given an open Conversation, when I send a message, then it appears immediately in the thread and the input is cleared and disabled until the reply finishes.
- **AC1.2** Given an empty message, when I press send, then nothing is sent.

### US2 — Streaming replies
As a Shopper I want the reply to appear as it is written so that I'm not staring at a blank screen.
- **AC2.1** Given I sent a message, when the Assistant replies, then its text appears progressively (several visible updates), not all at once.
- **AC2.2** Given the reply is streaming, then a visible "thinking/typing" state is shown until it finishes.
- **AC2.3** Given the AI fails mid-reply, then the partial text stays, a clear error is shown with a **Retry** button, and the app stays usable.

### US3 — Product discovery
As a Shopper I want the Assistant to find relevant Products so that I get real options.
- **AC3.1** Given "show me smartphones", then a Product Group of smartphones is shown (R7).
- **AC3.2** Given "a phone under $500", then every shown phone costs ≤ $500 (R6).
- **AC3.3 (ambiguous)** Given "something cheap and cool", then Products are shown, the reply states the Assumption, and ends with one follow-up question (R2).
- **AC3.4 (off-catalog)** Given "a flight to Tokyo", then the reply says flights aren't sold here, and any suggested Products are real Catalog Products (R1, R3).
- **AC3.5 (multi-intent)** Given "a phone under $500 and a lipstick", then two labelled Product Groups are shown — phones ≤ $500 and lipsticks (R4).
- **AC3.6 (follow-up)** Given a previous reply showed phones, when I say "show me cheaper ones", then the new phones are cheaper than the cheapest shown before, or the reply says none exist (R5).
- **AC3.7 (no results)** Given a request with no matching Products, then the reply says so and suggests a broader search (R8).
- **AC3.9 (out of stock)** Given a search whose category contains an out-of-stock Product (e.g. Samsung Galaxy S8), then it never appears in the Product Group (R9).
- **AC3.10 (recommended)** Given "something for the beach" or a word the Catalog doesn't use ("cellphone"), then a "You might also like" group shows similar real Products, none repeating the matches and none above a stated price limit; given "a flight to Tokyo", no Recommended Group is shown (R10).
- **AC3.8 (catalog down)** Given the Catalog is unreachable, then the Assistant says it can't search right now — no invented Products, no crash.

### US4 — Product Cards in chat
As a Shopper I want results shown as cards so that I can compare them at a glance.
- **AC4.1** Each Product Card shows image, title, description (cut to 2 lines), price, rating, and a discount badge when discounted.
- **AC4.2** A Product Group shows its label and "N more match" when applicable (R7).
- **AC4.3 (Should)** Clicking a card opens a details popup (all images, full description, brand, stock); it closes with ✕ / Esc / backdrop click.
- **AC4.4 (Should)** "Show more" in a group (or asking the Assistant) shows the next Products of that group.
- **AC4.5** A broken image shows a placeholder, not a broken icon.

### US5 — Persistence
As a Shopper I want my chats kept after a refresh so that I don't lose them.
- **AC5.1** Given a Conversation with Messages and Product Groups, when I reload the page, then the same Conversation is open with the same text and cards.
- **AC5.2** Given the stored data is corrupted or unreadable, then the app still loads (starting fresh or skipping the bad Conversation) and does not crash.
- **AC5.3** Given storage is cleared mid-Conversation, then the next action does not crash; the Shopper either continues in a new Conversation or sees a clear notice.
- **AC5.4** Given storage is full / write fails, then the Shopper is told the chat may not be saved; the current session keeps working.

### US6b — Embedded copilot (design D14)
As a Shopper browsing the shop I want to open the copilot from any page so that I can ask without leaving.
- **AC6b.1** A floating ✦ button opens a chat window; ✕ closes it; on phones the window is full screen.
- **AC6b.2** The window shows past Conversations (☰), starts new ones (＋), and ⤢ opens the same Conversation as a full page.
- **AC6b.3** After a refresh the window reopens on the same Conversation if it was open.

### US6 — Conversation management
As a Shopper I want to start new chats and go back to old ones so that I can keep separate searches.
- **AC6.1** "New chat" starts an empty Conversation; the previous one stays in the list.
- **AC6.2** The list shows all Conversations, newest activity first, each with its Conversation Title (first message, ~40 chars).
- **AC6.3** Selecting a Conversation shows its full history including Product Cards, and a new message continues it with its context (R5).
- **AC6.4 (Could)** A Conversation can be deleted.

### US7 — Tests & evaluation
As the reviewer I want proof the core flow works so that I can trust the submission.
- **AC7.1** Automated tests, offline (fake AI + fake Catalog), cover: message in → Catalog query → streamed reply with Product Groups → persisted → reloaded.
- **AC7.2** A live eval set of ~6 cases (plain, price-limited, ambiguous, off-catalog, multi-intent, follow-up) runs against the real model and checks the rules R1–R6.
- **AC7.3** One command runs each suite; results are recorded in `docs/qa-report.md`.

## Scope (MoSCoW, ~3h)
- **Must:** US1, US2 (AC2.1–2.2), US3 (AC3.1–3.5, 3.7–3.9), US4 (AC4.1, 4.2, 4.5), US5, US6 (AC6.1–6.3), US7.
- **Should:** details popup (AC4.3), show more (AC4.4), Follow-ups (AC3.6), error + Retry (AC2.3), embedded widget shell (US6b — full page A is the Must fallback).
- **Could:** delete Conversation (AC6.4), stop-generation button.
- **Won't:** auth/accounts, cart/checkout, rename Conversations, LLM-generated titles, multi-language, deployment.

## Assumptions
- Single anonymous Shopper per machine; no auth.
- English only; prices in USD as given by the Catalog.
- Catalog data is trusted for display but treated as untrusted text by the Assistant (it can't give instructions).
