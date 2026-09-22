# Execute arrival-zone-progress-display

Grade: C2 — 8 files across two layers (`src/lab` engine config + `src/flow` UI),
one UI decision (already settled by `/grill`: hidden arm = fully removed, not
de-emphasized), single session.

## Protocol

Single session, no delegation. Read `AGENTS.md`, this file, `git status --short`,
and named files only.

## Standing decisions

- Branch: new branch `feat/arrival-zone-progress-visibility` off `main` (currently
  `8e44b58`), same worktree (`thread/` — clean as of this plan). No sibling
  worktree; small enough for one session.
- Two new reversal experiments join `src/lab/registry.ts`'s `REVERSAL_QUEUE`,
  appended after `E3`: **`E11` DAY-COUNT VISIBILITY** (Visible/Hidden of
  `ArrivalZone`'s "Day N in {Book}" line) and **`E12` SITTING-COUNT VISIBILITY**
  (Visible/Hidden of its "sitting X of Y" suffix). `E11` runs before `E12` —
  see `JOURNAL.md`'s 2026-09-22 "two new reversal experiments" entry for the
  full rationale; do not re-derive it here.
- Hidden arm = the line is not rendered at all (`E3`'s own convention), never
  de-emphasized/faded.
- Unverifiable steps: none expected — this is pure logic + conditional render,
  fully unit-testable without a device or a `Flow` renderer (which doesn't
  exist yet — see `STATUS.md` "Give the suite a real component renderer").

## Design finding carried into this recipe

`src/flow/Flow.tsx`'s existing `sealMode`/`floor`/`streak` reads (lines
~496-499) are **applied-setting-only**: `getProfile(db, key)`, no live check
against `exp_phases` for the *currently active* phase. Only `E7` has that live
check (`e7ArmBActive` in `src/notify/notifier.ts:25`) and a second one exists
for `E4`'s dose ladder (`src/lab/dose.ts:40`, a different concern). No
equivalent was found for `E1`/`E3`/`E4`-floor. If that holds, those three
reversal experiments have never actually varied what the reader sees during
their active phases — only after a verdict is Applied — which would make
their in-flight phase-to-phase comparison flat by construction. **That is a
pre-existing gap, out of scope here**: do not touch `E1`/`E3`/`E4`. But do not
repeat the pattern for `E11`/`E12` — wire a live per-phase check (mirroring
`e7ArmBActive`'s shape: applied-flag-first, else check the currently active
`exp_phases` row) so these two experiments produce a real signal from day one.

## Execution waves

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S01 | 1 | — | inline | `src/lab/registry.ts`, `src/lab/arrivalVisibility.ts`, `src/lab/analysis/report.ts`, `test/arrivalVisibility.test.ts`, `test/report.test.ts`, `test/lab.test.ts` |
| S02 | 2 | S01 | inline | `src/flow/ArrivalZone.tsx`, `src/flow/Flow.tsx` |

## S01 — Wire E11/E12 into the lab engine

Depends: none
Mode: inline
Budget: 6 files, ~3 new/extended test cases, <=10 turns
Owns: `src/lab/registry.ts`, `src/lab/arrivalVisibility.ts`, `src/lab/analysis/report.ts`, `test/arrivalVisibility.test.ts`, `test/report.test.ts`, `test/lab.test.ts`

### Files

- `src/lab/registry.ts` — MODIFY — extend `REVERSAL_QUEUE` from
  `['E7', 'E4', 'E1', 'E3']` to `['E7', 'E4', 'E1', 'E3', 'E11', 'E12']`;
  widen `ReversalExpId`. Add a short comment (matching the existing E7-first
  comment style) noting `E11`/`E12` are display-only, don't re-base the
  primary metric, so they trail.

- `src/lab/arrivalVisibility.ts` — NEW — two exported pure functions, same
  shape as `e7ArmBActive` (`src/notify/notifier.ts:25`):
  ```
  export function dayCountVisible(db: SqlDb, date: string): boolean
  export function sittingCountVisible(db: SqlDb, date: string): boolean
  ```
  Each: if `getProfile(db, '<key>')` is `'0'`, return `false` (applied:
  permanently hidden); if `'1'`, return `true` (applied: permanently visible);
  otherwise query `exp_phases` for that expId's currently `'active'` row and
  return `false` only if `arm === 'B'` and `date` falls inside
  `[start_date, end_date]` — default `true` (visible), matching today's
  unconditional behaviour before either experiment starts. Keys:
  `dayCountVisible` profile key for `E11`, `sittingCountVisible` for `E12`.

- `src/lab/analysis/report.ts` — MODIFY — add to all three lookup tables,
  same pattern as the `E1`/`E3`/`E4`/`E7` rows:
  - `ARM_LABELS.E11 = { A: 'Visible', B: 'Hidden', name: 'DAY-COUNT VISIBILITY' }`,
    `E12` analogous with `name: 'SITTING-COUNT VISIBILITY'`.
  - `RECOMMENDATION_TEMPLATES.E11/E12` — `A: 'Keep the day/sitting count visible.'`,
    `B: 'Keep the day/sitting count hidden — it wasn't earning its place.'`
    (wording is illustrative; keep it terse like the existing four).
  - `PROFILE_EFFECTS.E11 = (w) => ({ key: 'dayCountVisible', value: w === 'A' ? '1' : '0' })`,
    `E12` analogous with `key: 'sittingCountVisible'`.

### Tests

- `test/arrivalVisibility.test.ts` — NEW. Follow `test/util/testDb.ts`'s
  `openTestDb()` pattern (see `test/report.test.ts:6`). Cases per function:
  default visible with no profile row and no `exp_phases` row; applied `'0'`
  → hidden regardless of phase; applied `'1'` → visible even if a live B
  phase would otherwise hide it; live active `B` phase within date range →
  hidden; live active `A` phase → visible; date outside the active phase's
  `[start_date, end_date]` → visible (falls back to default).
- `test/report.test.ts` — MODIFY — extend the existing `SAMPLE_REVERSAL`-style
  cases (see the `E1` "Hold vs Tap" test at line 27) with one case each for
  `E11`/`E12` asserting `renderReversalReport` uses the new arm labels, and
  one `applyRecommendation`/`PROFILE_EFFECTS` case per new id (mirror
  whatever existing test covers `E3`'s `streakVisible` effect, if one exists;
  otherwise follow the `E1` `seal` effect test pattern).
- `test/lab.test.ts` — MODIFY — add `'E11'`, `'E12'` to the determinism loop
  at line 25 (`for (const exp of ['E1', 'E3', 'E4', 'E8'])`) so the seeded
  ABAB/BABA phase pattern is verified for the two new ids too.

### Stop inspecting when

- `REVERSAL_QUEUE`, the three `report.ts` lookup tables, and `test/util/testDb.ts`'s
  helper are located and understood; no need to read `dose.ts`/`ladder.ts` beyond
  what's already cited above.

### Verify

- `npx vitest run test/arrivalVisibility.test.ts test/report.test.ts test/lab.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- All three test files pass; `E11`/`E12` behave identically to `E1`/`E3`/`E4`/`E7`
  in every existing generic test that iterates `REVERSAL_QUEUE` or the lookup
  tables.
- Rollback: revert this commit; `REVERSAL_QUEUE`/`arrivalVisibility.ts` are
  additive and nothing else references `E11`/`E12` yet, so nothing else breaks.

## S02 — Wire ArrivalZone to the new visibility functions

Depends: S01
Mode: inline
Budget: 2 files, <=10 turns
Owns: `src/flow/ArrivalZone.tsx`, `src/flow/Flow.tsx`

### Files

- `src/flow/ArrivalZone.tsx` — MODIFY — add `showDayCount: boolean` and
  `showSittingCount: boolean` to `ArrivalZoneProps` (`:6-14`). In the
  component body (`:24-50`): when `showSittingCount` is `false`, compute
  `chapterLabel` as `${bookName(book)} ${chapter}` unconditionally (skip the
  `sittingsTotal > 1` branch at `:33-36`); when `showDayCount` is `false`,
  don't render the `styles.progress` `<Text>` at `:45-47` at all (return
  `null` for that line, not an empty string — matches `E3`'s "omitted, not
  faded" convention per `WeaveZone.tsx:15`).

- `src/flow/Flow.tsx` — MODIFY — near the existing `sealMode`/`floor`/`streak`
  applied-settings block (`:496-499`), import `dayCountVisible` and
  `sittingCountVisible` from `../lab/arrivalVisibility` and compute
  `const showDayCount = dayCountVisible(db, today);` /
  `const showSittingCount = sittingCountVisible(db, today);` (same
  "read fresh each render" comment pattern already documented at `:493-495`).
  Pass both as new props to `<ArrivalZone>` (`:525-533`).

### Tests

- No new test file — `Flow.tsx` has no renderer in the suite (`STATUS.md`
  "Give the suite a real component renderer" is still open); the logic this
  slice adds to `Flow.tsx` is a two-line pass-through of functions already
  unit-tested in S01, so nothing new needs proving here. `ArrivalZone.tsx`
  itself likewise has no existing test file to extend — if one exists by the
  time this runs, add cases for both props `true`/`false`; if not, this is
  the one deliberately-not-unit-tested seam (see Testing Decisions in
  `plan.html`).

### Stop inspecting when

- Both call sites are updated and the two new props thread through cleanly;
  no other consumer of `ArrivalZoneProps` exists (`ArrivalZone` is
  `Flow`-only — confirm with one grep before finishing).

### Verify

- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Types pass; the two new props are threaded and default to today's
  behaviour (both visible) whenever neither `E11` nor `E12` has an active `B`
  phase or an applied `'0'` — true for essentially all of this trial's
  remaining runway, since both sit at the tail of an ~11-month existing queue.
- Rollback: revert this commit; `ArrivalZoneProps` gains two unused-but-inert
  fields if reverted alone, or revert alongside S01 for a full rollback.

## Commits

1. `feat(lab): add E11/E12 reversal experiments for ArrivalZone progress lines` — S01
2. `feat(flow): gate ArrivalZone's day/sitting count on E11/E12` — S02
