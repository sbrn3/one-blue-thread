---
name: plan
description: Design a significant Thread change before implementation, producing an evidence-backed interactive plan with user stories, exact file recipes, UI mockups when needed, verification, Smart Review, and tracer-bullet tickets for complex work.
---

# Plan

Plan only. Do not edit product code, install dependencies, commit, push, deploy,
or apply an event-log migration. Planning artifacts under `docs/plans/<slug>/`
are allowed.

Run the phases in order. `[always]` runs every time; `[UI only]` applies to
visible UI work. Phases 7–8 are conditional and live in
[references/complex-plans.md](references/complex-plans.md).

## Before Phase 1

1. Read `AGENTS.md`, `STATUS.md`, `ROADMAP.md`, the relevant part of `README.md`,
   the relevant sections of `../thread-plan_3.html` (the product spec), and
   recent `JOURNAL.md` entries and `docs/CONTEXT.md` if present.
2. Search `docs/plans/*/grill-summary.md`. Reuse the matching slug and folder;
   never create a second plan folder for the same work.
3. Read every companion evidence artifact in the folder — `grill-summary.md`,
   `level-up.md`, `mockup.html`. Confirmed decisions are inputs, not questions to
   repeat. The user's latest explicit statement beats a stale artifact label.
4. Inspect `git status`. Preserve unrelated work; keep planning changes inside
   the plan folder until approval.

## Phase 1 — Intent `[always]`

Resolve repository facts by inspection; ask only for product decisions that
materially change scope. Use a structured question tool when the host provides
one; otherwise one concise question at a time.

Write into the plan: the underlying problem and desired user outcome; hard
constraints and privacy boundaries; scope and non-goals; dependencies and
unresolved gates; plain-language acceptance criteria. When a grill summary
exists, treat its confirmed decisions as answered.

## Phase 2 — Implementation evidence and tokens `[always]`

Trace the real screens, data flow, tests, styles, the event-log schema, and
external boundaries (`TextProvider`, notifier, backup crypto, partner hand-off).
Cite exact paths and stable symbols, not invented architecture.

- For broad work, delegate up to three non-overlapping read-only exploration
  tasks in parallel (existing patterns; affected-file/caller map;
  dependencies/constraints) only if the user authorizes delegation. The main
  planner integrates and verifies.
- For UI work, read `src/ui/tokens.ts` yourself and record exact tokens, fonts,
  spacing, and radii. The reference palette/type is `docs/index.html`.
- Preserve the stack: Expo / React Native, Zustand, Reanimated, `expo-sqlite`,
  seeded PRNG. Do not introduce a framework, state library, or broad abstraction
  without an explicit decision.
- If the change touches the event-log schema, the PRNG / `trial_seed`
  determinism, notification scheduling, `reconcile()` replay, the backup crypto,
  or the partner hand-off, carry forward the §13.6 hard rules and the additive-
  only-migration constraint from `AGENTS.md` as explicit gates.

## Phase 3 — Requirements and traceability `[always]`

Write an extensive numbered list of observable user stories:

`<N>. As a <actor>, I want <behaviour>, so that <benefit>.`

Cover the golden path, every affected actor (the reader; the partner; the lab, as
a silent actor), loading/empty/error/retry states, accessibility, offline
behavior (Thread is offline-first — the WEB translation always works with no
network), and important edge cases (a missed day, a lapse, the 4 AM boundary,
year-one vs post-day-366). These story numbers are the traceability spine.

Also include **Out of scope** (adjacent work deliberately excluded and why) and
**Testing decisions** (public seams/modules to test; the closest existing
`test/*.test.ts` and fake patterns to follow; behavior deliberately not
unit-tested; manual on-device checks that Vitest cannot prove).

Do not pause for a separate requirements approval — the user reviews the whole
plan at Phase 9.

## Phase 4 — Aesthetics `[UI only]`

### Step 0 — Seven-layer extraction

Fill this table in `plan.html` from the real surface (`tokens.ts` + the screen's
`StyleSheet`):

| Layer | Current measured values/patterns | Source | Keep/change and why |
| --- | --- | --- | --- |
| Tokens | | | |
| Typography | | | |
| Spacing and layout | | | |
| Color and semantics | | | |
| Components and states | | | |
| Atmosphere and depth | | | |
| Motion and interaction | | | |

Do not draw until every row has evidence or an explicit `N/A` + reason.

### Step 1 — Direction questions

Record: **Intent** (what the surface should feel like; new pattern or extension);
**Hygiene** (exact `tokens.ts` values used); **Details** (pressed/active,
loading, empty, entry/exit, error, focus, small/large font-scale, reduced
motion).

