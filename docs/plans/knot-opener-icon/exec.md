# Execute: Knot opener icon, settings IA, translation switch

Grade: C3 — ~21 files, 3 layers (knot UI · text/services · lab confound/log type),
two independently shippable deliverables. No event-log migration (a new event
*type* is additive), no PRNG, notification or backup-crypto change, so not C4.

## Protocol

Use one fresh session per slice. Read only `AGENTS.md`, this protocol, the slice,
`git status --short`, `git log --oneline -5`, and named files. Do not read
`plan.html`, other slices, project status/history, or the full product spec
unless the slice names that dependency. Append one bounded `PROGRESS.md` entry,
return at most 150 tokens, and stop.

Budgets: slice target <=1,200 tokens, hard limit 2,000; progress entry <=80;
worker result <=150. Inspect narrowly: list paths first, search bounded symbols,
read line ranges, show quiet test output. Never read `../thread-plan_3.html` whole.

Red-green: write the failing test first where a test is listed, see it fail for
the right reason, then implement. Gate for every slice: focused test, then
`npm test -- --reporter=dot 2>&1 | tail -5`, then `npm run typecheck`.

## Standing decisions

- **Branch/PR policy (UNRESOLVED GATE — needs explicit authorization before any
  commit/push):** proposed `feat/knot-opener-icon` for S01 (PR 1, no key
  dependency, ships first); `feat/knot-translation-switch` branched from `main`
  *after* PR 1 merges for S02-S05 (PR 2), because S04 edits `Knot.tsx`, which S01
  also owns. S02 and S03 touch no S01 file and may be built before PR 1 merges.
- Unverifiable steps: record a gap; never claim a pass. S05's live NIV/ESV
  round-trips need real keys the owner must obtain; until then PR 2 is not
  mergeable.
- Cross-slice integration owner: inline task, run by the coordinator.
- Privacy: tests and fixtures use fake keys (`'test-key'`) and a fake `fetchFn`;
  never a real key (AGENTS.md).
- Translation code-level recipes already exist: **S02-S05 take their symbol-level
  recipes from `docs/plans/knot-translation-switch/plan.html`, Implementation tab**
  (a named dependency). This file records only the deltas that this redesign
  imposes on it.

## Execution waves

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S01 | 1 | — | inline | `src/knot/Knot.tsx`, `src/knot/MoreSection.tsx`, `src/knot/KnotIcon.tsx`, `src/knot/ResetSection.tsx`, `src/knot/issueLink.ts`, `test/issueLink.test.ts`, `test/ui-contracts.test.ts`, `docs/CONTEXT.md` |
| S06 | 2 | S01 | inline | `src/cue/index.ts`, `src/flow/Flow.tsx`, `src/knot/Knot.tsx` (cue state only), `test/cue.test.ts` |
| S02 | 1 | — | inline | `src/log/types.ts`, `src/lab/confound.ts`, `src/text/esv.ts`, `test/confound.test.ts`, `test/esv.test.ts` |
| S03 | 2 | S02 | inline | `src/text/translationService.ts`, `test/translationService.test.ts`, `src/services/index.ts`, `App.tsx`, `src/onboarding/OnboardingFlow.tsx` |
| S04 | 3 | S01, S03 | inline | `src/knot/TranslationSection.tsx`, `src/knot/MoreSection.tsx` (Translation row), `test/ui-contracts.test.ts` (allowlist) |
| S05 | 4 | S04 | inline | `src/text/apiBible.ts` (comment), `README.md`, `STATUS.md`, `docs/plans/README.md` |

S01 and S02 are disjoint but each is under four files of similar work, so the
parallel-delegation threshold is not met. Run serially inline.

## S01 — Gear opener and re-ordered knot

Depends: none  
Mode: inline  
Budget: 8 files, 2 test files, <=12 turns  
Owns: see waves table

### Files

- `src/knot/KnotIcon.tsx` — NEW — `KnotIcon({ size?: number, color?: string })`: a
  24-unit-viewBox gear drawn with `react-native-svg` (`Svg`/`Path`/`Circle`), stroke
  only, no fill, defaulting to `tokens.color.ink60`. No import from `src/lab`.
