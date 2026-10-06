# Execute Recall cloze ladder + narrowed probe (issues #40, #41)

Grade: C4 — additive schema migration (`passages`, `probes`, `days`, `events`);
seeded-PRNG probe span (determinism); changes the outcome variable the dose
analysis reads (`probes.grade`); 5 slices, ~25 files across `log` · `memory` ·
`lab` · `state` · `flow`.

## Protocol

Use one fresh session per slice. Read only `AGENTS.md`, this protocol, the slice,
`git status --short`, `git log --oneline -5`, and named files. Do not read
`plan.html`, other slices, project status/history, or the full product spec
unless the slice names that dependency. Append one bounded `PROGRESS.md` entry,
return at most 150 tokens, and stop.

Budgets: shared instructions <=500 estimated tokens; slice target <=1,200 and
hard limit 2,000; progress entry <=80; worker result <=150. Estimate tokens as
UTF-8 bytes divided by four until API telemetry is available.

Inspect narrowly: list paths first, search bounded symbols, read line ranges,
inspect `git diff --stat`/`--name-only` before targeted diffs, and show quiet
test output unless a failure needs expansion. Never read `../thread-plan_3.html`
whole or paste worker logs/diffs into the coordinator context.

Red-green loop: write the slice's tests first, run them red, implement, run green,
then the full gate. Hard rules (AGENTS.md): events append-only, migrations
additive-only, no `Math.random()`, `/src/memory` never imports `/src/lab`,
`/src/lab` never imports `/src/ui`. Synthetic data only in fixtures.

## Standing decisions

- Branch/worktree/PR policy: **unresolved gate** — proposed sibling worktree
  `../thread-recall-cloze-ladder` on `feat/recall-cloze-ladder` from `origin/main`
  (other worktrees are active; C4 schema work). Plan approval does not authorize
  commit, push, PR, merge or deploy; ask before each.
- The plan folder, glossary terms, journal decision and ledger rows are uncommitted
  in this worktree (copied from the stale `thread/` checkout, whose copies should
  be discarded). First commit on the branch: docs only, before S01, once the owner
  authorizes committing.
- Unverifiable steps: record a gap; never claim a pass.
- Cross-slice integration owner: S05 (inline).
- Ladder defaults (confirm at approval): `rung` 1–7; **held → +1 (cap 7),
  partial → stay, lost → −1 (floor 1)**; amount per step: rungs 1–2 ≈20% of key
  words, 3–4 ≈50%, 5–6 ≈85%, 7 = whole passage; odd rung shows letter stubs, even
  rung plain gaps; at least 1 key word hidden. Existing promoted passages
  keep `rung` NULL; the effective rung is `rung ?? fromBox(box)` with fromBox =
  1→1, 2→3, 3→5, 4→7, 5→7 (`COALESCE(box,1)`), computed in `Memory` and written on
  the first grade. No backfill UPDATE, so a backup restored after install gets the
  same result as an in-place upgrade.
- Probe defaults: span of at most 3 verses inside the verses actually read; a
  marked verse in that chapter wins (clamped to its first 3 verses), else a seeded
  start; reading-range unknown (legacy day) → roll the arm as usual, then record `fired = 0` (nothing shown); a pre-upgrade `fired = 1` row with no span also resolves to null.
- Dose analysis default: `recallScore` uses only span-level probes
  (`verse_start IS NOT NULL`); legacy chapter-level grades are excluded, not pooled.

## Execution waves

All inline: no wave has two ready tasks with disjoint ownership that also meet
the 4-file / 8-turn / 8,000-token delegation threshold.

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S01 | 1 | — | inline | `src/log/schema.ts`, `src/log/types.ts`, `src/log/log.ts`, `test/schema.test.ts`, `test/log.test.ts` |
| S02 | 2 | S01 | inline | `src/memory/cloze.ts`, `src/memory/ladder.ts`, `src/memory/memory.ts`, `test/cloze.test.ts`, `test/ladder.test.ts`, `test/memory.test.ts` |
| S03 | 2 | S01 | inline | `src/state/session.ts`, `test/session.test.ts` |
| S04 | 3 | S01, S03 | inline | `src/lab/probe.ts`, `src/lab/analysis/dose.ts`, `test/probe.test.ts`, `test/dose-analysis.test.ts` |
| S05 | 4 | S02, S04 | inline | `src/flow/RecallZone.tsx`, `src/flow/ProbeZone.tsx`, `src/flow/Flow.tsx`, `test/ui-contracts.test.ts` |

