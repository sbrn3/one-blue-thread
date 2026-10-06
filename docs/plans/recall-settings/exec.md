# Execute Memory library in the knot (recall-settings)

Grade: C4 — additive schema migration (`passages.source`); a change to the
seeded E9 probe (marks no longer steer the span); new event types; a destructive
action (delete a passage); ~26 files across `log` · `memory` · `lab` · `knot` ·
`flow` · `state`.

## Protocol

Use one fresh session per slice. Read only `AGENTS.md`, this protocol, the slice,
`git status --short`, `git log --oneline -5`, and named files. Do not read
`plan.html`, other slices, project status/history, or the full product spec
unless the slice names that dependency. Append one bounded `PROGRESS.md` entry,
return at most 150 tokens, and stop.

Budgets: shared instructions <=500 estimated tokens; slice target <=1,200 and
hard limit 2,000; progress entry <=80; worker result <=150.

Inspect narrowly: list paths first, search bounded symbols, read line ranges,
inspect `git diff --stat` before targeted diffs, and show quiet test output
unless a failure needs expansion.

Red-green loop: write the slice's tests first, run them red, implement, run
green, then the full gate (`npm test`, `npm run typecheck`). Hard rules
(AGENTS.md): events append-only, migrations additive-only, no `Math.random()`,
`/src/memory` never imports `/src/lab`, `/src/lab` never imports `/src/ui`, a
recall grade or any library action never touches seal, streak, weave or dose.
Synthetic data only in fixtures.

## Standing decisions

- Branch/worktree/PR policy: worktree `thread-recall-cloze-ladder` on
  `feat/recall-settings` from `origin/main`. One PR to `main`. The owner
  approved build through merge and deploy on 2026-10-07; merges the tooling
  blocks are handed back to the owner.
- Unverifiable steps: record a gap; never claim a pass.
- Cross-slice integration owner: S06 (inline).
- Library direction **A** (`mockup.html#option-a`): one sheet — cap stepper and
  Review now on top, Learning (due first, then by due date), Marked, "Add a
  passage"; tapping a row opens that passage's page (text, step, next due,
  source; Practise now / Edit verses / Start over / Delete). Picker
  (`mockup.html#picker`) and book end (`#bookend`) are shared.
- No nested `Modal`: `MemoryModal` is one `Modal` rendered as a sibling inside
  the knot's modal tree (like `HistoryModal`); the passage page, picker and
  review are internal screens of it (a `screen` state), never a second `Modal`.
- Daily cap: `meta` key `recall_cap`, integer 1–10, default `DAILY_RECALL_CAP`
  (2). Read by `Memory.recallCap()`, written by `Memory.setRecallCap()`.
- Passage source: `passages.source` TEXT — NULL = marked while reading (all
  existing rows), `'added'` = the picker. Only NULL-source rows are E4 marks.
- Ranges stay inside one chapter. Duplicates (same book/chapter/start/end already
  being learned) are refused with a reader-facing message; nothing is written.
- Edit range on a learned passage keeps `box`/`due_date`/`held_since`; `rung =
  max(1, effectiveRung(rung, box) − 1)`. On a marked (unlearned) passage it only
  changes the range.
- Start over: `box = 1, rung = 1, due_date = today, last_grade = NULL,
  held_since = NULL`.
- Delete: `DELETE FROM passages WHERE id = ?` (a non-event table) after a
  confirm step; the `passage_deleted` event keeps the record.
- Review now / Practise grades call `Memory.grade(id, g, today)` — always
  reschedules, exactly like the reading screen.
- Reading-screen recall set is **frozen per day** (Smart Review H1): `Flow` keeps
  the ids it showed today (`shownToday`, published in `useMemoryEpoch`). On an
  epoch change it re-reads those rows, drops deleted ones and ones no longer due
  unless graded in the zone today, and tops up from `due()` only while
  `shownToday.size < recallCap()` (so raising the cap adds cards; grading never
  pulls the next one in). Flow's own grade does **not** bump the epoch.