### Step 2 — Mockups

- If a grill/level-up session already produced an approved direction, reuse it
  and record the decision. Don't manufacture three new options after the choice
  is settled.
- If a visual decision remains, create at least three structurally different
  directions in one `docs/plans/<slug>/mockup.html` (see
  [assets/mockup-template.html](assets/mockup-template.html)). Differences must be
  structural, not palette swaps.
- Mockups are HTML for iteration speed; the build is React Native `StyleSheet`.
  Keep every direction achievable with RN + `react-native-svg` + Reanimated.
- Synthetic data only, at representative volume.

### Step 3 — Direction gate

Do not proceed to the recipe until the user confirms a direction.

## Phase 5 — Exact implementation recipe `[always]`

Write an actionable recipe in `docs/plans/<slug>/plan.html` a fresh session can
execute without repeating research. For every file: mark `NEW` / `MODIFY` /
`DELETE`; cite the stable symbol and an approximate line; describe the precise
change and data/control flow; include focused code or pseudocode where it removes
ambiguity; name matching tests and acceptance criteria; call out risk against the
hard rules and the rollback implication.

Define ordered commits, dependency order, branch/worktree/PR strategy, and a
one-sentence rollback per slice. Use a sibling worktree for broad, risky,
multi-session, or 10+ commit work; a small clean single-session change stays on
`main`. Two or more active worktrees → separate branches, PR-ordered merges.

## Phase 6 — Verification `[always]`

### Automated

- focused matching tests (`npx vitest run test/<file>.test.ts`);
- `npm test` and `npm run typecheck` — the real ship gate, with CI's APK build.

### Manual

Automated + CI is the real gate; catching the rest on a dev build is the accepted
fallback.

- **Default:** one short "Owner spot-check (optional)" block — at most 3 bullets
  naming the riskiest observable behaviours to glance at on a dev build.
- **Mandatory itemised checklist only when** the change touches the event-log
  schema/migrations, PRNG determinism, notification scheduling, the backup
  crypto, or the partner hand-off. Then list every action and observable result,
  including failure/retry.

### Visual `[UI only]`

- **Default:** compare the built screen against the approved mockup on a dev
  build; confirm one narrow phone and one tablet width, reduced motion on.
- **Fuller matrix only when visually load-bearing** (new component, layout
  system, a new flow zone): small + large OS font scale, safe-area insets, focus
  order, reduced motion, touch targets, loading/empty/error/long-content.

### Plan audit `[complex only]`

Require an independent post-implementation review of the final diff against
`plan.html`. Fix HIGH and MEDIUM gaps before completion.

## Complexity gate `[always]`

Complex if any signal is true: five or more files affected; multiple layers
(e.g. schema + lab engine + UI, or notifier + state + UI); an event-log
migration, dependency update, or a change to a §13.6 invariant's mechanism; the
backup crypto or partner hand-off; ten or more commits or two or more
independently shippable phases.

If any fire, read [references/complex-plans.md](references/complex-plans.md)
completely and run Phase 7 Smart Review and Phase 8 tracer-bullet slicing before
approval. If none fire, go to Phase 9.

## Phase 9 — Authoritative artifact and approval `[always]`

1. Copy [assets/plan-template.html](assets/plan-template.html) to
   `docs/plans/<slug>/plan.html` and fill its `FILL` markers. Don't hand-roll a
   second visual system.
2. Every phase that ran must appear. Remove tabs/panels that don't apply.
3. Include status, owner/trigger, next action, scope, non-goals, dependencies,
   evidence, decisions, unresolved gates, ordered tickets/recipe, branching,
   commits, verification, documentation effects, and rollback.
4. Keep one authoritative plan. No parallel Markdown snapshot.
5. Keep `grill-summary.md` / `level-up.md` / rejected mockup directions through
   drafting and review. Only after explicit plan approval, and after verifying
   `plan.html` preserves every accepted decision, delete genuinely superseded
   scratch. Retain the approved mockup until the feature ships.
6. Update `docs/plans/README.md` and `STATUS.md` together only after the plan is
   active/approved. Use `/save-plan` if it is approved but intentionally
   deferred.
7. Present scope, file/commit count, estimate, Smart Review status, slice
   summary, aesthetics status, and a link to `plan.html`.
8. Request approval via the host's plan-approval mechanism, or ask plainly.
   Implementation begins only after explicit user approval.

## Completion boundary

Planning is complete only when the interactive plan is internally consistent, all
applicable gates ran, the user has reviewed it, and no unresolved product
decision is hidden inside an implementation ticket.
