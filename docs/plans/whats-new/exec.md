# Execute What's new after an update

Grade: C2 — 10 files (2 of them docs/inventory), two UI surfaces (flow, knot) plus one pure data module, a chosen UI direction, 2 serial slices. No protected mechanism and no migration.

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

## Standing decisions

- **Branch/worktree:** sibling worktree `../thread-whats-new` on `feat/whats-new`, cut from `origin/main`. Never work in `thread/`, which holds another session's uncommitted `src/knot/TranslationSection.tsx`. Commit, push, PR and merge each need owner authorisation; plan approval alone doesn't cover them.
- **Unverifiable steps:** record a gap and never claim a pass.
- **Cross-slice integration owner:** inline (S02 runs the full suite).
- **Meta key:** `whats_new_seen` holds the id of the newest release the reader has dismissed or was onboarded at. It sits in the existing `meta` table, so no migration is needed. Reset already clears it (`src/reset/index.ts` `RESET_TABLES`).
- **Copy:** Scripture-first voice. Operational, at most 3 lines per release, each line 120 characters or less. Claude drafts and the owner edits in review.

## Execution waves

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S01 | 1 | — | inline | `src/whatsNew/`, `src/flow/WhatsNewCard.tsx`, `src/flow/Flow.tsx`, `src/onboarding/OnboardingFlow.tsx`, `test/whatsNew.test.ts` |
| S02 | 2 | S01 | inline | `src/knot/WhatsNewHistory.tsx`, `src/knot/MoreSection.tsx`, `src/knot/Knot.tsx`, `docs/brand-voice-inventory.json`, `AGENTS.md` |

## S01 — Release list, unseen logic, flow card, onboarding marker

Depends: none
Mode: inline
Budget: 5 files, 1 test file, <=10 turns
Owns: as in the table above

### Files

- `src/whatsNew/index.ts` — NEW. Pure, with no imports from `ui`, `lab` or `db`.
  - `export interface Release { id: string; lines: string[] }`, where `id` is the tag, `vX.Y.Z`.
  - `export const RELEASES: readonly Release[]`, newest first. Seed it with a single entry for the release that ships this feature (`v0.10.0`, or whatever tag the owner chooses at merge), with 1–2 drafted lines. Draft: "After an update, a short note like this says what changed." / "Every note stays in the knot, under More › About › What's new."
  - `export const WHATS_NEW_SEEN_KEY = 'whats_new_seen'`.
  - `export function unseenReleases(releases, seenId: string | null): Release[]`. An empty list returns `[]`. A null `seenId`, or one not found in the list, returns `[releases[0]]`. Otherwise it returns `releases.slice(0, indexOf(seenId))`, which is newest first and empty when `seenId` is the newest.
  - `export function latestReleaseId(releases): string | null`.
- `src/flow/WhatsNewCard.tsx` — NEW. `WhatsNewCard({ releases, onDismiss })`.
  - A column copy of the `StudyHint` card: same `wrap` tokens with `flexDirection: 'column'` and `alignItems: 'stretch'`.
  - Heading "New in this update" (`font.display` 13/700 `ink60`), then each line of each release as `· line`, 13 regular `ink60`. When there are several releases, no per-release headers are needed: the lines run newest first.
  - "Got it" Pressable aligned right, copied from `StudyHint` (`minTarget`, `hitSlop` 8, pressed opacity 0.7, `accessibilityLabel="Dismiss what's new"`).
  - `accessibilityLiveRegion="polite"` on the wrapper.
- `src/flow/Flow.tsx` — MODIFY, beside the study-hint state (~L290–296).
  - `const [whatsNew, setWhatsNew] = useState(() => unseenReleases(RELEASES, meta.get(db, WHATS_NEW_SEEN_KEY)))`.
  - `handleDismissWhatsNew`: when `latestReleaseId(RELEASES)` is non-null, `meta.set(db, WHATS_NEW_SEEN_KEY, it)`, then `setWhatsNew([])`.
  - Render (~L647), replacing the single study-hint line:
    - `whatsNew.length > 0 && sittingVerses.length > 0` → `<WhatsNewCard …/>`;
    - otherwise the existing `!studyHintSeen && sittingVerses.length > 0` → `<StudyHint …/>` (story 12).
- `src/onboarding/OnboardingFlow.tsx` — MODIFY, ~L73, beside `meta.set(db, 'onboarded', '1')`. Set `WHATS_NEW_SEEN_KEY` to `latestReleaseId(RELEASES)` when it's non-null, so a new reader never sees a card (stories 5 and 7). Add a one-line comment saying why.

### Tests

- `test/whatsNew.test.ts` — NEW, following the pure-module style of `test/dismissalReadiness.test.ts`.
  - `unseenReleases`: null → newest only; newest → `[]`; older → all newer entries in order; unknown → newest only; empty list → `[]`.
  - `RELEASES` invariants: ids are unique and match `/^v\d+\.\d+\.\d+$/`; strictly descending by numeric semver comparison (not string comparison); each entry has 1–3 lines; every line is trimmed, non-empty and 120 characters or less.

### Stop inspecting when

- `StudyHint` styles, the `Flow` hint state and render site, and the onboarding `onboarded` write are found.

### Verify

- `npx vitest run test/whatsNew.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5` (brand-voice is expected to FAIL until S02 classifies the new `.tsx` files, which is a known gap at S01; or classify `WhatsNewCard.tsx` here)
- `npm run typecheck`

### Done when

- Stories 1–7, 9–13 are satisfied in logic, and the card renders in `Flow`.
- Rollback: revert the S01 commit. The orphan `whats_new_seen` meta key is harmless.

## S02 — Knot history, copy inventory, release rule

Depends: S01
Mode: inline
Budget: 5 files, 0 new test files, <=8 turns
Owns: as in the table above

### Files

- `src/knot/WhatsNewHistory.tsx` — NEW. `WhatsNewHistory({ releases })`. For each release, show the id (`font.mono` 11, `ink40`, like `groupLabel` but not uppercase), then its lines as `· line` in the knot's body style. Copy that body style from a sibling About section (`BrandOrigin` or `DictionaryLibrary`) and don't invent new sizes.
- `src/knot/MoreSection.tsx` — MODIFY.
  - Add `'whatsNew'` to `MoreSectionKey` (~L26).
  - Under the About label (~L140), insert first: `<DisclosureSection summary="What's new" expanded={openSections.whatsNew} onToggle={() => onToggle('whatsNew')} nested><WhatsNewHistory releases={RELEASES} /></DisclosureSection>`.
- `src/knot/Knot.tsx` — MODIFY, ~L84: add `whatsNew: false` to the initial `moreSections` record. The close-all loop at ~L175 already iterates the keys.
- `docs/brand-voice-inventory.json` — MODIFY. Add `"src/flow/WhatsNewCard.tsx": ["operation-consent-error"]` and `"src/knot/WhatsNewHistory.tsx": ["operation-consent-error"]`, kept in sorted position.
- `AGENTS.md` — MODIFY, in the release paragraph (~L37). Add: "A tag that changes anything a reader can notice also adds a newest-first entry to `RELEASES` in `src/whatsNew/index.ts` (1–3 plain lines, each 120 characters or less; Claude drafts and the owner edits). Fix-only or internal tags add none."

### Tests

- No new test file. `test/brand-voice.test.ts` and `test/whatsNew.test.ts` cover it.

### Verify

- `npx vitest run test/whatsNew.test.ts test/brand-voice.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Story 8 is satisfied, the full suite and types are green, and changes stay inside `Owns`.
- Rollback: revert the S02 commit. The flow card still works without the history row.
