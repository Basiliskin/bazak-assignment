---
name: readme
description: README step for the AI shopping copilot assignment — writes README.md answering the six required sections (setup, architecture & framework choice, retrieval strategy, conversation & state, evaluation, known limitations) in the candidate's own words, drafted one section at a time from the recorded decisions and approved by the user. Use after /qa, or to refresh one README section, e.g. "/readme retrieval".
---

# /readme [section]

Follow `.claude/skills/_shared/PROTOCOL.md` throughout.

## Goal
A short, honest `README.md` that a reviewer can read in 5 minutes and that the candidate can defend line by line. The assignment demands answers "in your own words" — every section is the user's to approve or rewrite.

## Sources (read all before drafting)
`docs/readme-notes.md`, `docs/ai-log/SESSION-LOG.md`, `docs/requirements.md`, `docs/architecture.md`, `docs/adr/*`, `docs/qa-report.md`, `package.json` scripts, `.env.example`. Every claim must match the code — check it.

## Sections (required by the assignment)
1. **Setup and run** — prerequisites, `.env` from `.env.example`, install, run, test, run evals. Verify each command actually works.
2. **Architecture & framework choice** — what was picked and **at least two rejected alternatives with concrete, assignment-specific reasons** (from SESSION-LOG / ADRs).
3. **Retrieval strategy** — endpoints and params used and why; behaviour on ambiguous ("something cheap and cool"), off-catalog ("a flight to Tokyo") and multi-intent queries.
4. **Conversation & state** — where persistence lives and why; what happens when storage is full, corrupted, or cleared mid-conversation.
5. **Evaluation** — what the suites verify end-to-end, which regressions they catch, what slips through.
6. **Known limitations** — where it underperforms today; what to do with another week.
Plus a short **How this was built** section linking `docs/ai-log/` (prompt/decision record) and the skills in `.claude/skills/`.

## Loop
For each section (or only the one passed as argument):
1. Show the key points found in the sources and ask the user to confirm/correct them — **wait**.
2. Offer two drafts: (a) terse bullets, (b) short prose — both in plain first-person language, no marketing tone. Recommend one. **Wait**; the user picks, edits, or writes their own.
3. Write the approved text into `README.md`; log in SESSION-LOG.
Keep the whole README short; diagrams only if they replace text. Commit when done.

## Hand off
➡️ Next step: `/interview`
Suggested prompt: `/interview`