- Every path that makes a passage learned (`promote`, `add`, `editRange`) runs
  one duplicate check and returns `{ ok: true } | { ok: false; reason:
  'duplicate' | 'invalid' | 'missing' }`; callers show the refusal, never throw.
- E4 (`marksPerChapter`) and R6 (`retention`, `yearReview`) keep reading the
  `passages` table, so Delete and Start over change their past values. Accepted
  and recorded in the journal decision's consequences; redefining E4 on events is
  out of scope (retracted marks have no event, so it would overcount).
- The library list shows references only; verse text loads on the passage page
  and in review (one chapter fetch each, cached per chapter for the session), so
  opening the library never bulk-fetches licensed NIV/ESV chapters. The
  translation attribution line shows under text on the passage page.
- `recall_cap_changed` carries no value (EventInput has no free field); the
  value lives in `meta.recall_cap`, the event marks when it changed.
- Probe: the marked-verse query is removed; span = seeded start only. The
  `probes.marked` column stays and is written `0`. `DailyProbe.marked` and the
  "● you marked this" label are removed. E9 arm roll untouched.

## Execution waves

All inline: tasks are sequential through shared `memory.ts`/`Flow.tsx`/`Knot.tsx`
and none meets the delegation threshold with disjoint ownership.

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S01 | 1 | — | inline | `src/log/schema.ts`, `src/log/types.ts`, `test/schema.test.ts`, `test/backup.test.ts`, `test/leitner.test.ts`, `test/confound.test.ts` |
| S02 | 2 | S01 | inline | `src/memory/memory.ts`, `src/memory/leitner.ts`, `test/memory.test.ts` |
| S03 | 2 | S01 | inline | `src/lab/probe.ts`, `src/flow/ProbeZone.tsx`, `test/probe.test.ts`, `test/probe-span.test.ts` (+ the ProbeZone call in `Flow.tsx`) |
| S04 | 3 | S02 | inline | `src/knot/passageRange.ts`, `src/knot/PassagePicker.tsx`, `test/passageRange.test.ts`, PassagePicker's entries in `test/ui-contracts.test.ts` + `docs/brand-voice-inventory.json` |
| S05 | 4 | S02, S04 | inline | `src/knot/MemoryModal.tsx`, `src/knot/MemoryStrip.tsx`, `src/knot/Knot.tsx`, `src/state/memoryEpoch.ts`, `src/flow/RecallZone.tsx`, `test/ui-contracts.test.ts`, `docs/brand-voice-inventory.json` |
| S06 | 5 | S03, S05 | inline | `src/flow/Flow.tsx`, `src/flow/DismissalZone.tsx`, `test/dismissalReadiness.test.ts` |

## S01 — Migration V13 and types

Depends: none  
Mode: inline, **high-effort** (schema migration; irreversible once shipped)  
Budget: 6 files, 4 test files, <=8 turns  
Owns: see table

### Files

- `src/log/schema.ts` — MODIFY — append `V13 = ['ALTER TABLE passages ADD COLUMN source TEXT']` with a comment (NULL = marked while reading; `'added'` = picker; only NULL rows are E4 marks); add to `MIGRATIONS`. Never edit V1–V12.
- `src/log/types.ts` — MODIFY — `Passage.source: 'added' | null`; `EventType` gains `'passage_added' | 'passage_edited' | 'passage_reset' | 'passage_deleted' | 'recall_cap_changed'` with one-line comments (consequence-free, never touch seal/streak/weave/dose). The `passage_promoted` comment changes from "one per book, at book end" to "a mark chosen to learn — library or book end".
- `test/leitner.test.ts`, `test/confound.test.ts` — MODIFY fixtures only if the type change requires (`source: null`).

### Tests