S02 and S03 are independent; running them in one wave is optional.

## S01 — Migration V12 and event fields

Depends: none  
Mode: inline, **high-effort** (schema migration; irreversible once shipped)  
Budget: 6 files, 3 test files incl. backup, <=10 turns  
Owns: `src/log/schema.ts`, `src/log/types.ts`, `src/log/log.ts`, `test/schema.test.ts`, `test/log.test.ts`, `test/backup.test.ts`

### Files

- `src/log/schema.ts` — MODIFY — append `V12` and add it to `MIGRATIONS` (index 11). Statements, all additive: `ALTER TABLE passages ADD COLUMN rung INTEGER` (NULL = not yet on the ladder; **no backfill UPDATE**); `ALTER TABLE probes ADD COLUMN verse_start INTEGER`, `... verse_end INTEGER`, `... marked INTEGER`; `ALTER TABLE days ADD COLUMN first_verse INTEGER`, `... last_verse INTEGER`; `ALTER TABLE events ADD COLUMN verse_first INTEGER`, `... verse_last INTEGER`. Comment cites this plan. Never edit V1–V11.
- `src/log/types.ts` — MODIFY — `Passage` gains `rung: number | null`; `AppEvent` gains `verse_first: number | null; verse_last: number | null` (match the existing nullable-number fields); extend the `EventInput` `Pick` (line ~51) with both so `log.write` accepts them; the `Day` type gains `first_verse`/`last_verse`.
- `src/log/log.ts` — MODIFY — the events INSERT (near line 32) writes the two new columns (`?? null`); `deriveDayRow` (line ~90) copies the seal's `verse_first`/`verse_last` into `days.first_verse`/`last_verse` in both the INSERT and the `ON CONFLICT DO UPDATE` list, **only when `seal.book`/`seal.chapter` equal the `reading_start` row's** (otherwise NULL). The writer still stamps `ts`/`local_date`/`build_sha`; callers pass nothing new there.

### Tests

- `test/schema.test.ts` — fresh DB reaches `MIGRATIONS.length`; a DB built by applying `MIGRATIONS.slice(0, 11)` and setting `user_version = 11` by hand (no V11 helper exists) migrates to V12 with a promoted passage's `rung` still NULL; running `migrate` twice is a no-op. Follow the existing `schemaVersion(db)` pattern.
- `test/backup.test.ts` — a dump taken at V11 (no new columns) restores into a V12 DB (`restoreDump` inserts by column intersection) and the passage's effective rung is still derived from its box.
- `test/log.test.ts` — a seal carrying `verse_first/verse_last` lands in `days.first_verse/last_verse`; a seal without them leaves NULL; re-derive is idempotent.

### Stop inspecting when

- `V11`, the `MIGRATIONS` array, the events INSERT and `deriveDayRow` are located.
- `src/backup/dump.ts` (`restoreDump` filters row keys to the live columns, so old dumps restore safely) and `src/reset/index.ts` (table list only) are read; no change is expected.

### Verify

