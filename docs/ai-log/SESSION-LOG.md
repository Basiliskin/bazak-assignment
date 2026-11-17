# Session Log

Decisions per skill run. Raw prompts and replies are captured automatically in `CONVERSATION.md` (hooks added during the first session below, so that session is recorded here by hand).

## 2026-11-17 13:21 : /grill-with-docs-simple — skill-team setup

**User input:**
> @docs/assignment.md - this is home assigment for Job position
>  - Time: it should take around 3 hours.(its not limited but still its assignment not production grade product we are building !)
>  - typescript/react/nestjs
>  - I need skills for this home assigment task - product/architect/developer/qa/interviewer/readme(what ever you think is needed to make this)
>  - its important that all communications of skill with claude code be recorded - datetime : skill X - prompt - all user inputs
>  - must follow SOLID/KISS/DRY/DDD and best practices for nestjs and react
>  - the final result will be published to public repo
>  - important - each skill must propose best suiutable sulutions and user will choose or write his own
>  - other assignment skills setup which I passed - /Users/dimitrykatz/workspace/Projects/roeto-assignment/.claude

**Options offered:**
- Q1 Base: copy the roeto-assignment structure and rewrite content (rec.) / design from scratch.
- Q2 Skills: product → architect → developer → qa → readme → interview, no designer (rec.).
- Q3 Recording: (a) prompts + decision log / (b) (a) + Claude's final reply per turn (rec.) / (c) full raw transcripts.

**User input:**
> agree to recomendations

**Decision:** Q1 copy-and-rewrite roeto structure · Q2 six skills, no designer (UI decisions go to /architect) · Q3 (b).

**Options offered:**
- Q4 Redact secrets in logs (key pattern + `.env` values) (rec.) / no redaction.
- Q5 Built-in per-skill checklists derived from the README questions, nothing pre-chosen (rec.) / free-form skills.
- Q6 Interview prep: (a) only at the end / (b) each skill appends likely questions to `docs/interview-prep.md`, `/interview` uses them (rec.) / (c) quiz after each skill.

**User input:**
> agree to recomendations

**Decision:** Q4 redact · Q5 checklists · Q6 (b).

**Options offered:**
- Q7 Commits: (a) skills never commit / (b) `/developer` commits per green slice, other skills commit their docs (rec.) / (c) one commit at the end.
- Defaults: git init + key removed before first commit; skills in project `.claude/`; outputs requirements/architecture/qa-report/ai-log/adr as in roeto; `/product` owns `GLOSSARY.md`; fixed facts gpt-6-luna only + ~3h budget; test-first developer with NestJS/React bar.

**User input:**
> agree and confirm

**Decision:** Q7 (b); all defaults accepted.

**Artifacts:** `.claude/settings.json`, `.claude/hooks/{log-prompt,log-reply}.mjs`, `.claude/hooks/lib/ai-log.mjs`, `.claude/skills/{_shared/PROTOCOL.md,product,architect,developer,qa,readme,interview}`, `.gitignore`, `.env.example`, this log, `docs/interview-prep.md`.

**Next step:** `/product turn docs/assignment.md into requirements, acceptance criteria and a ~3h scope cut`

## 2026-11-17 13:45 : /product — query-behaviour rules (round 1)

**User input:**
> turn docs/assignment.md into requirements, acceptance criteria and a ~3h scope cut

**Facts checked:** live DummyJSON has 194 products, 24 categories (incl. `vehicle`, `motorcycle`, `groceries`); `/products/search?q=cheap` → 0 results (vague words cannot be passed straight to search).

**Options offered:**
- D1 Ambiguous ("something cheap and cool"): (a) best-guess search + state assumption + one follow-up question (rec.) / (b) clarify first, no products / (c) guess silently.
- D2 Off-catalog ("a flight to Tokyo"): (a) clear "not sold here" + related catalog suggestion (rec.) / (b) plain refusal / (c) search anyway.
- D3 Multi-intent ("a phone under $500 and a lipstick"): (a) one labelled card group per intent (rec.) / (b) single merged list / (c) first intent only.

**User input:**
> agree to recomendations

**Decision:** D1 (a) · D2 (a), plus the rule "never invent products — every shown product comes from a real catalog query" · D3 (a).
**Artifacts:** none yet.

## 2026-11-17 13:55 : /product — cards, titles, scope (round 2)

**Options offered:**
- D4 Cards: (a) required fields + rating + discount badge, ≤4 per group + "N more", click → details popup (rec.) / (b) required only, 6 cards, no click / (c) as (a) but click opens dummyjson.com.
- D5 Conversation Title: (a) first message cut to ~40 chars (rec.) / (b) LLM-generated.
- D6 MoSCoW: Must = core 7 capabilities + offline tests + ~6-case live eval; Should = popup, show more, follow-ups, error+retry; Could = delete, stop button; Won't = auth, cart, rename, AI titles, i18n, deploy.
- Default: no accounts, single anonymous Shopper.

**User input:**
> agree to recomendations

**Decision:** D4 (a) · D5 (a) · D6 as listed · default accepted.
**Artifacts:** `GLOSSARY.md`, `docs/requirements.md`, `docs/interview-prep.md`, `docs/readme-notes.md`.
**Next step:** `/architect choose the agent framework, retrieval strategy, streaming transport and persistence for docs/requirements.md and plan the slices`