- `test/schema.test.ts` — a DB at V12 (apply `MIGRATIONS.slice(0, 12)`, set `user_version = 12`) with a passage migrates to V13 with `source` NULL; migrate twice is a no-op. Existing "fresh DB reaches MIGRATIONS.length" stays.
- `test/backup.test.ts` — a V12-shaped passage row (no `source`) restores into V13 with `source` NULL.

### Verify

- `npx vitest run test/schema.test.ts test/backup.test.ts`; `npm test`; `npm run typecheck`

### Done when

- Green; `git diff` on `schema.ts` is additions only. Stories 16, 17.
- Rollback: revert before release; after release the column stays, unused.

## S02 — Memory API for the library

Depends: S01  
Mode: inline, **high-effort** (removes the §21 one-per-book rule; E4 metric filter)  
Budget: 3 files, 1 test file, <=10 turns

### Files

- `src/memory/leitner.ts` — MODIFY — keep `DAILY_RECALL_CAP = 2` (now the default); add `MAX_RECALL_CAP = 10`.
- `src/memory/memory.ts` — MODIFY:
  - `promote(id, today): PassageResult` (~line 73): drop the one-per-book check and its throw; return `{ ok: false, reason: 'missing' }` if the row is gone and `'duplicate'` if the same range is already learned; otherwise sets `promoted_at`, `due_date = today`, logs `passage_promoted`. Update the class and §13.2 comments, and the one-per-book comments at `leitner.ts:22` and `dismissalReadiness.ts:12`. The comment inside V1 (`schema.ts:89-91`) stays untouched — V1 is never edited.
  - `learned(): Passage[]` — promoted rows, `ORDER BY due_date, book, chapter, verse_start`.
  - `marked(): Passage[]` — `promoted_at IS NULL AND source IS NULL`, `ORDER BY marked_at DESC`.
  - `add(r: PassageRef, today, now = Date.now): { ok: true; id } | { ok: false; reason: 'duplicate' | 'invalid' }` — validates `1 <= verseStart <= verseEnd`; refuses an existing learned row with the same ref; inserts `source = 'added'`, `marked_at = now()`, `promoted_at = now()`, `box = 1`, `due_date = today`; logs `passage_added` (book, chapter).
  - `editRange(id, start, end): same result type` — same validation and duplicate check (excluding itself); learned → also `rung = max(1, effectiveRung(rung, box) − 1)`; marked → range only; logs `passage_edited`.
  - `reset(id, today)` — `box = 1, rung = 1, due_date = today, last_grade = NULL, held_since = NULL`; logs `passage_reset`.
  - `remove(id)` — reads the row (no-op if missing), `DELETE`, logs `passage_deleted` (book, chapter).
  - `recallCap(): number` — `meta.get(db, 'recall_cap')`, parsed, clamped 1..`MAX_RECALL_CAP`, default `DAILY_RECALL_CAP`. `setRecallCap(n)` — clamps, `meta.set`, logs `recall_cap_changed`.
  - `marksPerChapter` (~line 126): count only rows with `source IS NULL` (picker adds are not E4 marks).
  - Imports: `meta` from `../log/log`; nothing from `/src/lab`.

### Tests

- `test/memory.test.ts` — two passages in one book can both be promoted; promoting a range already learned returns `duplicate`, a deleted id returns `missing`; `add` inserts a due-today learned passage with `source = 'added'` and logs; `add` refuses a duplicate and an invalid range, writing nothing; `editRange` keeps box/due/held_since and steps the rung back (NULL rung derives from box first), marked edit changes only the range; `reset` returns to box 1/rung 1/due today and clears `held_since`; `remove` deletes and logs; `marked()` excludes picker adds; `marksPerChapter` ignores picker adds; `recallCap` default 2, clamps 0→1 and 99→10, persists, logs. Existing "grading changes nothing outside passages" guard extended to every new method (days/probes untouched). Update the existing test that asserted the one-per-book throw.

### Verify

- `npx vitest run test/memory.test.ts test/boundaries.test.ts`; `npm test`; `npm run typecheck`

### Done when