- `npx vitest run test/schema.test.ts test/log.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass; no V1–V11 line changed (`git diff` shows additions only).
- Acceptance stories 11, 12 satisfied (12 is finished in S04).
- Rollback: revert the commit before release; after release the columns stay (additive), unused.

## S02 — Cloze engine, ladder, grade wiring

Depends: S01  
Mode: inline, **high-effort** (new pure engine; deterministic-selection contract)  
Budget: 7 files, 4 test files, <=10 turns  
Owns: `src/memory/cloze.ts`, `src/memory/ladder.ts`, `src/memory/memory.ts`, `test/cloze.test.ts`, `test/ladder.test.ts`, `test/memory.test.ts`, `test/leitner.test.ts`

### Files

- `src/memory/ladder.ts` — NEW — `MAX_RUNG = 7`; `nextRung(rung: number, g: Grade): number` (held +1 cap, partial stay, lost −1 floor 1); `effectiveRung(rung: number | null, box: number): number` (NULL → `fromBox(box)`, result clamped to 1..7); `ladderStep(rung): 1|2|3|4` (4 = whole passage); `hintStyle(rung): 'stub'|'gap'|'none'` (odd stub, even gap, 7 none). Pure, no imports beyond `Grade`.
- `src/memory/cloze.ts` — NEW — `STOP_WORDS: ReadonlySet<string>` (small English function-word list incl. curly `’` forms); `keyWordIndexes(words: string[]): number[]` (not stop, length > 2, punctuation stripped); `hiddenIndexes(words, rung, passageId): Set<number> | null` (null at rung 7 or when there are no key words): count = `max(1, round(keys × pct))`, order keys by `fnv1a(`${passageId}:${index}`)` (the step is **not** in the hash), take first n, so both rungs of a step hide the same set and each step's set contains the previous step's; `toCloze(text, rung, passageId): ClozeToken[] | null`, returning null for the whole-passage case (rung ≥ 7 after clamping, or the text has no key words); tokenizing strips leading/trailing quotes, dashes and punctuation before the stop-word test, and a stub's letter is the first letter of the stripped word. `ClozeToken` is `ClozeToken = { text: string; hidden: false } | { text: string; hidden: true; stub: string; width: number }`. Local `fnv1a`; **imports nothing from `/src/lab`** and no `Math.random`.
- `src/memory/memory.ts` — MODIFY — `grade()` (line ~94): compute `nextRung(effectiveRung(row.rung, row.box), g)` and add `rung = ?` to the UPDATE; `due()`/queries already `SELECT *`. `promote()` leaves `rung` at its default 1.

### Tests

- `test/ladder.test.ts` — held/partial/lost transitions incl. caps; 7→7 on held; 1→1 on lost; `hintStyle` for 1..7; `ladderStep` mapping. Pattern: `test/leitner.test.ts`.
- `test/cloze.test.ts` — stop words never hidden; curly-apostrophe words (`didn’t`) handled; rungs 1 and 2 hide the identical set; step 2's set is a superset of step 1's; rung 7 → null; NULL rung derives from box; out-of-range rung clamps; leading/trailing curly quotes and dashes are stripped before matching; deterministic across calls; different `passageId` → different set; 1-verse passage hides ≥1; text with no key words → null; reconstruction (`tokens.map(text).join(' ')` with hidden replaced) preserves punctuation and spacing. Fixtures: WEB John 3:16–17.
- `test/memory.test.ts` — grading held advances `rung`, partial keeps, lost steps back, and `box`/`due_date` still follow Leitner exactly (regression); grading changes nothing outside `passages` (existing guard).
- `test/leitner.test.ts` — MODIFY — its `passage()` literal gains `rung: null` (the `Passage` type change); no behaviour assertion changes.
- `test/boundaries.test.ts` stays green unchanged (no `/lab` import in `/src/memory`).

### Stop inspecting when

- `reschedule`, `Memory.grade` and the `Passage` consumers (`grep -rn "Passage" src`) are located.

### Verify

- `npx vitest run test/ladder.test.ts test/cloze.test.ts test/memory.test.ts test/boundaries.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass; Leitner box/interval behaviour is unchanged (`leitner.test.ts` assertions untouched; only its fixture literal gained `rung`).
- Acceptance stories 1–6 satisfied.
- Rollback: revert the commit; `rung` column is left unused.

## S03 — Seal records the verse range read

Depends: S01  
Mode: inline  
Budget: 2 files, 1 test file, <=8 turns  
Owns: `src/state/session.ts`, `test/session.test.ts`

### Files

- `src/state/session.ts` — MODIFY — in `seal(db, log, text, today)` (line ~126), next to `versesInSitting`: from `sittings[sittingIndex]` (a `Verse[]`, each with `chapter` and `verse`) take the verses whose `chapter` equals the session `chapter`; add `verse_first = min(verse)`, `verse_last = max(verse)` to the existing `log.write({ type: 'seal', … })` call (omit both if none). `log.rebuildDays(today)` then copies them via `deriveDayRow`. No change to `verses_count`.

