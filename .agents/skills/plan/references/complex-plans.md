# Phases 7–8 — complex plans only

Read this only when `SKILL.md`'s Complexity gate fired. Run both phases below, then return to Phase 9.

## Phase 7 — Smart Review

Spawn an independent read-only review agent to critique the plan. This skill explicitly authorizes that review delegation. Give it the full plan text and the minimum repository evidence needed to find gaps, risks, and integration issues. Rate each finding HIGH/MEDIUM/LOW. Integrate all HIGH and MEDIUM findings before slicing. Add a "Smart Review" section to the plan with the findings and fixes.

**This is not optional.** If you find yourself tempted to skip it, that's the sign you should do it.

### Model-use tagging

Once findings are integrated, walk every file and commit from Phase 5 and tag each with a tier. This is a plan-authoring decision, not a runtime instruction — it tells whoever executes the plan (you, later, or another session) where to spend reasoning budget and when to delegate:

- 🟢 **default** — routine work matching an existing pattern in the codebase (a standard screen, a new event type following one already reviewed in Phase 2, a Zustand slice like its neighbours). No tag.
- 🟡 **high-effort** — a design decision embedded in the implementation: an event-log migration shape, a change to the PRNG / `trial_seed` reconstruction, notification-window scheduling, `reconcile()` replay semantics, the backup crypto, a lab experiment's statistics, or anything Phase 2 flagged as having no existing pattern. Note *why* in one clause.
- 🔵 **subagent-required** — the item needs parallel research or isolated verification mid-implementation (e.g. "grep every caller of the log writer before changing a stamped field"). Name which agent type and why an inline read can't substitute.

Tag inline next to each file-block and commit (e.g. `— 🟡 high-effort: event-log migration shape`). Only high-effort and subagent items get an annotation. Summarize the counts for Phase 9's header badge (e.g. "2 high-effort, 1 subagent-required, rest default").

## Phase 8 — Slicing into Tickets

Cut the reviewed Phase 5 implementation (file blocks, commits) into **tracer-bullet slices** — narrow but complete cuts through every layer the feature touches (event types / log · lab or scheduler logic · state · screen · tests), each demoable on its own and sized to fit a single fresh context window. Group Phase 5's existing file blocks and commits by slice — don't rewrite them; a slice's implementation *is* the subset of Phase 5 content it covers.

For each slice, write:
- **Title** — short, descriptive
- **Blocked by** — which other slices (by number) must land first, or "None — can start immediately"
- **Delivers** — the end-to-end behaviour this slice makes work, one sentence
- **Acceptance criteria** — references to the specific Phase 3 user story numbers this slice satisfies (point at the numbers, don't restate the stories)
- **Model-use tier** — the highest tier among the files/commits this slice groups
- **Status** — not-started / in-progress / done

The `data-status` value committed in `plan.html` is the authoritative ticket status. Browser `localStorage` may provide a personal convenience view, but it must never be treated as project state. When implementation changes a slice status, update the source HTML as part of the same checkpoint.

Present the proposed breakdown to the user: granularity right (too coarse/too fine)? blocking edges correct? Iterate until approved. Phase 9's approval then covers the slices *and* their seams — there is no separate per-slice check later.

### Build loop

Once a slice's blockers are all `done` (the **frontier**), build it with a TDD red-green loop rather than writing all its code in one pass:

1. Write one failing test at a seam using the shared `/write-tests` skill when available, or its equivalent per-seam workflow (mock-pattern lookup against the closest existing test file, same review checklist) — never a whole-file test written blind after the fact.
2. Write the minimal code to pass it.
3. Repeat per seam until the slice's acceptance criteria are all met.
4. Don't refactor mid-loop — once the slice is green, invoke the shared `/code-review` skill when available, or an equivalent fixed-point review from the commit at the start of the slice, before marking it `done`. Confirmed Standards-axis fixes may be applied; Spec-axis findings return as judgement calls.

Mark the slice `done` once its acceptance criteria pass, then move to the next frontier slice. Phase 6's Verification checklist is the whole-feature rollup — run it once, after every slice is done, not per slice.

The **Tickets tab** in `plan.html` lists every slice as a card and computes the frontier live from blocking edges + status, so "what's ready to build next" is always visible without re-deriving it.