- `src/knot/Knot.tsx` — MODIFY:
  - Opener `Pressable` (line ~207): replace the `Knot` text + pill with `<KnotIcon>`
    in a 44×44 (`tokens.control.minTarget`) circular hit area, keeping the
    translucent paper background so it holds over scripture, the safe-area
    `top`/`right` inline offsets, `zIndex: 200`, and `openerRef`. The attention dot
    becomes a small madder badge positioned at the gear's top-right corner,
    rendered only when `openerAttention` (no resting grey dot). Delete
    `buttonLabel` and the old `buttonDot` resting style.
  - `accessibilityLabel`: `'Open settings: weave, practice, and more'`, suffixed
    `' — needs attention'` when `openerAttention`.
  - Delete the `promoted` state, its setter call in `handleOpen`, both promoted
    `DisclosureSection` blocks (lines ~261-286), and the `promoted` prop passed to
    `MoreSection`. Keep the `moreSections.safekeeping/support` seeding in
    `handleOpen` **only if** the rows should stay collapsed — they must, so set
    both to `false` (remove the seeding; initial state already `false`, but
    `handleOpen` must also reset them to `false` so a prior open doesn't persist).
  - Everyday-tier order after the paused banner: weave → Practice (the cue) →
    ChapterStrip → "More". Update the `More` `status` string to
    `'Settings, safekeeping, support, starting over'` and the doc comment at line
    ~42 (it still describes promotion and the translation parking).
  - Remove now-unused imports (`BackupSection`, `DiagnosticsSection`).
- `src/knot/MoreSection.tsx` — MODIFY: drop the `promoted` prop and both
  `promoted !== …` guards (Safekeeping and Support always render in place). Reorder
  groups to **Practice → Your data → About** and items to Sealing, Partner,
  Adaptive policy | Safekeeping, Starting over | Study library, Origin story,
  Support. Group label text per the naming decision in plan.html (default:
  rename this group `Preferences` so it no longer collides with the everyday
  tier's `Practice` cue disclosure). Keep `status`/`attention` on Support only.
  **Safekeeping loses its `status`/`attention` props** (owner: backup is not a priority) —
  a plain collapsed row, ordered above Starting over. Automatic snapshots are unchanged.
  In `Knot.tsx`, `refreshOpenerAttention` and the open-time read use
  `hasSupportAttention(db)` / `needsAttention(support)` only; remove the
  `snapshotAttentionNeeded`/`externalAttentionNeeded` terms and the now-unneeded
  `backup.status()` read on open. `BackupSection` itself is untouched.
- `src/knot/Knot.tsx` (same file, reset fix) — wrap the sheet's contents inside
  the `<Modal>` in `<GestureHandlerRootView style={{ flex: 1 }}>`. On Android an RN
  `<Modal>` is a separate native window; the app's single root-level
  `GestureHandlerRootView` (App.tsx:35) does not cover it, so
  `ResetSection`'s `Gesture.LongPress` (the only gesture inside any modal; the seal's
  lives in Flow, outside one) likely never fires. This is the leading hypothesis for
  "Start over doesn't work"; it cannot be proven without a device.
- `src/knot/ResetSection.tsx` — MODIFY: in `run()`'s pre-wipe `catch`, keep the
  error message in state and render "Couldn't start over — nothing was erased:
  {message}" instead of silently collapsing back to the sheet, so a failing native
  step (`cancelAllScheduledNotificationsAsync`, snapshot/share-file cleanup,
  SecureStore delete, `Updates.reloadAsync`) is diagnosable rather than invisible.
  Keep the post-wipe `stranded` path unchanged.
- `src/knot/issueLink.ts` — NEW — `ISSUES_URL = 'https://github.com/sbrn3/one-blue-thread/issues/new'`
  and `issueUrl(appVersion?: string): string` returning that URL, optionally with
  `?body=` prefilled with only the app version. No reading history, cue, partner,
  keys or diagnostics are ever put in the URL (privacy; AGENTS.md). Pure, no RN import.
- `src/knot/MoreSection.tsx` (same file) — add a "Report a problem" row as the last
  item under About: a labelled `ActionButton` (already a 44pt control, no new raw
  `Pressable`) calling `Linking.openURL(issueUrl(...))`; if it rejects, show a short
  inline "Couldn't open the browser" text instead of failing silently.
- `test/issueLink.test.ts` — NEW — `issueUrl()` points at the issues/new page, encodes
  the version, and contains no other data.
- `test/ui-contracts.test.ts` — MODIFY: add source-contract tests (same
  walk-the-source pattern): `Knot.tsx` has no `promoted`; `MoreSection.tsx` has no
  `promoted`; `Knot.tsx` opener contains no `>Knot<` label text; `Knot.tsx` wraps its modal contents in `GestureHandlerRootView` (needed by `ResetSection`'s `Gesture.LongPress`); `KnotIcon.tsx`
  imports `react-native-svg`. These are the closest-available guards — the suite
  has no component renderer.
- `docs/CONTEXT.md` — MODIFY: update **The knot / the everyday tier / the rare tier**
  entries to say nothing is promoted and the opener is a gear; add **Preferences**
  (the More group) if that rename is approved.

### Tests

- `test/ui-contracts.test.ts` — the four contract assertions above; fail first
  against today's source (`promoted` present, `Knot` label present).

### Stop inspecting when

- `promoted` has no remaining reference in `src/` (`Grep` bounded to `src/knot`).
- `Knot.tsx` and `MoreSection.tsx` typecheck with the removed props.

### Verify

- `npx vitest run test/ui-contracts.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass; changes stay inside `Owns`.
- Acceptance stories 1-14, 20 and 22 satisfied.
- Visual comparison vs the layout in plan.html on a dev build recorded as an
  owner spot-check or a gap in `PROGRESS.md`.
- Rollback: revert the single S01 commit; no data or storage is touched.

## S06 — One source of truth for the cue (part of PR 1)

Depends: S01 (both edit `Knot.tsx`)  
Mode: inline  
Budget: 4 files, 1 test file, <=8 turns  
Owns: see waves table

Problem: the cue is edited in two places, `ArrivalZone`'s `CueEditor` (via
`Flow.handleSaveCue`, `Flow.tsx:162`) and the knot's `CueEditor` (via
`Knot.handleCueSave`, `Knot.tsx:155`). Each keeps its own `useState` copy of the
cue (`Flow.tsx:151`, `Knot.tsx:62`). A save in one never reaches the other, so the
other keeps showing the old text, and its next edit spreads that stale `current` over
the new row (`CueEditor.commitEdit`, `{ ...current, [editing]: value }`), silently
undoing the first change. The #32 fix patched each copy separately and left the
split. The database write itself (`CueService.set`) is correct.

### Files

- `test/cue.test.ts` — NEW (write first, see it fail): `CueService.set` then
  `current()` returns the new cue; a `subscribe` listener is called once per `set`
  with the new cue; unsubscribe stops calls; a `firstSet` also notifies. Use
  `openTestDb()` + `migrate(db)` + a `Log` stub, as in `test/confound.test.ts`.
- `src/cue/index.ts` — MODIFY — add `subscribe(listener: (c: Cue | null) => void):
  () => void` and notify after the transaction in `set()`. No log or schema change.
- `src/flow/Flow.tsx` — MODIFY — replace the local `cueState` with subscribed state
  (`useEffect` subscribing, initial `services.cue.current()`); `handleSaveCue` only
  calls `services.cue.set(c)`.
- `src/knot/Knot.tsx` — MODIFY — same for `cueState`/`handleCueSave`.
- Also make `CueEditor.commitEdit`/`adjustHour` guard against double-commit:
  `onBlur` and `onSubmitEditing` both call `commitEdit` in one render (both would
  save, writing two rows and two `cue_changed` events). Fix by ignoring the second
  call (`if (!editing) return` after clearing via a ref).  
  `src/knot/CueEditor.tsx` — MODIFY (add to ownership).

### Verify

- `npx vitest run test/cue.test.ts`, then the full gate.
- Done when: story 21 satisfied in tests; owner device check: edit the cue in the
  knot, then see it in the arrival screen (and the reverse) without reopening.
- Rollback: revert the commit; the cue table is untouched.

## S02 — Translation is a confound; cache-free key validation

Depends: none  
Mode: inline  
Budget: 5 files, 2 test files, <=10 turns  
Owns: see waves table

Recipe: translation-switch `plan.html` Implementation → tickets 1 and 2
(`translation_changed` event type in `src/log/types.ts`; `hasConfound()` treats it
like `cue_changed`; exported cache-free `validateEsvKey` in `src/text/esv.ts`).
No delta from that plan. `translation_changed` is an additive event *type*, not a
schema migration; the log writer still stamps `ts`/`local_date`/`build_sha`.

Verify: `npx vitest run test/confound.test.ts test/esv.test.ts`, then the full gate.  
Done when: acceptance stories 15-18 (logic half) pass. Rollback: revert the commit.

## S03 — TranslationService and the services-rebuild seam

Depends: S02  
Mode: inline  
Budget: 5 files, 1 test file, <=10 turns  
Owns: see waves table

Recipe: translation-switch `plan.html` Implementation → ticket 3 (`translationService.ts`
owns the per-provider key scheme, `niv_bible_id` clearing, live validation, the
`translation_changed` write, and the in-place services rebuild + `useSession.load()`
that restarts at sitting 1; `App.tsx` serviceEpoch seam; `src/services/index.ts`).
**Delta:** keep the `OnboardingFlow.tsx` line-44 change from that plan (stop
onboarding writing the legacy single-key row — a correctness fix, not copy) but
**do not** edit `TranslationScreen.tsx` or `DoneScreen.tsx` wording. The legacy
single-key row must still be read as a fallback so an existing install keeps its key.

Verify: `npx vitest run test/translationService.test.ts`, then the full gate.  
Done when: stories 15-19 pass in tests. Rollback: revert the commit; keys written to
`meta` are inert additive rows.

## S04 — Translation row in the knot

Depends: S01, S03  
Mode: inline  
Budget: 3 files, 0 new test files, <=8 turns  
Owns: see waves table

### Files

- `src/knot/TranslationSection.tsx` — NEW — per translation-switch `plan.html`
  Implementation → ticket 4: choose WEB / NIV / ESV, paste or replace a key, show the
  live-validation error and keep the current setting on failure. Reuses
  `DisclosureSection`'s body styling and existing tokens only.
- `src/knot/MoreSection.tsx` — MODIFY — add a **Translation** `DisclosureSection` as
  the first row of the Practice/Preferences group, with `status` showing the active
  translation name ("World English Bible (WEB)" named in full); add `'translation'`
  to `MoreSectionKey`, and to `Knot.tsx`'s `moreSections` initial state (one-line
  edit in a file S01 already landed).
- `test/ui-contracts.test.ts` — MODIFY — add `src/knot/TranslationSection.tsx` to
  `INTERACTIVE_CALLER_ALLOWLIST` (it has raw `Pressable`/`TextInput`); confirm it
  meets the 44pt floor via `tokens.control.minTarget`.

### Verify

- `npx vitest run test/ui-contracts.test.ts`, then the full gate.
- Done when: stories 15-19 observable on a dev build. Rollback: revert the commit.

## S05 — Docs and live verification gate

Depends: S04  
Mode: inline  
Budget: 4 files, <=6 turns  
Owns: see waves table

- `src/text/apiBible.ts` — MODIFY (comment only): add the UNVERIFIED note, then
  correct it after the live round-trip passes.
- `README.md`, `STATUS.md` — MODIFY: per translation-switch plan (NIV/ESV
  verification status; replace the ESV-only Next action).
- `docs/plans/README.md` — MODIFY: add `knot-opener-icon` row; mark
  `knot-translation-switch` absorbed (the instruction in that index to move it to
  Parked only with separate approval is superseded by the user's "include it").
- **Gate (owner, not automatable):** obtain a free api.bible key and an api.esv.org
  key; paste each once into the Translation row on a dev build; confirm each
  validates against the live API and a chapter renders. Record in `PROGRESS.md`.
  PR 2 is not mergeable until both pass or the owner explicitly waives one.

Done when: docs agree with reality and the live gate is recorded. Rollback: revert.