### Tests

- `test/session.test.ts` — sealing a sitting that covers verses 18–36 of a chapter writes `days.first_verse = 18`, `last_verse = 36`; a first sitting writes 1..n; a multi-chapter portion records only the session chapter's span. Follow the existing session fakes.

### Stop inspecting when

- The seal call site and the `Sitting` verse shape (`src/text/sittings.ts`) are read.

### Verify

- `npx vitest run test/session.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass; `verses_count` semantics unchanged.
- Acceptance story 9 satisfied.
- Rollback: revert; the new event fields stay NULL.

## S04 — Narrowed probe and analysis guard

Depends: S01, S03  
Mode: inline, **high-effort** (E9 determinism and outcome-variable change)  
Budget: 2 files, 2 test files, <=10 turns  
Owns: `src/lab/probe.ts`, `src/lab/analysis/dose.ts`, `test/probe.test.ts`, `test/dose-analysis.test.ts`

### Files

- `src/lab/probe.ts` — MODIFY — `DailyProbe` gains `verseStart: number; verseEnd: number; marked: boolean`. `resolveTodaysProbe`: read `first_verse`/`last_verse` with the prior-day row. Do the existing `weightedPick(trialSeed, 'E9:'+date, …)` fire roll first (unchanged); if the arm is fire but either verse is NULL (legacy day) persist `fired = 0` and return null, so the randomization record stays complete. Otherwise choose the span: marked verse = `SELECT verse_start, verse_end FROM passages WHERE book=? AND chapter=? AND verse_start>=first AND verse_end<=last ORDER BY marked_at, id` first row, clamped to 3 verses (and `marked = 1`); else `start = first + floor(seededUniform(trialSeed,'E9span:'+date) × (len − min(3,len) + 1))`, `end = start + min(3,len) − 1`. Persist `verse_start`/`verse_end`/`marked` in the `probes` INSERT; the idempotent early-return path reads them back, and **a pre-upgrade row with `fired = 1` and NULL `verse_start` returns null** (it can exist if the app was opened on the upgrade day before updating). The existing `E9:` key and `fireRate` are untouched, so arm assignment is bit-identical to before. Reads `passages` with raw SQL; no `/src/ui` or `/src/memory` import.
- `src/lab/analysis/dose.ts` — MODIFY — the `recallScore` query (line ~46) adds `AND verse_start IS NOT NULL`; comment that chapter-level grades are a different scale and excluded.

### Tests

- `test/probe.test.ts` — MODIFY the three existing fixtures (lines ~17, 28, 43): their `days` INSERTs gain `first_verse`/`last_verse`, and the `toEqual({ book, chapter })` assertions become the new `DailyProbe` shape (span + `marked`). New cases: fired probe carries a span of ≤3 verses inside `first_verse..last_verse`; same inputs → same span (replay and re-render); a marked verse in range wins, a mark outside the read range is ignored; a marked 10-verse range clamps to 3; legacy day with NULL range → not fired, one row, arm still rolled; a pre-upgrade `fired = 1` row with NULL span → null; a range shorter than 3 verses clamps to its length; a mark made then removed after resolve does not change the stored span or `marked`; fire/skip arm for a fixed seed is identical to the pre-change value (golden). Follow the existing `fireRate=1` pattern.
- `test/dose-analysis.test.ts` — MODIFY the `seedDoseDay` helper to insert `verse_start`/`verse_end` on the probe row, so the existing `recallScore` assertions still count it. New: a chapter-level probe grade (NULL `verse_start`) is excluded from `recallScore`; a span-level grade is included.

### Stop inspecting when

- `resolveTodaysProbe`, `gradeProbe`, `seededUniform` and the `recallScore` query are read.

### Verify

- `npx vitest run test/probe.test.ts test/dose-analysis.test.ts test/boundaries.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass; the golden arm assertion proves no PRNG drift.
- Acceptance stories 7–10, 15 and 16 satisfied.
- Rollback: revert; rows with span columns stay, ignored.

## S05 — Recall and probe UI, wiring, contracts

