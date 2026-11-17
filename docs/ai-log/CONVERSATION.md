### 2026-11-17T11:30:55.274Z : /chat — user

> why I get warning "Language server "plugin:typescript-lsp:typescript" couldn't start: its program "typescript-language-server" wasn't found. Check that it's installed
> and on your PATH. If you don't need it, disable the plugin that provides it."

### 2026-11-17T11:31:06.141Z : /chat — assistant

> You have the **`typescript-lsp` plugin** turned on in Claude Code. The plugin doesn't include a language server. It only starts one that you install yourself, the `typescript-language-server` program. I checked, and it isn't installed on your machine (`tsc` isn't either), so the plugin fails when Claude Code starts and shows that warning.
>
> **Fix: install it** (Node is already installed, at `/opt/homebrew/bin/node`):
>
> ```bash
> npm install -g typescript-language-server typescript
> ```
>
> Then restart Claude Code. The warning should go away, and Claude gets TypeScript features like go-to-definition, finding references and type errors.
>
> One thing to watch: you have two Node installs on your PATH, Homebrew (`/opt/homebrew/bin`) and nvm (`~/.nvm/versions/node/v24.21.0`). Homebrew comes first, so `npm` above installs into Homebrew, which is on your PATH, so this works. If you later switch with `nvm use`, global packages from the other install won't be visible. In that case, reinstall it under the active Node.
>
> **Or, if you don't need TypeScript features**, turn off the plugin with `/plugin` (find `typescript-lsp` and disable it), and the warning stops.

### 2026-11-17T11:32:20.410Z : /chat — assistant

> The setup is built and committed (`8855a8d`). I tested the hooks with fake input: secrets were hidden, answers were tagged with the right skill, and tool calls were left out.
>
> **What's in the repo:**
>
> - **Six skills** in `.claude/skills/`. They run in order: `/product` → `/architect` → `/developer <slice>` → `/qa` → `/readme` → `/interview`.
> - **One shared rules file**, `.claude/skills/_shared/PROTOCOL.md`, that every skill follows:
>   - Each decision comes as 2–3 options with one marked recommended, then the skill waits for your choice. At most 3 decisions per round.
>   - Every answer and decision gets written to `docs/ai-log/SESSION-LOG.md`.
>   - Each skill adds the interview questions its decisions will probably raise to `docs/interview-prep.md`.
>   - Each skill adds one-line notes to `docs/readme-notes.md`, which `/readme` uses later.
>   - Fixed facts are written in: `***REDACTED***` is the only model, the budget is about 3 hours, the repo is public, and the NestJS/React and SOLID/KISS/DRY/DDD rules apply.
> - **Checklists built from the README questions.** For example, `/architect` must ask you about the framework (with at least 2 rejected alternatives), how searches work, the three tricky query types, streaming, and saving chats including the failure cases. `/readme` drafts each of the 6 README sections from your logged decisions, and you approve or rewrite each one.
> - **Recording.** Two hooks write every prompt you type and Claude's final reply to `docs/ai-log/CONVERSATION.md`. Each entry has the time and the skill it belongs to; a plain answer like "agree" is tagged with the last skill you ran. Keys and `.env` values are replaced before saving.
> - **Commits.** `/developer` commits after each slice once its tests pass, and the other skills commit their docs. Every skill checks for keys before committing and never pushes unless you ask.
> - **Repo safety.** `.gitignore` covers `.env`, and `.env.example` lists only the variable names. `docs/assignment.md` no longer contains the key: that section was already gone when I went to remove it.
>
> **Two things to check:**
>
> - The hooks went live straight away. `CONVERSATION.md` already contains a question you asked in another session about a TypeScript language server warning, and it's in the first commit. Remove it before publishing if you don't want it public.
> - The OpenAPI file (`dummyjson_products_openapi.yaml`) still isn't in `docs/`. If you add it, `/architect` will use it; otherwise it checks the live API.
>
> ➡️ Next step:
>
> ```
> /product turn docs/assignment.md into requirements, acceptance criteria and a ~3h scope cut
> ```

### 2026-11-17T11:35:06.901Z : /product — user

> /product turn docs/assignment.md into requirements, acceptance criteria and a ~3h scope cut

### 2026-11-17T11:35:27.895Z : /product — assistant

> I checked the live catalog first. It has **194 products in 24 categories**, including some unexpected ones like `vehicle`, `motorcycle` and `groceries`. Searching for "cheap" finds **0 results**, so a vague request can't be passed straight to search; it has to be interpreted first. That shapes the first two decisions.
> 
> ---
> 
> ❓ **D1 — "Something cheap and cool" (vague request)**
> - (a) **Search with a best guess, say what was assumed, and ask one follow-up.** For example, it shows 4 low-priced, well-rated items such as sunglasses, a watch and a phone case, then asks: "I took 'cool' as trendy accessories under $30. Want a specific category or budget?" **(Recommended)**
> - (b) **Only ask a question first** ("What kind of thing, and what's your budget?") and show no products until the shopper answers.
> - (c) **Only guess, never ask.**
> 
> ➡️ (a). The shopper sees products right away, the assumption is visible, and you can explain it in the interview. Option (b) feels slow, and option (c) hides the guess.
> 
> ---
> 
> ❓ **D2 — "A flight to Tokyo" (request the shop can't help with)**
> - (a) **Say clearly that the shop doesn't sell this, and suggest a related item from the catalog.** For example: "I can't book flights. I only search this shop. For the trip, I can show luggage-friendly items like sunglasses or bags." **(Recommended)**
> - (b) **Plain refusal**, no products shown.
> - (c) **Always search anyway** and show whatever matches, such as nothing, or a random "vehicle".
> 
> ➡️ (a). It's honest about what the shop can do and still helps. Rule that comes with it: the assistant never makes up products. Every suggested item must come from a real catalog search. One edge case to note: "a car" is **not** off-catalog here, because a `vehicle` category exists.
> 
> ---
> 
> ❓ **D3 — "A phone under $500 and a lipstick" (two things in one message)**
> - (a) **One group of cards per item asked for**, each with its own heading, such as "Phones under $500 (3)" and "Lipsticks (3)", with one short reply covering both. **(Recommended)**
> - (b) **One mixed list** of phones and lipsticks together.
> - (c) **Handle only the first item** and ask "Want me to look for lipstick next?"
> 
> ➡️ (a). Each request clearly gets its own answer. This also decides how cards appear in a message (several labelled groups per reply), which `/architect` needs to know.
> 
> ---
> 
> Next round, after these: card content, how many cards, and what clicking does · conversation titles · no-login single user · the scope cut.

### 2026-11-17T11:37:34.117Z : /product — user

> agree to recomendations

### 2026-11-17T11:37:53.832Z : /product — assistant

> Logged. Here's round 2.
> 
> ---
> 
> ❓ **D4 — What a product card shows, how many, and what clicking does**
> The assignment requires a title, a short description, the price, and an image. The catalog also gives the rating, discount, brand and stock.
> - (a) **Required fields, plus the rating and a discount badge.** The description is cut to 2 lines. Up to **4 cards per group**, plus a line like "12 more match", and the shopper can ask "show more". Clicking a card **opens a details popup** with all images and the full text. **(Recommended)**
> - (b) **Required fields only**, up to 6 cards, and clicking does nothing.
> - (c) Like (a), but clicking **opens the product on dummyjson.com**. That page is just raw data, not a real shop page.
> 
> ➡️ (a). Four cards fit in a chat message without scrolling, the rating and discount help with "cheap" and "best" questions, and the popup costs very little because the data is already loaded. If time runs short, the popup is the first thing to drop.
> 
> ---
> 
> ❓ **D5 — Conversation title in the sidebar**
> - (a) **First message, cut to about 40 characters**, for example "a phone under $500 and a lipstick". **(Recommended)**
> - (b) **AI-written title** ("Phone & lipstick shopping"). It looks nicer but adds an extra model call and one more thing that can fail.
> 
> ➡️ (a). It's free, instant, and can't fail. An AI title can go under "with more time".
> 
> ---
> 
> ❓ **D6 — What's in and out for about 3 hours**
> - **Must:** chat; streaming replies; finding products, including the vague / can't-help / two-things behaviour; card groups in chat; chats kept after a refresh; new chat, chat list, continue an old chat; tests with a fake AI and fake catalog; a small live AI test set (about 6 example requests).
> - **Should:** the details popup; "show more"; follow-ups like "show me cheaper ones"; a clear error message with a "retry" button.
> - **Could:** delete a chat; a stop button while a reply is coming in.
> - **Won't:** login or accounts, cart or checkout, renaming chats, AI-written titles, multiple languages, deploying to a server.
> 
> ➡️ Confirm as listed, or move items between lists. Follow-ups like "cheaper ones" are in **Should** because they mainly depend on sending the chat history to the AI, which is cheap. Promoting them to Must is reasonable too.
> 
> ---
> 
> **Default (unless you object):** there are no accounts. Everyone using the app on this computer is the same anonymous shopper, and I'll note that as an assumption in the README.

### 2026-11-17T11:39:47.760Z : /product — user

> agree to recomendations
