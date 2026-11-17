# Design — AI Shopping Copilot

Decisions: SESSION-LOG `/designer` (D11–D16). Prototypes: `prototypes/` (open `prototypes/index.html`; each page has a **Scenarios** menu; deep links `#scenario=<key>`, `#conv=<id>`, `#product=<id>`, `#sidebar`, `#open`, `#list`).

## Chosen direction: **D on top of A**
- **Primary — D · Widget** (`prototypes/d-widget.html`): a shop page with a floating ✦ launcher (bottom-right). It opens a chat window (420×680 desktop, full screen below `sm`). Window header: ☰ conversations (slides over the chat) · title · ＋ new chat · ⤢ open full page · ✕ close. Product Groups render as a **carousel** (narrow window).
- **Full page — A · Classic** (`prototypes/a-classic.html`): persistent sidebar (drawer below `lg`) + chat column; Product Groups as a **grid** (2 / 3 / 4 columns). Reached via ⤢ (same Conversation) or directly at `/chat`.
- **Why:** a copilot embedded in a shop is the expected product shape (user's call), while the full page keeps conversation management fully visible and gives a wide grid for comparison. Both shells reuse the same chat and product components.
- **Fallback if time is short:** A only — D reuses everything in A plus a shell.
- **Rejected:** B (carousel everywhere — hides products past the edge on desktop), C (results panel — moves cards out of the chat, contradicting "rendered inside the chat"; most build cost). B's carousel survives inside the widget.

## Components (map to `docs/architecture.md` → Frontend)
| Component | Kind | Notes |
|---|---|---|
| `WidgetShell` | container | FAB + window + in-window `ConversationList`; open state + active Conversation id remembered (see State) |
| `PageShell` | container | sidebar `ConversationList` + `ChatView`; drawer below `lg` |
| `ShopPage` | container | host page: hero + product grid (`GET /api/products?limit=10`) reusing `ProductCard` |
| `ChatView` | container | messages + composer for one Conversation (`useShoppingChat`) — shared by both shells |
| `ConversationList` | presentational | items: title (first message ≤40 chars) + relative time; active highlighted |
| `MessageBubble` | presentational | user: right-aligned indigo bubble · assistant: ✦ avatar, tool status, off-catalog notice, groups, text, error |
| `ProductGroup` | presentational | header (label, "1–4 of N", Assumption chip) + cards (`layout: 'grid' \| 'carousel'`) + "N more match · Show more" |
| `ProductCard` | presentational | image (placeholder on error), discount badge ≥5%, title (1 line), description (2 lines), price, ★ rating |
| `ProductDetailsDialog` | presentational | gallery + thumbs, brand, title, price + struck original + %, rating, stock label, description, tags; bottom sheet below `sm` |
| `AssumptionChip`, `OffCatalogNotice`, `ToolStatus`, `TypingDots`, `ErrorBlock`, `EmptyState`, `Composer` | presentational | as in `prototypes/shared/components.js` |

## Scenario look (from the prototypes)
| Scenario | Look |
|---|---|
| Empty chat | ✦ mark, "What are you shopping for?", 4 example buttons (plain + the 3 tricky prompts) |
| Streaming | typing dots → "Searching: <label>…" pill per tool call → groups appear → text streams with an indigo caret; composer disabled ("Assistant is replying…") |
| Plain search | one group, "1–4 of 16", "12 more match · Show more" (Show more sends `Show more: <label>`) |
| Ambiguous (R2) | amber chip `💡 Assumed: …` in the group header; follow-up question at the end of the text |
| Off-catalog (R3) | neutral notice `🚫 Not sold here: flights` above an `Instead: …` group |
| Multi-intent (R4) | two labelled groups stacked, one text reply |
| Error (AC2.3) | partial text stays; rose alert "Something went wrong… Your message is saved." + **Retry** (regenerates the same message) |
| Broken image (AC4.5) | 📦 "No image" placeholder in the image box |
| Out of stock (R9) | never shown in results; details dialog still labels stock: In stock / Only N left / Out of stock |

## Tokens (Tailwind)
- Font: Inter 400/500/600/700. Base text `text-[15px]` messages, `text-sm` UI, `text-xs` meta.
- Neutrals: `zinc` (bg `zinc-50`, borders `zinc-200`, body `zinc-700`, meta `zinc-400/500`).
- Accent: `indigo-600` (user bubble, primary buttons, focus ring `ring-indigo-500`); brand gradient `from-indigo-500 to-violet-500`.
- Semantic: discount `rose-500`, Assumption `amber-50/800`, error `rose-50/800`, in stock `emerald-600`.
- Radius: cards/dialog `rounded-2xl`/`rounded-3xl`, chips `rounded-full`. Shadow: `shadow-sm` → `shadow-md` on hover; window `shadow-2xl`.
- Motion: 200–300 ms ease-out rise/fade/sheet; all disabled under `prefers-reduced-motion`.

## Responsive rules
| Width | Widget (D) | Full page (A) |
|---|---|---|
| < 640 (`sm`) | window = full screen; dialog = bottom sheet | sidebar drawer; grid 2 cols; dialog = bottom sheet |
| 640–1023 | floating window 420×680 | sidebar drawer; grid 3 cols |
| ≥ 1024 (`lg`) | floating window | persistent sidebar; grid 4 cols |
Safe-area padding on the composer (`env(safe-area-inset-bottom)`); `100dvh` heights; no horizontal page scroll (carousels scroll inside themselves).

## Accessibility
- Every card is a `<button>` with visible focus ring; images have `alt` = title; decorative icons `aria-hidden`.
- Dialog: `role="dialog"`, `aria-modal`, labelled by the title; focus moves to ✕ on open and returns to the card on close; Esc / ✕ / backdrop close.
- Widget: launcher has `aria-label`; Esc closes the in-window list; focus goes to the composer on open and back to the launcher on close.
- Error uses `role="alert"`; typing indicator has an `aria-label`; text contrast ≥ 4.5:1 (zinc-700 on white/zinc-50).

## State the UI keeps
- Server is the source of truth for Conversations (ADR 0003).
- Full page: active Conversation in the URL (`/chat/:id`).
- Widget: the shop URL can't carry it, so the **active Conversation id and open/closed state** live in `localStorage` (a pointer only). Cleared/corrupted → widget opens on a new chat; all Conversations are still in ☰.
