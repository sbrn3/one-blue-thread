# Execute: Book bookends (BibleProject overviews + headnotes)

Grade: **C4**. Triggers:
- a new table in the `src/log/schema.ts` migration chain (V14);
- coverage in the backup dump and in the destructive reset;
- 5 slices and about 30 files across the flow, the knot, the log, the backup and the reset.

The Smart Review ran; its findings are resolved inline below and recorded in `plan.html` → Smart Review.

## Protocol

Use one fresh session per slice. Read only:
- `AGENTS.md`;
- this protocol;
- the slice;
- `git status --short` and `git log --oneline -5`;
- the files the slice names.

Do not read `plan.html`, other slices, `mockup*.html` unless the slice names them. When done, append one `PROGRESS.md` entry, return at most 150 tokens, and stop.

Budgets:
- shared instructions: at most 500 tokens;
- a slice: about 1,200 tokens, 2,000 at most;
- a progress entry: at most 80 tokens;
- a worker result: at most 150 tokens.

Estimate tokens as UTF-8 bytes / 4.

Inspect narrowly: list paths first, search for bounded symbols, read line ranges, and keep test output quiet. Never read `../thread-plan_3.html` whole.

**Red-green loop per slice:**
1. Write the named tests and watch them fail.
2. Implement.
3. Run the focused tests, then `npm test`, then `npm run typecheck`.
4. Run a self-review of the diff against the slice's stories.
5. Append the PROGRESS entry.

## Standing decisions

- **Public site:** GitHub Pages serves `main:/docs` at https://sbrn3.github.io/one-blue-thread/, so **merging S00 or S06 publishes them**. That is outward-facing and needs explicit owner approval to merge. Preview locally first: open the file, plus a headless Edge screenshot at 390 and 1280 widths. Never use sharp or ImageMagick.

- **Branch / worktree / PR:** a sibling worktree `../thread-headnotes` on `feat/headnotes`, branched from current `main`. One commit or a small series per slice, then a stacked PR per slice, merged in order: S01 → S02 → S03 → S04 → S05. **Gate:** plan approval does not authorize creating the worktree, committing, pushing, opening PRs, merging or tagging. Ask the owner before the first of each.
- **Copy:**
  - The product word is **headnote**.
  - Never write "daily takeaway": `test/brand-voice.test.ts` forbids it.
  - Every new copy-bearing `.tsx` goes into `docs/brand-voice-inventory.json`:
    - headnote surfaces are `reader-owned` + `operation-consent-error`;
    - overview links are `attributed-human-commentary`.
- **Interactive files:** any new file with a raw `<Pressable>` or `<TextInput>` is added to `INTERACTIVE_CALLER_ALLOWLIST` in `test/ui-contracts.test.ts`, after checking `tokens.control.minTarget`.
- **Modals:**
  - Never put a `<Modal>` in `PassagePicker.tsx`.
  - Never render a modal-opening child after a file's last `</Modal>` (ui-contracts).
  - A new sheet in Flow is its own `<Modal>`, rendered beside `VerseContextSheet`.
- **Voice:** the reader's headnote is always Schibsted (`tokens.font.display`), never `tokens.font.scripture`. Newsreader is for Scripture only.
- **Privacy:**
  - Nothing about headnotes is logged: no `log.write`, nothing in `error_log` payloads.
  - `/src/lab` never imports `/src/headnote`.
- **What's new:** each slice that ships to the reader drafts its `RELEASES` entry (1–3 lines, at most 120 characters each) in `PROGRESS.md`. It is added to `src/whatsNew/index.ts` only when the owner tags the release.
- **Unverifiable steps:** record a gap; never claim a pass.
- **Cross-slice integration owner:** inline, the coordinator.

## Execution waves

