---
name: plan
description: Grade and design a One Blue Thread change before implementation, using planning depth from an in-chat outline through an evidence-backed plan with isolated execution slices, UI mockups, review, and verification when warranted.
---

# Plan

Plan only. Do not edit product code, install dependencies, commit, push, deploy,
or apply an event-log migration. Planning artifacts under `docs/plans/<slug>/`
are allowed.

Classify the change first. C0-C1 stop after the proportionate lightweight
output below. C2-C4 run Phases 1-6 and 9. C3-C4 also read
[references/complex-plans.md](references/complex-plans.md) for slicing and
execution waves; C4 also runs Smart Review. `[UI only]` applies to visible UI.

## Complexity grade `[always]`

Choose the highest matching grade. File counts guide; risk overrides size.

| Grade | Signals | Output |
| --- | --- | --- |
| C0 Patch | 1-2 files; obvious behavior; no product decision or protected mechanism | No durable plan. State intent, change, focused test, and gate. |
| C1 Scoped | 3-4 files; one layer; one session; established pattern | Brief in-chat scope, files, risks, and verification. No delegation or ledger. |
| C2 Structured | 5-9 files; two layers; UI decision; or 2-3 shippable slices | `plan.html`, `exec.md`, and `PROGRESS.md`; fresh session per slice. |
| C3 Parallel | 10-24 files; 3+ layers; or 3-6 slices with disjoint ownership | C2 artifacts plus execution waves, bounded delegation when justified, worktree/branch plan, and integration gate. |
| C4 Programme | 25+ files; 7+ slices; high uncertainty; or protected mechanism change | C3 plus Smart Review, independent final audit, rollback gates, and post-build `OUTCOME.md`. |

Event-log migrations, PRNG determinism, notification scheduling, backup crypto,
partner hand-off, destructive reset, and dependency migrations are C4 minimum.
New cross-layer persistent state is C3 minimum. UI requiring direction mockups is
C2 minimum. If uncertainty plausibly raises scope one grade, use the higher
grade. Record the grade and triggers. If later evidence crosses a boundary,
re-grade and re-slice before approval or implementation.

## Before Phase 1

1. Read `AGENTS.md`, inspect `git status`, and locate only the affected symbols,
   callers, and closest tests needed to assign a provisional grade. Preserve
   unrelated work.
2. For C0-C1, state the grade and its triggers, produce the table's lightweight
   output, and stop. Escalate if inspection crosses a grade boundary.
3. For C2-C4, read `STATUS.md`, `ROADMAP.md`, the relevant part of `README.md`,
   only the relevant sections of `../thread-plan_3.html`, recent relevant
   `JOURNAL.md` entries, and `docs/CONTEXT.md` if present.
4. Search `docs/plans/*/grill-summary.md`. Reuse the matching slug and folder;
   never create a second plan folder for the same work.
5. Read every companion evidence artifact in the folder — `grill-summary.md`,
   `level-up.md`, `mockup.html`. Confirmed decisions are inputs, not questions to
   repeat. The user's latest explicit statement beats a stale artifact label.
6. Keep planning changes inside the plan folder until approval.

## Phase 1 — Intent `[always]`

Resolve repository facts by inspection; ask only for product decisions that
materially change scope. Use a structured question tool when the host provides
one; otherwise one concise question at a time.

Write into `plan.html`: the underlying problem and desired user outcome; hard
constraints and privacy boundaries; scope and non-goals; dependencies and
unresolved gates; plain-language acceptance criteria. When a grill summary
exists, treat its confirmed decisions as answered.

## Phase 2 — Implementation evidence and tokens `[always]`

Trace the real screens, data flow, tests, styles, the event-log schema, and
external boundaries (`TextProvider`, notifier, backup crypto, partner hand-off).
Cite exact paths and stable symbols, not invented architecture.

- For provisional C3-C4 work, delegate up to three non-overlapping read-only
  exploration tasks only if the user authorizes it. Give each worker one bounded
  question and no full conversation history; the main planner integrates and
  verifies a result of at most 150 tokens.
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

Write a numbered list of observable user stories proportionate to the grade:
C2 covers every affected state; C3-C4 also exhaustively cover cross-layer seams,
protected mechanisms, and slice integration.

`<N>. As a <actor>, I want <behaviour>, so that <benefit>.`

Cover the golden path, every affected actor (the reader; the partner; the lab, as
a silent actor), loading/empty/error/retry states, accessibility, offline
behavior (One Blue Thread is offline-first — the WEB translation always works with no
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

For C2-C4, copy
[references/exec-template.md](references/exec-template.md) to
`docs/plans/<slug>/exec.md` and make it executable without repeating research.
For every file: mark `NEW` / `MODIFY` / `DELETE`; cite the stable symbol and an
approximate line; describe the precise change and data/control flow; use
signatures or short pseudocode, never complete code bodies; name matching tests
and acceptance criteria; call out hard-rule risk and rollback.

Define ordered commits, dependency order, branch/worktree/PR strategy, and a
one-sentence rollback per slice in `exec.md`. Use a sibling worktree for broad,
risky, multi-session, or 10+ commit work; a small clean single-session change
stays on `main`. Two or more active worktrees → separate branches, PR-ordered
merges. Record missing authorization as a gate; plan approval alone does not
authorize commit, push, PR, merge, or deploy.

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

### Plan audit `[C4 only]`

Require an independent post-implementation review of the final diff against
`plan.html` and `exec.md`. Fix HIGH and MEDIUM gaps before completion.

## Grade confirmation `[always]`

After Phase 5, confirm the grade against the evidenced file count, layers,
slices, uncertainty, and protected mechanisms. C2 proceeds to Phase 9. C3-C4
read [references/complex-plans.md](references/complex-plans.md) completely and
apply the matching sections before Phase 9.

## Phase 9 — Authoritative artifact and approval `[always]`

1. Copy [assets/plan-template.html](assets/plan-template.html) to
   `docs/plans/<slug>/plan.html` and fill its `FILL` markers. Keep detailed file
   recipes, commands, commits, and live status in `exec.md`, not the HTML.
2. Create `PROGRESS.md` with the plan title and the format
   `SNN status | files N | focused result | suite result | types result | gap …`.
   Do not create `OUTCOME.md`; C4 execution creates it once at completion.
3. Every phase that ran must appear. Remove tabs/panels that don't apply.
4. Include approval status, owner/trigger, next action, grade, scope, non-goals,
   dependencies, evidence, decisions, unresolved gates, verification,
   documentation effects, and a link to `exec.md`.
5. Keep one authority per concern: `plan.html` owns approved intent and scope;
   `exec.md` owns execution; `PROGRESS.md` owns live status; C4's eventual
   `OUTCOME.md` owns final results. Do not duplicate their content.
6. Keep `grill-summary.md` / `level-up.md` / rejected mockup directions through
   drafting and review. Only after explicit plan approval, and after verifying
   `plan.html` preserves every accepted decision, delete genuinely superseded
   scratch. Retain the approved mockup until the feature ships.
7. Update `docs/plans/README.md` and `STATUS.md` together only after the plan is
   active/approved. Use `/save-plan` if it is approved but intentionally
   deferred.
8. Present grade, scope, file/commit count, estimate, applicable review status,
   slice summary, aesthetics status, and links to `plan.html` and `exec.md`.
9. Request approval via the host's plan-approval mechanism, or ask plainly.
   Implementation begins only after explicit user approval.

## Completion boundary

Planning is complete only when the grade-appropriate artifacts are internally
consistent, applicable gates ran, the user reviewed them, and no unresolved
product decision is hidden inside an execution slice.
