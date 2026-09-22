---
name: catch-me-up
description: Orient a new One Blue Thread session from a deterministic fact sheet (git state across worktrees, open issues/PRs, CI, doc drift) and hand back a short brief. Read-only by default; `--fix` also repairs stale docs, reclassifies feature-request bugs onto the roadmap, re-triages the roadmap, and batches real bugs.
---

# Catch me up

Facts come from a script; this skill only adds judgment. Default mode is
read-only and should finish in well under a minute.

## 1. Facts (one call)

```
node scripts/catch-me-up.mjs
```

Treat its output as true — do not re-run the git or `gh` commands it already
covers, and do not re-read `ROADMAP.md` or the plans ledger to re-check what its
"Doc drift" section reports. `--no-fetch` skips the network fetch if the user
asks for speed over freshness.

In parallel with the script, run `ListAgents` and note any other `thread*`
sessions. Do not message them or wait on them; the script's dirty-worktree flags
cover the "forgotten work" risk.

Read further only when the brief needs it: the top of `STATUS.md` (current phase)
if the fact sheet leaves "what shipped last" unclear, the newest `JOURNAL.md`
entry if the last session's context matters. `AGENTS.md` is already loaded via
`CLAUDE.md`.

## 2. Brief (hard cap ~180 words)

Only these sections. No preamble. One clause per bullet. Empty section → "none".

- **State** — up to 3 bullets: branch, what shipped last, anything dirty,
  divergent, or failing in CI (from the script's Flags / CI).
- **Other sessions** — one line per other `thread*` session from `ListAgents`,
  or "none".
- **Doc drift** — count plus the one or two that matter; mention `--fix`.
- **Bugs** — one line per open issue: `#n title — <=10-word read`, marking any
  that look like feature requests.
- **Roadmap** — top planned item and what's active now, one line each.
- **Next** — one recommended action. At most one alternative.

Stop here unless the user ran `/catch-me-up --fix` or asks for the triage.

## 3. `--fix` — repair and triage (writes allowed)

Only on a branch that starts at current `origin/main` (a fresh `docs/…` or
`chore/…` branch in its own worktree, or the checkout that holds an up-to-date
`main`). Never write these docs on an unrelated feature branch — each worktree
would drift its own copy. If no suitable checkout exists, say so and stop.

1. **Doc drift.** Fix each item the script reported: flip landed 🔨/📋 items to
   ✅ with the evidence inline, update `STATUS.md`'s Branch state and "Last
   updated", sync the STATUS Active plans list with `docs/plans/README.md`.
   Re-word surrounding prose that the flip makes false (e.g. "PR open"). Flag,
   don't guess, anything ambiguous — e.g. a plan folder intentionally left out of
   the ledger. Don't touch code, branches, or the §13.6 invariants.
2. **Feature requests out of the bug list.** For each open issue whose body
   describes a new capability or enhancement with no broken behaviour behind it:
   add one lean 📋 line to the right section of `ROADMAP.md` pointing at `#n`,
   then
   `gh issue close <n> --comment "Reclassified as a feature request during /catch-me-up triage — tracked in ROADMAP.md. No broken behaviour behind this; reopen if that's wrong."`
   Borderline cases are flagged, not closed.
3. **Re-triage the roadmap.** Re-order 📋 items by leverage and dependency
   (unblockers and cheap high-pain wins first), group related items into batches
   that could each ship as one plan, mark 🔨 now / 📋 next / 📋 later. Rewrite
   `ROADMAP.md` only if the order or grouping actually changed. Keep Shipped
   history intact.
4. **Batch the real bugs** into 2–4 groups by shared surface or root cause: issue
   numbers, one-line theme, size (S/M/L), and whether it fits an active plan.

Add to the brief: **Docs fixed** (one line per file), **Reclassified**
(`#n → ROADMAP section`), **Bug batches**. The cap rises to ~250 words.

Never expose the user's real reading data in the brief or in any command.