- Green; Leitner intervals and `grade()` unchanged. Stories 2–8, 10, 12, 15, 18, 21.
- Rollback: revert; the library UI (S05) depends on this slice.

## S03 — Probe stops using marks

Depends: S01  
Mode: inline, **high-effort** (seeded probe; E9 boundary)  
Budget: 4 files (+1 call site), 2 test files, <=8 turns

### Files

- `src/lab/probe.ts` — MODIFY — delete the `passages` query and the `mark` branch in `resolveTodaysProbe`; the span is always `first + floor(seededUniform(trialSeed, 'E9span:'+date) × (len − span + 1))`. INSERT writes `marked = 0`. `DailyProbe` loses `marked`. Early-return path unchanged except it no longer returns `marked`. Update the doc comment.
- `src/flow/ProbeZone.tsx` — MODIFY — drop the `marked` prop, the `markedLabel` Text and its style.
- `src/flow/Flow.tsx` — MODIFY — the `<ProbeZone>` call (~line 576) drops `marked={probe.marked}`.

### Tests

- `test/probe-span.test.ts` — drop the `p.marked` assertion in the first case (~line 33) and the mark-removed case (~80-86); replace the three mark cases with: a mark inside the read range does **not** change the span (equals the no-mark span for the same seed/date) and `marked` is 0 in the row. Golden arm test and every other case unchanged.
- `test/probe.test.ts` — `toMatchObject` drops `marked`; row expectation keeps `marked: 0`.

### Verify

- `npx vitest run test/probe.test.ts test/probe-span.test.ts test/boundaries.test.ts`; `npm test`; `npm run typecheck`

### Done when

- Green; golden arm assertion unchanged. Stories 13, 14.
- Rollback: revert; spans return to mark-preferred.

## S04 — Passage picker and range editor

Depends: S02  
Mode: inline  
Budget: 3 files, 1 test file, <=10 turns

### Files

- `src/knot/passageRange.ts` — NEW, pure — `type RangeSel = { start: number | null; end: number | null }`; `tapVerse(sel, verse): RangeSel` (first tap sets start; second tap sets the other end, ordered; a third tap starts over); `rangeLabel(bookName, chapter, sel): string` ("John 3:16–17 · 2 verses"); `filterBooks(query): Book[]` over `CANON` (case-insensitive prefix/contains on name).
- `src/knot/PassagePicker.tsx` — NEW — props `{ mode: 'add' | 'edit' | 'learn'; text: TextProvider; initial?: { book; chapter; start; end }; onConfirm(ref: PassageRef): void; onCancel(): void; message?: string }`. Steps: books (search `TextInput` + list, `bundledChapterCount(book) > 0` only) → chapters (6-column grid of 44pt cells) → verses (`text.getChapter`, each verse a 44pt-min `Pressable` row, Newsreader 16/25, selection `markSoft` wash + 2px `thread` inset). `edit`/`learn` open on the verses step with `initial` selected and no back to books. Footer: `rangeLabel` + confirm `ActionButton` ("Add" / "Save" / "Learn"); disabled until both ends set. Loading → mono "Loading…"; chapter load error → message + Retry. `message` shows a refusal (duplicate) in `madder` mono 12. Every Pressable has `accessibilityRole="button"` and a label ("Verse 16, selected").