Depends: S02, S04  
Mode: inline  
Budget: 4 files, 1 test file, <=10 turns  
Owns: `src/flow/RecallZone.tsx`, `src/flow/ProbeZone.tsx`, `src/flow/Flow.tsx`, `test/ui-contracts.test.ts`

### Files

- `src/flow/RecallZone.tsx` — MODIFY — props `getVerseText` unchanged. Per passage, load the text on mount (state map `texts`), render `toCloze(text, p.rung, p.id)` as nested `<Text>` runs in the existing `revealed` style: hidden + `hintStyle==='gap'` → a run of `_` characters (one per letter, minimum 3) in `tokens.color.thread` (nested `<Text>` ignores border and width styles, so the gap is drawn with characters); `'stub'` → first letter (`fontWeight` 600) + `–` per remaining letter in `tokens.color.thread`; rung 7 → today's blank card (reference + a quiet "Say it from memory" line in `ink40` mono 12). Reveal sets the full text, hidden words shown in `thread` colour, then the same Held/Partly/Lost chips. Four 14×3 px bars next to the reference show `ladderStep` (`thread` filled, `ink15` empty). Loading or load failure → fall back to today's reference-only card. Reveal reuses the text already loaded (otherwise fetches once, retries once, and catches: `reveal()` has no try/catch today); memoize `toCloze` per passage so a re-render never re-picks the words. No animation is added; the reveal is an instant swap. (`useReducedMotion` from `react-native-reanimated` exists and is used in `Flow.tsx`/`Knot.tsx`; use it if a fade is ever added.)
- `src/flow/ProbeZone.tsx` — MODIFY — props become `{ book; chapter; verseStart; verseEnd; marked: boolean; getSpanText; onGrade }` (`marked` comes from `DailyProbe`, never re-derived in `Flow`); prompt "Yesterday you read {Book} {chapter}. {What do you remember of verses a–b? | Do you remember verse a?}", reference line in `mono` 13 `ink40`, a madder "● you marked this" label when `marked`; revealed text loses `numberOfLines={6}` truncation (≤3 verses). Four-grade row unchanged.
- `src/flow/Flow.tsx` — MODIFY — `getProbeChapterText` (line ~452) becomes `getProbeSpanText` filtering `text.getChapter` to `verseStart..verseEnd`; pass `probe.verseStart`, `probe.verseEnd` and `probe.marked` into `<ProbeZone>`; `probe_fired`/`probe_graded` log writes stay book+chapter keyed.
- `test/ui-contracts.test.ts` — MODIFY — walk-the-source assertions: `ProbeZone.tsx` no longer contains `numberOfLines`; RecallZone imports `toCloze` from `../memory/cloze` and renders `hintStyle`; no `Math.random` in `src/memory`; the rung bars carry an `accessibilityLabel` ("Step n of 4") and the whole paragraph carries one `accessibilityLabel` built from the tokens with each hidden word read as "blank" (stub: "blank, starts with X"); per-run labels are not relied on, because a nested-`Text` tree is read as one node.

### Tests

- Vitest has no component renderer (AGENTS.md); logic is covered in S02/S04. The contract test above is the only automated UI check. The rest is the owner spot-check below.

### Stop inspecting when

- `RecallZone`, `ProbeZone`, and the two `Flow.tsx` call sites are read.

### Verify

- `npx vitest run test/ui-contracts.test.ts test/brand-voice.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass; strings stay in the Scripture-first voice (brand-voice test green).
- Acceptance stories 1–8, 13, 14 satisfied.
- Visual and TalkBack/VoiceOver check against `mockup.html#chosen` and `#probe` on a dev build is recorded in `PROGRESS.md` as a gap if not performed (underscore gaps and stubs wrap differently from the mockup's CSS).
- Rollback: revert the commit; schema and engine stay inert.

## Close-out (inline, after S05)

- Update `docs/CONTEXT.md` only if a term changed, `ROADMAP.md`, `STATUS.md`, `docs/plans/README.md`, and add the build-session `JOURNAL.md` entry (reference, don't restate, the 2026-10-02 decision).
- Independent final diff audit (C4), then `OUTCOME.md`.
- On release: close #40 and #41 with the PR link.
