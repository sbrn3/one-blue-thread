---
name: improve-codebase-architecture
description: Inspect One Blue Thread for high-leverage module-deepening opportunities, present verified candidates, and hand the selected architectural decision to grill and plan without implementing it.
---

# Improve codebase architecture

The goal is testability and locality, not abstraction for its own sake. Analysis
only.

Use this vocabulary consistently: **module** (interface plus implementation),
**interface** (everything callers must know), **seam** (where behavior can vary),
**adapter** (one implementation at a seam), **depth** (behavior delivered per
unit of interface), **leverage**, and **locality**.

1. Read `AGENTS.md`, `docs/CONTEXT.md` if present, relevant recent `JOURNAL.md`
   decisions, `git log`, source, and tests. Weight repeatedly-changed areas
   unless the user named a scope. One Blue Thread's natural seams already exist
   (`TextProvider`, the log driver, the PRNG, the notifier) — look at how well
   they hold, not just where to add more.
2. Look for shallow pass-through modules, leaking seams (e.g. `local_date` logic
   duplicated in callers instead of the writer), knowledge repeated across
   callers, and tests forced to reach through the public interface. Apply the
   deletion test: if deleting the module merely redistributes its complexity it
   may be earning its keep; if complexity disappears, it is shallow.
3. Do not invent an interface where only one adapter exists and no behavior
   varies. Do not re-propose a decision the plan (`../thread-plan_3.html`) or
   `JOURNAL.md` already rejected without new evidence.
4. Produce a self-contained HTML report in the OS temp directory, never the
   repo. Each candidate: files, before/after structure, problem, solution,
   depth/locality wins, recommendation strength, and conflicts with prior
   decisions or the §13.6 hard rules. Synthetic data only. Opening it in a GUI
   needs approval.
5. End with one top recommendation and ask which candidate to explore. Don't
   prescribe detailed interfaces yet.
6. For the selected candidate, use `/grill` to settle seam placement,
   constraints, adapters, tests, and rejected alternatives, then `/plan` for
   implementation. This skill does not edit product code.