- `test/ui-contracts.test.ts` — MODIFY — add `src/knot/PassagePicker.tsx` to `INTERACTIVE_CALLER_ALLOWLIST`, and assert it renders no `<Modal` (moved here from S05 so S04's full gate passes).
- `docs/brand-voice-inventory.json` — MODIFY — classify `src/knot/PassagePicker.tsx` (`operation-consent-error`; verse rows are `scripture`).
- Copy: footer hint in edit mode "Editing keeps its schedule; the ladder steps back one."

### Tests

- `test/passageRange.test.ts` — tap order (forward, backward, single verse, restart on third tap); label for 1 and many verses; `filterBooks('jo')` includes John/Job/Joel/Jonah/Joshua, empty query returns all 66.

### Verify

- `npx vitest run test/passageRange.test.ts`; `npm test`; `npm run typecheck`

### Done when

- Green. Stories 3, 4, 6, 18, 19, 20.
- Rollback: revert; no other slice imports it until S05.

## S05 — The library sheet in the knot

Depends: S02, S04  
Mode: inline  
Budget: 7 files, 1 test file, <=12 turns

### Files

- `src/state/memoryEpoch.ts` — NEW — Zustand `useMemoryEpoch = create<{ epoch: number; bump(): void; shownToday: number[]; setShownToday(ids: number[]): void }>()`; bumped after any library change; `shownToday` is written by `Flow` and read by Review now.
- `src/knot/MemoryStrip.tsx` — NEW — counts re-read on the epoch (subscribe to `useMemoryEpoch`), not only on knot open. The everyday-tier row, same pattern/styles as `ChapterStrip`: "Memory" + mono status ("3 due · 9 passages", or "Nothing yet" when empty) + chevron; always tappable (the library is where you add the first one).
- `src/knot/MemoryModal.tsx` — NEW — one `Modal` (`animationType` `none` when `reducedMotion`, else `slide`), safe-area padded like `HistoryModal`. Internal `screen`: `{ kind: 'list' } | { kind: 'passage'; id } | { kind: 'picker'; mode; initial? } | { kind: 'review'; ids }`. Reads `memory.learned()`, `memory.marked()`, `memory.recallCap()` on open and after every action.
  - Android back (`onRequestClose`) steps back one screen; it closes only from the list. On every screen change, move screen-reader focus to that screen's heading (`AccessibilityInfo.setAccessibilityFocus`, as `HistoryModal` does at ~line 99).
  - list: header "Memory" + Close; "Each day, show" stepper (−/+, 44pt, `accessibilityRole="adjustable"` with increment/decrement actions) → `setRecallCap`; "Review now · n due" (solid, hidden when 0 due) → review of all due ids, those **not** in `shownToday` first (the grill's "beyond the cap first"), then the rest; "Add a passage" → picker add; "Learning · n" rows (ref mono 13 — no text snippet, see standing decisions; step bars, due label: "due today" thread / "tomorrow" / "in n days"); "Marked · n" rows with "Learn this" → picker learn; empty states: "Nothing learned yet. Add a passage, or mark a verse while reading." 
  - passage page: back "‹ Memory", reference, full text (Newsreader italic 18/27), facts ("Step 2 of 4 — about half the key words hidden" wording per `mockup.html#option-a`, next due, "Added from the picker" / "Marked while reading {Book} {chapter}"), translation attribution under the text, stack: Practise now → review `[id]`; Edit verses → picker edit; Start over → confirm inline ("Start over? Its schedule goes back to the beginning." Yes/Cancel); Delete → confirm inline in madder ("Delete John 3:16–17? This can't be undone." Delete/Cancel).
  - picker: `PassagePicker`; on confirm calls `memory.add` / `memory.editRange` / (`editRange` if changed, then `promote`); any `{ ok: false }` keeps the picker open with its message ("You're already learning John 3:16–17." / "Pick a first and last verse." / "That passage is gone.").
  - review: `RecallZone` with those passages, `onGrade` → `memory.grade(id, g, today)`, `onSkip` → back to list; `doneLabel="All reviewed."` then a "Back to Memory" button.
  - Every change calls `useMemoryEpoch.getState().bump()`.
- `src/knot/Knot.tsx` — MODIFY — `<MemoryStrip>` between the Practice disclosure and `<ChapterStrip>` (~line 256); `memoryOpen` state; `<MemoryModal>` as a sibling next to `<HistoryModal>` (~line 283) with `services.memory` (never a second `Memory`), `text`, `today`, `reducedMotion`. Update the everyday-tier doc comment.
- `src/flow/RecallZone.tsx` — MODIFY — optional `doneLabel` prop (default "Recall done for today."); key the text cache by `id:verse_start-verse_end` so an edited passage never shows its old text; update the prop comments at ~12/37 (cap is a setting now).
- `test/ui-contracts.test.ts` — MODIFY — add `src/knot/MemoryModal.tsx`, `src/knot/MemoryStrip.tsx` to `INTERACTIVE_CALLER_ALLOWLIST` (each sizes from `tokens.control.minTarget`); add a contract: `MemoryModal.tsx` renders exactly one `<Modal`.
- `docs/brand-voice-inventory.json` — MODIFY — classify the two new files (`operation-consent-error` for the library/picker chrome; `scripture` where verse text renders), following existing entries.

### Tests

- Contract test above; logic is covered by S02/S04 (Vitest has no component renderer).

### Verify

- `npx vitest run test/ui-contracts.test.ts test/brand-voice.test.ts`; `npm test`; `npm run typecheck`

### Done when

- Green. Stories 1–11, 19.
- Visual check against `mockup.html#option-a` and `#picker` on a dev build → recorded as a gap if not performed.
- Rollback: revert; S02's API stays inert.

## S06 — Reading screen cap and optional book end

Depends: S03, S05  
Mode: inline (integration owner)  
Budget: 3 files, 1 test file, <=8 turns

### Files

- `src/flow/Flow.tsx` — MODIFY:
  - Due effect (~line 402): implement the frozen-per-day set from standing decisions — a `shownToday` ref (reset when `today` changes), a `zoneGraded` ref (ids graded in the zone today), `useMemoryEpoch((s) => s.epoch)` in deps; publish ids via `setShownToday`. `handleGradeRecall` adds to `zoneGraded` and does **not** bump. `recall_shown` still logs once per day. Remove the `DAILY_RECALL_CAP` import if unused.
  - Add the epoch to the `candidates` effect (~317) and `refreshChapterCandidates` deps (~329) so marks learned or deleted in the library refresh the book end and the reading-screen highlights.
  - `handlePromote` (~382) uses the result: on ok, add the id to a `learnedAtBookEnd` Set state (do **not** filter it out of `candidates`, and do not resolve) and bump the epoch; on refusal, set a message passed to DismissalZone. `hasPromotionChoice` (~645) uses the candidate list as offered when the book finished. Add `handleFinishPromotion` → `setPromotionResolved(true)`.
- `src/flow/DismissalZone.tsx` — MODIFY — book-end block (~line 78): the prompt line is "Learn any of what you marked?" (the "You finished {Book}." line at ~71 already exists — do not repeat it); each candidate row has "Learn this" → `onPromote(id)`, and shows "Learning ✓" when its id is in the new `learnedIds` prop; an optional `promotionMessage` prop renders a refusal in madder mono 12; one "Done" button → `onSkipPromotion()` (rename prop `onFinishPromotion`, update the Flow call); the old "Not this time" becomes that same Done. `candidates` prop comment updated (§21 one-per-book removed).
- `test/dismissalReadiness.test.ts` — MODIFY only the comment/wording if it names "promoted one"; logic unchanged (Done resolves).

### Tests

- Existing `dismissalReadiness` cases stay green. No renderer; the behaviour is in the owner spot-check.

### Verify

- `npx vitest run test/dismissalReadiness.test.ts test/ui-contracts.test.ts test/brand-voice.test.ts`; `npm test`; `npm run typecheck`

### Done when

- Green. Stories 10, 11, 12.
- Rollback: revert; the cap falls back to the fixed 2 and the book end to one pick.

## Close-out (inline, after S06)

- `docs/CONTEXT.md`: update **The probe span** (no longer prefers a marked verse) and **The ladder** if wording changed; the memory library terms are already in.
- `ROADMAP.md`, `STATUS.md`, `docs/plans/README.md`, a build `JOURNAL.md` entry referencing (not restating) the 2026-10-06 decision.
- Independent final diff audit (C4), fix HIGH/MEDIUM, then `OUTCOME.md`.
