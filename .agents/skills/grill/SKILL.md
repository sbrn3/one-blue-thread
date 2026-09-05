---
name: grill
description: Interview the user to sharpen an unresolved One Blue Thread design before planning, recording agreed vocabulary, hard-to-reverse decisions, and a temporary plan handoff without implementing code.
---

# Grill

Do not implement product code. Only `docs/CONTEXT.md`, `JOURNAL.md`,
`docs/plans/<slug>/grill-summary.md`, and the conversation may change.

1. Pick or reuse a short kebab-case slug. Use `docs/plans/<slug>/grill-summary.md`
   as temporary handoff state for `/plan`.
2. Model the subject as a decision tree. Ask the current frontier together;
   never ask a question whose prerequisite is still unresolved.
3. Resolve facts from the repository and `../thread-plan_3.html` before
   questioning the user. Fall back to reading source. Sub-agents only if the user
   explicitly authorizes delegation.
4. Use the host's structured question tool when available. Put the actual
   recommendation first and explain its tradeoff. Honor a request for one
   question at a time.
5. After each round:
   - add crystallized project terms to `docs/CONTEXT.md` (glossary only, no
     implementation detail — create it if absent);
   - record only hard-to-reverse, surprising-tradeoff decisions in `JOURNAL.md`
     in its existing entry format;
   - update `grill-summary.md` with resolved answers, terms, journaled
     decisions, and open threads.
6. Never duplicate a decision across the summary and the journal as separate
   durable records; the summary points at the journal entry and is deleted once
   `/plan` absorbs it.
7. When the frontier is empty, restate the shared understanding and ask the user
   to confirm it. Record the confirmed understanding, then hand off to `/plan`.
   Do not begin implementation.
