---
name: save-plan
description: Reconcile a completed Thread plan with the plan ledger and project status so it stays findable, correctly ordered, and clearly unimplemented.
---

# Save plan

For a plan the user wants retained for later. Updates planning documentation
only — no implementing, committing, pushing, or deploying.

1. Identify the canonical plan at `docs/plans/<slug>/plan.html`. Confirm its
   status, trigger/owner, next action, dependencies, verification gates, and any
   unresolved product decisions.
2. Read `STATUS.md`, `ROADMAP.md`, and `docs/plans/README.md` (create the last
   one if this is the first saved plan — a short table: slug, one-line intent,
   status, next action). Determine ordering from dependencies, overlapping
   files, risk against the §13.6 hard rules, and current priorities. Do this
   analysis locally unless the user asks for delegation.
3. Update the plan's row in `docs/plans/README.md`, or add one. Keep it
   authoritative and concise.
4. Keep `STATUS.md`'s Active Plans table synchronized. Add the plan to Next
   Actions only if it is genuinely among the immediate priorities.
5. Update `ROADMAP.md` only when the feature's roadmap status or ordering
   changed. Roadmap lines stay one sentence + a pointer.
6. Inspect the diff for duplicate plans, stale status, or stray generated
   artifacts. Report the saved path, status, ordering rationale, and the exact
   next invocation.

Never create a separate memory file or a parallel planning location. The
repository documents are the shared source of truth.