Code slices are serial and inline: S01 and S02 both edit `DismissalZone.tsx`, and every later code slice depends on S02's module. S00 touches only `README.md` and `docs/*.html`, so it is disjoint and could run beside S01. It meets the size threshold (over 8,000 diff tokens), but it stays inline unless the owner authorizes a worker. S06 runs last, once the feature is real.

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S00 | 1 | — | inline (delegable if authorized) | `README.md`, `docs/index.html`, `docs/what-thread-asks-you.html`, `docs/brand-voice-inventory.json` (only the entries for these docs) |
| S01 | 1 | — | inline | `src/study/overviews.ts`, `src/ui/OverviewLink.tsx`, `src/flow/ArrivalZone.tsx`, the finished block of `src/flow/DismissalZone.tsx` |
| S02 | 2 | S01 | inline | `src/log/schema.ts`, `src/headnote/*`, `src/backup/dump.ts`, `src/reset/index.ts`, `src/flow/HeadnoteSheet.tsx`, `src/ui/HeadnoteEditor.tsx`, the prompt block of `src/flow/DismissalZone.tsx`, `src/flow/Flow.tsx` |
| S03 | 3 | S02 | inline | `src/ui/Contents.tsx`, `src/knot/BookContents.tsx`, `src/knot/HistoryModal.tsx`, `src/knot/ChapterViewer.tsx`, `src/knot/Knot.tsx`, `src/knot/history.ts`, `src/flow/ScriptureZone.tsx` (the `highlight` prop only) |
| S04 | 4 | S03 | inline | the finished block of `src/flow/DismissalZone.tsx`, `src/flow/Flow.tsx` |
| S05 | 5 | S03 | inline | `src/knot/PassagePicker.tsx`, `src/ui/HeadnoteEditor.tsx` |
| S06 | 6 | S00, S04 (S05 if shipped) | inline | `README.md`, `docs/index.html` |

---

## S00: README and website reflect the app as it ships today

Depends: none. Mode: inline (delegable). Budget: 4 files, at most 12 turns. Gate: owner approval before merging, since merging publishes the site.
Stories: D1–D4 in `plan.html`.

**Owner's ask:** README and website show **all current features, and reflect the current aesthetics, artwork and functionality**.

### Inventory first (facts, not memory)

Build a feature list from the code before writing any copy. Read only names, headers and copy; don't read whole files.

| Feature | Verify in |
|---|---|
| Onboarding cue ("After X, I read in Y") | `src/onboarding/`, `src/cue` |
| Arrival (day, cue echo, chapter, day count) | `src/flow/ArrivalZone.tsx` |
| Recall: cloze cards on the ladder, daily cap | `src/flow/RecallZone.tsx`, `src/memory`, `docs/CONTEXT.md` (Memory) |
| Next-day probe on **a few verses**, not the whole chapter (Decision 2026-10-02) | `src/flow/ProbeZone.tsx` |
| Scripture: paragraphs; tap a verse to see study notes or remember it; dictionary terms | `src/flow/ScriptureZone.tsx`, `src/study/` |
| Tyndale study notes, dictionary, book introductions (CC BY-SA, attributed) | `src/study/`, `THIRD_PARTY_NOTICES.md` |
| The seal: hold, or tap if switched in the knot; the fell-line seal | `src/flow/SealZone.tsx`, `src/knot/SealModeSection.tsx` |
| The weave / bolt and the fell line; bare warp; set marks | `src/ui/Cloth.tsx`, `docs/CONTEXT.md` (The cloth) |
| Dismissal: book end, learn what you marked, next-book pick, "Now close the app." | `src/flow/DismissalZone.tsx` |
| The knot: everyday tier and rare tier; memory library; searchable reading history | `src/knot/` |
| Translations: WEB bundled offline; NIV and ESV with your own free key, plus the key guide | `src/text/`, `src/ui/KeyGuide.tsx` |
| Encrypted backup and restore, on-device recovery | `src/backup/`, `src/knot/BackupSection.tsx` |
| The unravel (held reset) | `src/knot/ResetSection.tsx` |
| Partner hand-off (no network) | `src/partner`, `src/knot/PartnerSection.tsx` |
| The lab (dormant for year one) and the adaptive policy | `src/lab`, `src/knot/AdaptiveSection.tsx` |
| What's new notes | `src/whatsNew` |

### Files

- `README.md` (MODIFY).
  - Refresh the intro and First run; add a concise "What's in it" list built from the inventory.
  - **Fix the accuracy of "nothing leaves your phone".** Say instead: no account, no telemetry; the network is used only for a licensed translation you add your own key for, and for links you choose to open.
  - Update the demo blurb to list what the page actually shows.
  - Keep the build and contributor sections as they are, apart from stale facts.
- `docs/index.html` (MODIFY). Keep its structure:
  - the loom rail;
  - the Numbers 15:37–41 block, **in full** (BRAND.md full-passage rule);
  - zones 01–06, each mirroring the real screen and its copy.

  Bring it up to date:
  - **Zone 02** shows the cloze ladder (not a plain verse) and mentions the probe.
  - **Zone 03** gains the verse sheet (study notes, Remember this verse) and the dotted dictionary term.
  - **Zone 04** says hold, or tap if you switch it in the knot.
  - **Zone 06** shows the book-end flow.
  - Add one compact "In the knot" section (memory library, reading history, translations, backup, the unravel, partner, What's new). Match the existing zone styling. Add no new fonts and no external scripts.
  - Artwork stays the existing `cloth()` renderer and the rail. It must match `src/ui/tokens.ts` (re-check every `:root` value).
  - Use synthetic data only.
- `docs/what-thread-asks-you.html` (MODIFY).
  - Rename "Thread" to **One Blue Thread** throughout.
  - Replace the stale tokens comment and values with the Loom palette from `tokens.ts`.
  - Correct the probe section: a few verses inside what you read, chosen by the trial seed (`docs/CONTEXT.md`, "The probe span").
  - Drop the "streak" wording: there is no streak.
  - Re-verify every claim and code path the page cites.
- `docs/brand-voice-inventory.json` (MODIFY only if `brand-voice.test.ts` requires it).

### Tests and checks

- `npx vitest run test/brand-voice.test.ts test/brand.test.ts`
- `npm test` and `npm run typecheck` stay green (no source change).
- **Manual:**
  1. Take headless Edge screenshots of both pages at 390 and 1280 widths and check them against the app's current screens and tokens.
  2. Click every link.
  3. Confirm that reduced motion stops the animations.
  4. Confirm there is no horizontal scroll at 360.

### Done when

- Every inventory row is either shown on the site or listed in README, or a recorded reason explains why not.
- No stale name, token, claim or "streak" remains (`grep -n "Thread\b|streak|1F3FFF"` shows only intended hits).
- Rollback: revert the commit. If it was already merged, revert on main, which republishes the previous site.

---

> **Styling (owner, round 5):** use round 3 exactly — dotted `ink40` leaders, reader lines in `tokens.font.display`, madder headnote rule — plus a purely decorative `src/ui/Ornament.tsx` (`kind: "head" | "tail"`, hairline `tokens.color.thread`, `aria-hidden`, static; paths in `mockup.html` §5). Headpiece: S01 Arrival first sitting and S03 BookContents; tailpiece: S04 after the finished Contents. No cloth or dye in contents rows (`plan.html` → Aesthetics).

## S01: BibleProject overview links

Depends: none. Mode: inline. Budget: 7 files, 1 new test file, at most 10 turns.
Stories: 1, 2, 3, 5, 6. Story 4 (history) lands in S03.

### Files

- `src/study/overviews.ts` (NEW). `export interface Overview { label: string | null; url: string }` and `export function overviewsFor(bookId: string): Overview[]`. Backed by a `Record<string, Overview[]>` keyed by every `CANON` id (`src/text/canon.ts`).
  - Two-part books get two entries labelled `'Part 1'` / `'Part 2'`.
  - Books that share one video map each id to the same URL, labelled with the joint title, e.g. `1–3 John`.
  - No book is missing.
- **URL verification (manual, required).**
  - bibleproject.com answers **202 to every path, including a made-up slug**, so HTTP status checks are useless.
  - Verify each URL with WebFetch: the page title must name the book.
  - Prefer the `https://bibleproject.com/explore/video/<slug>/` form. A fetched OT index listed slugs such as `genesis-1-11`, `genesis-12-50`, `exodus-1-18`, `exodus-19-40`, `isaiah-1-39`, `isaiah-40-66`, `ezekiel-1-33`, `ezekiel-34-48`, `kings`, `chronicles`, `ezra-nehemiah`, `song-songs`.
  - Compile the NT the same way.
  - Record "66/66 verified" or the gaps in PROGRESS.
- `src/ui/OverviewLink.tsx` (NEW). `OverviewLink({ book, lead }: { book: string; lead: string })` renders one `ActionButton variant="link"` per overview (`src/ui/controls.tsx`), at a minimum height of `tokens.control.minTarget`.
  - The label is `${lead} BibleProject's overview ↗`. Two-part books render `Part 1 ↗` · `Part 2 ↗`.
  - `accessibilityRole="link"`, labelled e.g. "Open BibleProject's overview of Philippians, part 1".
  - `Linking.openURL(url).catch(() => setFailed(true))`. On failure it shows the host and path to type, copying the `KeyGuide.tsx` failure pattern.
  - Renders nothing if `overviewsFor` returns `[]`.
- `src/flow/ArrivalZone.tsx` (MODIFY). Under the `progress` line, render `<OverviewLink book={book} lead="Before you begin:" />` when `chapter === 1 && sittingIndex === 0`. After a restart on a finish day this correctly shows the *next* book's overview, which is that book's first sitting.
- `src/flow/DismissalZone.tsx` (MODIFY, the `justFinishedBook` block ~:76). Under "You finished {book}.", render `<OverviewLink book={justFinishedBook} lead="And now," />`.
- `docs/brand-voice-inventory.json` (MODIFY). Add `src/ui/OverviewLink.tsx: ["attributed-human-commentary","operation-consent-error"]`. Add `attributed-human-commentary` to ArrivalZone and DismissalZone.
- `test/ui-contracts.test.ts` (MODIFY). Add `src/ui/OverviewLink.tsx` to the allowlist only if it has a raw `Pressable`. Prefer `ActionButton`, so no entry is needed.

### Tests

`test/overviews.test.ts` (NEW). Follow the `test/whatsNew.test.ts` style. Check that:
- every `CANON` id has at least one overview;
- every URL is `https://bibleproject.com/…` and unique per (url, label);
- two-part books have exactly two entries labelled Part 1 and Part 2;
- shared-video books return identical URLs;
- `overviewsFor('nope')` returns `[]`.

### Verify

- `npx vitest run test/overviews.test.ts test/brand-voice.test.ts test/ui-contracts.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass.
- WebFetch verification is recorded.
- The What's-new draft is in PROGRESS, e.g. "A new book now opens with a link to BibleProject's video overview. It comes back when you finish."
- Rollback: revert the S01 commit. No data is touched.

---

## S02: Write a headnote (storage, backup, the sheet, Dismissal)

Depends: S01. Mode: inline, **high-effort** (it adds a migration to a protected chain). Budget: 13 files, 2 new test files, at most 14 turns.
Stories: 7, 9, 10, 11, 12, 13, 21, 22, 23, 24, plus the default-passage part of 8.

### Files

- `src/log/schema.ts` (MODIFY). Append `V14` and add it to `MIGRATIONS`. Comment style: copy V13's.

  ```sql
  CREATE TABLE IF NOT EXISTS headnotes (
    local_date TEXT PRIMARY KEY,
    seal_event_id INTEGER NOT NULL,
    book TEXT NOT NULL, chapter INTEGER NOT NULL, chapter_end INTEGER,
    verse_start INTEGER, verse_end INTEGER,
    text TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)
  CREATE INDEX IF NOT EXISTS idx_headnotes_book ON headnotes(book, seal_event_id)
  ```

  The table is mutable on purpose: it holds the reader's words, not evidence (JOURNAL Decision 2026-10-07). It is additive. Do not touch `events`.
- `src/headnote/index.ts` (NEW). Pure functions over `SqlDb`, with no imports from `/src/lab`, `/src/ui` or `/src/flow`.
  - `latestSeal(db): SealRef | null`. Query: `SELECT id, local_date, book, chapter, verse_first, verse_last FROM events WHERE type='seal' ORDER BY id DESC LIMIT 1`.
    - **Review M6:** key on the seal event's own `local_date`, never on Flow's mount-time `today`.
    - **Review M3:** take the passage from the seal event, not from `days`; `days.book` can be a book abandoned mid-day.
  - `get(db, localDate)`.
  - `save(db, { seal, text, chapterEnd?, verseStart?, verseEnd? })`. Upserts on `local_date`. Trimmed text; an empty string calls `remove`; text is capped at 280 characters. Sets `created_at` on insert and `updated_at` on every write.
  - `remove(db, localDate)`.
  - The default passage: `verse_start/verse_end` = the seal's `verse_first/verse_last` (null means the whole chapter). `chapter_end` = the last chapter of the session's `portionChapters` when it is longer than one chapter. It is passed in by Flow from the in-memory session. After a restart it is unknown, so it is null (**Review M3**, documented: a headnote written after a restart covers its starting chapter).
- `src/backup/dump.ts` and `src/reset/index.ts` (MODIFY). Add `'headnotes'` to `BACKUP_TABLES` and to `RESET_TABLES`.
  - **Review L8:** `restoreDump` treats a table missing from an old backup as empty. The restore Alert already warns "overwrites everything", so no copy change is needed.
- `src/ui/HeadnoteEditor.tsx` (NEW, no `<Modal>`). Props: `{ heading, passageLabel, initial, onSave(text), onDelete?, onCancel }`.
  - The label "As it will sit above the chapter".
  - A `TextInput`:
    - style: `tokens.font.display` 15/22 `ink60`, a madder left rule, a `radius.input` border, `ink15`;
    - `maxLength={280}`;
    - a visible `n / 280` counter;
    - an accessible label "Headnote for {heading}".
  - A primary "Keep it" button, disabled when blank.
  - An optional Delete with the MemoryModal-style confirm: "Delete this headnote? This can't be undone."
  - `passageLabel` is shown in mono, e.g. "About: all of 4:1–23".
- `src/flow/HeadnoteSheet.tsx` (NEW). A `<Modal transparent>` bottom sheet that copies the `VerseContextSheet` styles (`backdrop`, `sheet`, `head`) and wraps a `KeyboardAvoidingView`. **Review M5:** this keeps the field above the keyboard, and it sits outside Flow's ScrollView, so the seal's `scrollEnabled` lock can't trap it. It hosts `HeadnoteEditor`. Rendered in Flow beside `<VerseContextSheet>` (~:735).
- `src/flow/DismissalZone.tsx` (MODIFY, after the progress or finished line). New props `headnote: Headnote | null` and `onWriteHeadnote()`. Show it only when `latestSeal` exists for this day (Flow gates it).
  - With no headnote: a `promoteLabel` "A line for today?" and `ActionButton variant="secondary"` "Write a headnote".
  - With a headnote: the line in display 15/22 `ink`, a madder left rule, and a mono `passageLabel · Edit` link.
  - It does **not** change `isDismissalReady`: the headnote is optional.
- `src/flow/Flow.tsx` (MODIFY).
  - `const [headnoteOpen, setHeadnoteOpen]`.
  - `const seal = useMemo(() => session.sealedToday ? latestSeal(db) : null, [session.sealedToday, db])`.
  - Hold `headnote` state, loaded with `get(db, seal.local_date)`.
  - On save, call `save` and then set state. **Never call `session.load()`** (Review M4).
  - Wire the props in, and render `<HeadnoteSheet>`.
  - Hide it all during the dev seal rehearsal (`rehearsing`).
- `docs/brand-voice-inventory.json` (MODIFY). HeadnoteEditor and HeadnoteSheet are `reader-owned` + `operation-consent-error`; add `reader-owned` to DismissalZone.
- `test/ui-contracts.test.ts` (MODIFY). Allowlist `src/ui/HeadnoteEditor.tsx`, which has the TextInput.
- `test/boundaries.test.ts` (MODIFY). Add "nothing in /src/lab imports /src/headnote", in the same shape as the existing lab rule (:37).

### Tests

- `test/headnote.test.ts` (NEW). Use the `openTestDb()` + `migrate()` pattern from `test/history.test.ts` and seed `events` rows directly. Check that:
  - `latestSeal` picks the highest seal id, carries that event's `local_date`, and returns null with no seal;
  - save, then get, round-trips;
  - re-saving the same day updates the row (one per day) and bumps `updated_at`;
  - blank text deletes;
  - text longer than 280 characters is capped;
  - the default verses come from `verse_first/last`, and a null seal range gives null verses;
  - `chapterEnd` is stored when it is passed in.
- `test/schema.test.ts` (MODIFY). Add `headnotes` to the expected table list (~:15). Add a "v14 adds headnotes on a v13 db" test using the V13 test's pattern (~:65).
- `test/backup.test.ts` and `test/reset.test.ts` should pass with no change (they derive from the lists). Add one round-trip: a headnote survives `buildDump` → `restoreDump`.

### Verify

- `npx vitest run test/headnote.test.ts test/schema.test.ts test/backup.test.ts test/reset.test.ts test/boundaries.test.ts test/ui-contracts.test.ts test/brand-voice.test.ts`
- the full suite and typecheck
- the mandatory migration checklist in `plan.html` → Verification, on the dev client (`com.sngugi.thread.dev`, `APP_VARIANT=development`). **Never on the release app, which holds real data.**

### Done when

- Tests and types pass and the checklist is recorded.
- The What's-new draft is in PROGRESS, e.g. "After you seal, you can keep one line about the day: a headnote. It's optional."
- Rollback: revert the UI commit. The V14 table stays: migrations are additive-only and an unused table is harmless. Never write a down-migration.

---

## S03: Contents in Reading history, and headnotes in the chapter viewer

Depends: S02. Mode: inline. Budget: 10 files, 1 new and 1 modified test file, at most 12 turns.
Stories: 4, 16, 17, 18, 19, 20.

### Files

- `src/headnote/index.ts` (MODIFY). Add `contentsFor(db, book): Reading[]`, newest reading first.
  - `Reading = { startedOn: string; rows: ContentsRow[] }`.
  - `ContentsRow = { chapter: number; chapterEnd: number | null; headnotes: Headnote[] } | { bare: [from, to] }`.
  - **Readings (Review H2):** a headnote belongs to the latest `book_start` event for its book whose `id < seal_event_id`. This stays correct when the finish day's seal also logs `book_start` for the same book being re-read, and for the exit-book and onboarding `book_start` writes.
  - **Rows:** run chapters 1 to the furthest chapter sealed in that reading. Chapters with headnotes are one row each. Runs of chapters with none collapse into one `bare` row (e.g. "3–17"), so Psalms stays short.
- `src/ui/Contents.tsx` (NEW). Presentational `Contents({ rows, onOpen })`.
  - Each row has a minimum height of 48: the mono `ink40` chapter number, then the headnote (display 15/22 `ink`), then a flexible dotted leader (`borderStyle:'dotted'`, `ink40`), then the mono reference (e.g. `4:6–7`).
  - A bare row is the number or range in `ink40`, read by screen readers as "Chapters 3 to 17, no headnote".
  - The line wraps and the reference never truncates: the leader is the flex filler with `minWidth` 16.
- `src/knot/BookContents.tsx` (NEW, no `<Modal>`). A screen *inside* HistoryModal, copying MemoryModal's header style (`title` 22/700 plus a mono "Back").
  - Shows the book name, `<OverviewLink lead="">`, and then each reading's `Contents`. The newest reading is labelled "Contents · Oct 2026" and older ones "(earlier reading)".
  - An empty state when the book has no headnotes: just the overview, plus "No headnotes in {book} yet."
- `src/knot/HistoryModal.tsx` (MODIFY). The section header becomes a `Pressable`, labelled "{Book}, open contents", which switches HistoryModal's internal screen to `BookContents`. Its contents rows call the existing `onSelectEntry` with a `HistoryEntry` extended by `{ highlight?: {start,end}; headnoteDate?: string }`.
- `src/knot/history.ts` (MODIFY). Add the optional `highlight?` and `headnoteDate?` fields to `HistoryEntry`.
- `src/knot/ChapterViewer.tsx` (MODIFY).
  - Above the chapter title, render the headnote for `entry.headnoteDate`, or else for `entry.local_date` (`get`). Style: display 15/22 `ink60` with a madder rule.
  - Pass `highlight` to `ScriptureZone`.
  - An "Edit headnote" link switches the viewer's own content to a `HeadnoteEditor` screen, with Delete enabled and no new Modal. Saving or deleting returns to the chapter.
  - **Review L7:** the viewer stays the existing sibling Modal in `Knot.tsx` (~:340) and is opened through `onSelectEntry`. Never render it inside HistoryModal.
- `src/flow/ScriptureZone.tsx` (MODIFY). Add an optional `highlight?: { start: number; end: number }` that is OR-ed into the existing `marked` check (~:85) using the same `markSoft` styling. **Review L7:** don't fake `Passage` objects.
- `docs/brand-voice-inventory.json` and the `test/ui-contracts.test.ts` allowlist (MODIFY) for `Contents.tsx` and `BookContents.tsx`.

### Tests

`test/headnote.test.ts` (MODIFY). Check that:
- contents run in book order;
- bare runs collapse;
- a re-read gives two readings, newest first;
- **a finish-day re-read of the same book** (`book_finish` then `book_start` of the same book, on one date) keeps that day's headnote in the finished reading;
- a reading in progress stops at its furthest sealed chapter;
- a restored backup (ids preserved by `restoreDump`) gives the same contents.

### Verify

Run the focused tests, then the suite, then typecheck. On the dev client, check that the screen reader announces each contents row as headnote, then reference.

### Done when

- Stories 4 and 16–20 work.
- The What's-new draft is in PROGRESS, e.g. "Reading history: tap a book to see its contents, made of your headnotes."
- Rollback: revert S03. The S02 data is untouched.

---

## S04: The contents at "You finished"

Depends: S03. Mode: inline. Budget: 3 files, at most 6 turns.
Stories: 3 (ordering), 14, 15.

### Files

- `src/flow/DismissalZone.tsx` (MODIFY, the finished block). Order:
  1. "You finished {book}."
  2. the book name (display 900, 34, the book's dye from `src/ui/dye.ts`);
  3. a mono "Contents" label;
  4. `<Contents>` for the **finished reading only**, `contentsFor(...)[0]`;
  5. the S01 `OverviewLink`;
  6. the existing "Learn any of what you marked?" block.

  Render nothing for the contents when the reading has no headnotes (story 15): no label, no nudge.
- `src/flow/Flow.tsx` (MODIFY). Compute contents when `session.justFinishedBook` is set, and recompute after a headnote save so today's line appears straight away (**Review M4**). Rows open the existing `ChapterViewer`? No: Flow has no viewer, so in Dismissal the rows are not tappable (`onOpen` is undefined). Reading history is the durable, tappable home (**Review M4**: the finish summary is one-shot by design, because `justFinishedBook` clears on any `load()`).

### Tests

- `test/headnote.test.ts`: the finished reading is index 0 after a seal-finish sequence.
- `test/dismissalReadiness.test.ts` is unchanged and must stay green.

### Done when

- The suite and types pass.
- The What's-new draft is in PROGRESS, e.g. "Finishing a book now shows its contents, your headnotes in chapter order."
- Rollback: revert S04.

---

## S05: Narrow a headnote to verses

Depends: S03. Mode: inline. Budget: 3 files, at most 8 turns.
Stories: 8 (narrowing), 19 (editing verses).

### Files

- `src/knot/PassagePicker.tsx` (MODIFY). Add a `'headnote'` mode (**Review H1**).
  - It opens on the verses step of `initial.book/chapter`.
  - The back control cancels instead of walking up to the chapters or books lists, so the chapter is locked.
  - `CONFIRM.headnote = 'Use these verses'` and `TITLE.headnote = 'Which verses?'`.
  - None of the memory-only copy (the "Editing keeps its schedule…" line ~:211) appears in this mode.
  - Still no `<Modal>`.
- `src/ui/HeadnoteEditor.tsx` (MODIFY). A "choose verses" link switches the editor's own content to `PassagePicker mode="headnote"`, never nested in a ScrollView, because its `FlatList`s need their own scroll (**Review H1**). Confirming sets the verse range and returns to the field; `passageLabel` updates. It works the same in HeadnoteSheet (Flow) and in the ChapterViewer editor screen.
- `src/headnote/index.ts` (MODIFY). `save` accepts the narrowed range and clears `chapter_end` when it is narrowed (narrowed ranges are single-chapter).

### Tests

`test/headnote.test.ts`: narrowing stores the range and clears `chapter_end`; contents references show the narrowed range.

### Done when

- The suite and types pass.
- Rollback: revert S05.

---

## S06: README and website get bookends and headnotes

Depends: S00, S04 (and S05 if shipped). Mode: inline. Budget: 2 files, at most 6 turns. Gate: owner approval before merging (it publishes).
Stories: D5.

### Files

- `README.md`. Add one "What's in it" bullet: BibleProject overview links at a book's start and end; optional daily headnotes, read back as the book's contents.
- `docs/index.html`.
  - **Zone 01:** on a first sitting, the headpiece ornament and "Before you begin: BibleProject's overview ↗".
  - **Zone 06:** the "Write a headnote" prompt, and the finished-book contents with dotted leaders and the tailpiece.
  - Reuse the mockup's ornament paths (`mockup.html` §5).
  - Use synthetic headnotes only. Link BibleProject as attributed human commentary.

### Checks and done when

- S00's manual checks pass again.
- Rollback: revert the commit.

