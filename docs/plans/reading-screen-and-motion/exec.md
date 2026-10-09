# Execute Reading screen and motion

Grade: C4. The triggers:

- about 30 files across 11 slices;
- three layers: native launch config, gestures, and UI/motion;
- a gesture root cause that is still uncertain;
- presentation changes next to running experiments (E1 hold, E9 probe, E4/signature reading events).

Direction **A · Open at the text** was approved 2026-10-08 (`mockup.html#a`). Smart
Review findings were resolved into this file the same day (see plan.html → Smart
Review).

## Protocol

Use one fresh session per slice. Read only:

- `AGENTS.md`;
- this protocol and the slice;
- `git status --short` and `git log --oneline -5`;
- the files the slice names.

Do not read `plan.html`, other slices, project status/history, or the full
product spec unless the slice names that dependency. Append one bounded
`PROGRESS.md` entry, return at most 150 tokens, and stop.

Budgets:

| Item | Limit |
|---|---|
| Shared instructions | ≤500 estimated tokens |
| Slice | target ≤1,200; hard limit 2,000 |
| Progress entry | ≤80 |
| Worker result | ≤150 |

Estimate tokens as UTF-8 bytes / 4.

Inspect narrowly:

- list paths first;
- search for bounded symbols;
- read line ranges;
- run `git diff --stat` before targeted diffs;
- keep test output quiet unless a failure needs expanding.

Never read `../thread-plan_3.html` whole.

**Device evidence.** Use S00's scripts on the **dev app only**:

```sh
node scripts/device/rec.mjs <name> <secs> --fps N -- <action>   # tiles frames into one PNG
node scripts/device/ui.mjs tap <label>
```

- The scripts refuse the release package. Never launch, tap, install over, or point Metro at `com.sngugi.thread`. It holds the owner's real data, and every launch writes an `app_open` row.
- To check release-speed behaviour, serve the dev app a release-mode bundle with `APP_VARIANT=development npx expo start --dev-client --no-dev --minify --lan`.
- A locked or unplugged phone means a gap: ask the owner to unlock it, or record the gap. Never claim a pass you did not see.

## Standing decisions

- **Branch/worktree/PR.**
  - Work in the sibling worktree `thread-reading-motion` on `feat/reading-motion`.
  - **Wave 1 ships first as its own PR and release.** It fixes the broken launch, seal hold and italic.
  - Later waves follow as one PR each, merged in order.
  - Commit, push, PR, merge and tag each need explicit owner authorization. Without it, a slice stops at "verified, uncommitted".
- **Boundaries accepted by the owner, 2026-10-08.** All three are journaled by S10 with build SHAs.
  - **E1:** hold feedback and commit timing (S02). This covers `hold_cancel` and the signature's mechanic-friction rate (`src/lab/signature.ts` ~85–93).
  - **E9:** the probe's presentation changes (S06). It now sits inside the list, **shown open**, so neither firing nor answering changes.
  - **E4/signature:** short sittings now fire `reading_start`/`scroll_end` without a scroll (S06).
- **Probe.** It stays open by default in the list (owner, 2026-10-08). No new event type. The event-log schema is untouched.
- **New dependency approved.** `expo-splash-screen` (first-party, SDK-pinned) for S01 only.
- **Unverifiable steps.** Record a gap; never claim a pass.
- **Cross-slice integration owner.** S10, inline.
- **Motion rules.**
  - Reanimated (UI thread) or RN Modal only.
  - No spring or bounce, and text never fades in.
  - Under `useReducedMotion()` the end state shows immediately.
  - Hold tap-fallbacks stay: `sealMode 'tap'`, screen reader, reduced motion.
  - Any irregularity comes from deterministic functions of index or position. `Math.random` is banned, per `test/boundaries.test.ts`.
- **Visual rules.**
  - `src/ui/tokens.ts` values only.
  - No shadows or gradients.
  - Synthetic data in committed images.

## Execution waves

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S00 | 1 | — | inline | `scripts/device/**`, `.gitignore`, `AGENTS.md` (phone section) |
| S05 | 1 | — | inline | `src/ui/tokens.ts` (`motion`), `src/ui/motion.ts`, motion constants in `ThreadRail`/`SealZone`/`LaunchWeave`/`ResetSection` |
| S01 | 1 | S05 | inline | `App.tsx`, `index.ts`, `app.json`, `package.json`/lock, `src/ui/LaunchWeave.tsx`, `src/startup/**` |
| S02 | 1 | S05 | inline | `src/flow/SealZone.tsx`, `src/knot/ResetSection.tsx`, `src/ui/holdGesture.ts`, `src/state/sealRehearsal.ts`, `Flow.tsx` (scroll lock + ScrollView only) |
| S03 | 1 | S01 | inline | `assets/fonts/Newsreader-Italic.ttf`, `THIRD_PARTY_NOTICES.md`, `App.tsx` (`useFonts` map), `tokens.font`, 7 italic sites (style blocks) |
| S04 | 2 | wave 1 | inline | `WeaveZone.tsx` (sizing), modal files, `VerseContextSheet.tsx`, `src/study/index.ts` (prewarm), `Flow.tsx` (prewarm call) |
| S06 | 3 | S04 | inline | `beforeYouRead.ts`, `BeforeYouRead.tsx`, `readingProgress.ts`, the arrival and before-reading zones, `Flow.tsx` |
| S07 | 3 | S06 | inline | `ArrivalZone.tsx` (weft), `BeforeYouRead.tsx` (stitch) |
| S08 | 4 | S07 | inline | `WeaveZone.tsx` (shuttle), `Flow.tsx` (`justSealed`), `sealRehearsal.ts` |
| S09 | 4 | S08 | inline | `src/knot/Knot.tsx` |
| S10 | 5 | all | inline | docs, `src/whatsNew/index.ts`, `OUTCOME.md` |

Run everything serially. `Flow.tsx` is touched by S02, S04, S06 and S08, each in a
named region, so no two run at once. Wave 1 may use parallel delegates only for
S00 and S03, and only if the owner authorizes it.

## S00 — Device review toolkit

Depends: none. Mode: inline. Budget: 5 files, 0 tests, ≤8 turns.
Owns: `scripts/device/**`, `.gitignore`, and the AGENTS.md "The owner's phone" section.

### Files

- `scripts/device/adb.mjs` — NEW.
  - Resolve adb from the `ADB` env var, then PATH, then the winget path in AGENTS.md. Resolve ffmpeg from `FFMPEG`, then PATH, then `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials*\ffmpeg-*\bin`.
  - `adb(args)` and `ffmpeg(args)` call `execFileSync` with no shell, so Git Bash path-mangling cannot happen.
  - **Throw on any argument equal to `com.sngugi.thread` or starting with `com.sngugi.thread/`.** Only `.dev` is allowed.
- `scripts/device/rec.mjs` — NEW. Usage: `<name> <secs> [--fps 8] [--cols 8] [--crop x:y:w:h] -- <cmd…>`.
  1. Start `screenrecord --size 600x1334 --time-limit` in the background, run the action, then pull the recording.
  2. Tile with ffmpeg (`fps`, `crop`, `scale=200:-1`, `drawtext` frame numbers, `tile`) to `.device/<name>.png`.
  3. With no ffmpeg, fall back to on-device `screencap` bursts and print a warning.
- `scripts/device/ui.mjs` — NEW. `find <regex>` | `tap <regex>`.
  - Uses `uiautomator dump`, then `text`/`content-desc` plus bounds.
  - Exits "phone locked: ask the owner" when `dumpsys window` reports `isKeyguardShowing=true`.
- `.gitignore` — MODIFY: add `.device/`.
- `AGENTS.md` — MODIFY. Add a "Screen reviews" subsection covering:
  - the commands;
  - dev app only;
  - locked phone means ask;
  - dev-bundle cold start includes about 8 s of bundle load;
  - use `--no-dev --minify` for release-speed timing.

### Verify

- `node scripts/device/ui.mjs find .` lists elements on the dev app.
- `rec.mjs smoke 3 -- node scripts/device/ui.mjs tap "Open settings"` writes a PNG.
- Confirm the scripts sit outside `tsconfig` includes.
- `npm test` and `npm run typecheck` pass.

### Done when

- One command records an action and tiles it.
- Naming the release package throws.
- Rollback: delete `scripts/device/` and the subsection.

## S05 — Motion foundations

Depends: none. Mode: inline. Budget: 6 files, 1 test file, ≤8 turns.
Owns:

- `src/ui/tokens.ts` (the `motion` key only);
- `src/ui/motion.ts` (NEW);
- the duration constants in `ThreadRail.tsx` (`SWEEP_MS`), `SealZone.tsx` (`UNWIND_MS`, `SETTLE_MS`, `FADE_MS`), `LaunchWeave.tsx` (`ROW_MS`, `WEFT_MS`, `TENSION_MS`, `ACCELERATE_MS`) and `ResetSection.tsx` (`RESTORE_MS`).

### Files

- `tokens.motion` — MODIFY. Keep `sheet: 'slide'` and add:
  - the named durations, with **today's values unchanged**;
  - `stitchMs: 360` and `arrivalWeftMs: 600`;
  - easing names `'linear' | 'inOutCubic' | 'outCubic'`.
- `src/ui/motion.ts` — NEW.
  - `easing(name)` maps a name to Reanimated `Easing`.
  - `useMotion()` returns `{ reduced, ms(key) }`; `ms` returns 0 when reduced.
- Replace the local constants with token reads. This is a pure refactor with no visible change.

### Tests

- `test/motionTokens.test.ts`: every `*Ms` is a positive integer; the reduced map is all 0.
- `test/boundaries.test.ts` stays green.

### Done when

- Suite and types pass, and behaviour is unchanged.
- Rollback: revert.

## S01 — Launch without a white screen (F1)

Depends: S05. Mode: inline, **high-effort**, because the cost split is unmeasured.
Budget: 7 files, 1 test file, ≤12 turns.
Owns: `index.ts`, `App.tsx` (boot path), `app.json`, `package.json`/lock, `src/ui/LaunchWeave.tsx`, `src/startup/timing.ts` (NEW), `test/startupTiming.test.ts` (NEW).

### Files

- `src/startup/timing.ts` — NEW.
  - `mark(name)` and `summary(): {name, ms}[]`, using `performance.now()` and a module array, with no IO.
  - Marks:
    - `bundle`: the first line of `index.ts`;
    - `textRequired`: around the `web.json` require at `src/text/index.ts` ~8, read-only (record only);
    - `openDb` / `services`: `App.tsx` ~52–58;
    - `firstRender` and `sessionReady`: Flow;
    - `weaveFirstFrame`: LaunchWeave `useEffect`.
  - Log `console.log('[startup]', …)` once ready when `__DEV__` or meta `debug_startup='1'`. Read it with `adb logcat -s ReactNativeJS`.
- **Measure before changing anything.**
  1. Cold start the dev app with a `--no-dev --minify` bundle, using `am start -W` plus the marks.
  2. Classify the gap as native/bundle, the 4.4 MB `web.json` require, synchronous `openDb`/`createServices`, or the boot effects (`reconcile`, `maybeGenerateReports`, `tidyMarks`, `App.tsx` ~73–95).
  3. Record the numbers in PROGRESS.
- `expo-splash-screen` — ADD via `npx expo install expo-splash-screen` (owner-approved).
  - `app.json` plugins gets `["expo-splash-screen", {"image": "./assets/splash-icon.png", "backgroundColor": "#F4F1E9", "imageWidth": 160}]`.
  - `app.config.js` spreads `config`, so the dev variant inherits it. Check the prebuild output for `com.sngugi.thread.dev`.
  - `index.ts` or `App.tsx`: call `SplashScreen.preventAutoHideAsync()` at module load. LaunchWeave's first-frame effect calls `SplashScreen.hideAsync()`.
  - On the error path (`ErrorBoundary`), also hide the splash so it can never stick.
- `App.tsx` — MODIFY, **only if the measurement shows it is needed**.
  - Defer `reconcile`, `maybeGenerateReports` and `tidyMarks` with `InteractionManager.runAfterInteractions`, keeping their order and keeping `app_open` after `reconcile`. Writes stay byte-identical.
  - If `openDb` or the `web.json` require dominates, stop and record it. Lazy text loading is its own plan.

### Tests

- `test/startupTiming.test.ts`: order is kept, deltas are non-negative, and summary is idempotent.

### Done when

- A `rec.mjs launch` PNG (dev app, no-dev bundle) shows splash, then weave, then reading, with no white frame.
- The marks are in PROGRESS.
- **Needs a new dev-client APK** (the `Dev client APK` workflow) before the device check. The release check is the owner's normal update after release.
- Rollback: remove the plugin and package (APK rebuild) and revert the deferral.

## S02 — Holds work from touch-down (F2, F3)

Depends: S05. Mode: inline, **high-effort**.
Budget: 5 files, 1 test file, ≤12 turns.
Owns:

- `src/ui/holdGesture.ts` (NEW);
- `SealZone.tsx` (the `hold` gesture, ~106–135);
- `ResetSection.tsx` (~102–123 plus a dev rehearsal);
- `src/state/sealRehearsal.ts`;
- `Flow.tsx` (`scrollEnabled` state and the `Animated.ScrollView`).

### Known from code (Smart Review)

- The seal commits in `onFinalize`, which only runs on finger-up. That alone explains "lands on lift".
- `onBegin` calls `runOnJS(onScrollLock)`, which sets Flow state. The gestures are rebuilt every render (not memoised), and Flow passes new inline callbacks.
- `Gesture.Native()` is attached to a plain View, while the scroller is RN's own ScrollView, not gesture-handler's.

### Steps

1. **Unravel rehearsal first.** A dev-only "Rehearse the unravel" uses the existing `onReset` injection (`ResetSection.tsx` ~33) to swap the erase for a no-op toast. Without it, F3 cannot be tested safely.
2. **Instrument.** In the rehearsal, log timestamped `onTouchesDown`, `onBegin`, `onStart` and `onFinalize` from worklets via `runOnJS`.
3. **Build** `useHoldGesture({ holdMs, maxDriftPx, enabled, onProgressStart, onSuccess, onCancel, scrollLock })`:
   - memoised with `useMemo`;
   - progress starts in `onTouchesDown` or `onBegin`;
   - **success commits in `onStart`**, at `minDuration`, while still held;
   - `onFinalize` without success means cancel;
   - scroll lock goes through a shared value plus gesture-handler's `ScrollView` with `simultaneousWithExternalGesture`, instead of React state.
4. **Wire up SealZone and ResetSection** to the hook.
   - Keep `onHoldCancel`/`hold_cancel` exactly.
   - Keep the rehearsal routing, the haptic pulses and the `interactive` tap fallbacks.
   - `hold_start` exists in `types.ts:8` but is never logged. **Leave it unlogged.** Adding it is out of scope.

### Tests

- `test/holdGesture.test.ts`: the pure `progressAt(elapsed, holdMs)` helper and the cancel/commit decision table. The gesture itself is checked on the device.

### Done when

- A `rec.mjs seal` PNG (rehearsal) shows the line drawing from touch-down and the seal landing at about 1.2 s while held. An early release unwinds it.
- The unravel rehearsal behaves the same at 2.5 s.
- **Owner finger check** recorded. adb alone is not proof.
- The SHA is noted for S10's E1 boundary.
- Rollback: revert the files.

## S03 — Newsreader italic (F9)

Depends: S01 (shares the `App.tsx` `useFonts` map). Mode: inline.
Budget: 11 files, 0 tests, ≤6 turns.
Owns: the font file, `THIRD_PARTY_NOTICES.md`, `App.tsx` (`useFonts` map only), `tokens.font.scriptureItalic`, and the italic style blocks in:

- `ArrivalZone`
- `DismissalZone`
- `LapseZone`
- `ProbeZone`
- `RecallZone`
- `MemoryModal`
- `src/study/ResourceText.tsx`

### Steps

1. Download the OFL `google/fonts` `ofl/newsreader/Newsreader-Italic[opsz,wght].ttf` to `assets/fonts/Newsreader-Italic.ttf`, and add it to the notices beside Newsreader. It is the same family, not a new typeface.
2. Add `'Newsreader-Italic': require(...)` to `useFonts`, and set the token `font.scriptureItalic: 'Newsreader-Italic'`.
3. Replace `fontFamily: scripture` + `fontStyle: 'italic'` with `fontFamily: scriptureItalic` and drop `fontStyle`.
4. `ResourceText` ~34 `em` → `scriptureItalic` when its parent is scripture. ~37 `omit` is a display italic and Schibsted Grotesk has no italic file, so drop `fontStyle` and keep ink40 (recorded).

### Done when

- Screenshots show Newsreader italic on the cue line.
- `grep -rn "fontStyle: *'italic'" src` returns nothing.
- `ui-contracts` is green.
- Rollback: revert the token and sites.

## S04 — Sheets without jumps or delay (F4, F5, F6)

Depends: wave 1. Mode: inline. Budget: 9 files, 1 test file, ≤10 turns.
Owns:

- `WeaveZone.tsx` (sizing only);
- `HistoryModal.tsx`, `MemoryModal.tsx`, `ChapterViewer.tsx`, `DictionaryLibrary.tsx`, `VerseContextSheet.tsx`;
- `src/study/index.ts` (prewarm export);
- `Flow.tsx` (one prewarm call after `sessionReady`).

### Files

- `WeaveZone.tsx` ~33–50 — **F4 cause:** `width` starts at 0, so nothing draws until `onLayout`.
  - Seed the width from `useWindowDimensions().width` minus padding.
  - Reserve the height with a pure `boltHeight(chapterCount, rows, width)`, so the first frame is final.
- **F6 cause:** the first verse tap decodes the whole book's study pack on the JS thread (base64 + gunzip + JSON.parse, `src/study/index.ts` ~19, `packed.ts`).
  - Export `prewarm(book)`.
  - Flow calls it via `InteractionManager.runAfterInteractions` once the session is ready.
  - Measure tap-to-shown before and after with `timing.ts`; target ≤150 ms.
- **Rebase note (2026-10-09):** `main` gained `src/flow/HeadnoteSheet.tsx`, `src/knot/BookContents.tsx` and `src/ui/Contents.tsx` (PRs #57–#65). HeadnoteSheet is one of the sheets this slice unifies, so S04 owns it too.
- **F5, modals.** Find out why `animationType='slide'` snaps: parent re-render during open, `statusBarTranslucent`, or `presentationStyle`.
  - Fix it so every sheet slides with `tokens.motion.sheet`.

### Tests

- `test/weaveLayout.test.ts`: `boltHeight` is positive and stable for 1, 5, 16 and 150 chapters.

### Done when

- The `rec.mjs knot` PNG shows no reflow.
- The `rec.mjs verse` PNG plus timing marks show ≤150 ms, or a recorded gap with numbers.
- History and memory sheets visibly slide.
- Rollback: revert.

## S06 — Reading screen, Direction A (F10)

Depends: S04. Mode: inline, **high-effort**, because it sits next to E9, E11/E12 and E4.
Budget: 12 files, 2 test files, ≤14 turns.
Owns:

- `src/flow/beforeYouRead.ts` (NEW), `src/flow/BeforeYouRead.tsx` (NEW), `src/flow/readingProgress.ts` (NEW);
- `ArrivalZone.tsx`, `ProbeZone.tsx`, `RecallZone.tsx`, `LapseZone.tsx`, `WhatsNewCard.tsx`, `StudyHint.tsx`;
- `Flow.tsx` (~244–260 scroll handler, ~311–325 dismiss handlers, ~630–690 render);
- `test/ui-contracts.test.ts`, `docs/brand-voice-inventory.json`.

### Arrival header (`ArrivalZone.tsx`, matches `mockup.html#a`)

- Remove `minHeight: 400` and the centring.
- The lines, top to bottom:
  1. Mono caps date, plus `· day N in Book` when `showDayCount` (E11).
  2. Display 900/34 `Book N`.
  3. Mono 13 `verses a–b`, plus `· sitting i of n` when `showSittingCount` (E12).
  4. The cue in `scriptureItalic` 16/22, ink60.
- Accessibility order: date, title, subline, cue.
- Needs `verseStart`/`verseEnd` from `sittingVerses`.

- **Rebase note (2026-10-09):** on a book's first sitting, `ArrivalZone` now renders `<Ornament kind="head" />` and `<OverviewLink lead="Before you begin:" />` (PR #58). Keep both above the title, unchanged. They are the book's opening, not something due.

### Before-reading list

- `beforeYouRead.ts` — NEW, pure. `buildBeforeYouRead({ lapse, probe, due, whatsNew }): Item[]`.
  - Order: lapse, then probe, then memory, then what's new.
  - Each item is `{ kind, title, detail, startsOpen }`.
  - **`startsOpen` is true for lapse and probe** (owner decision), false for memory and what's new.
  - Empty input returns `[]`, and then nothing renders.
  - What's new keeps today's behaviour: shown **until dismissed**, not for one day.
- `BeforeYouRead.tsx` — NEW.
  - A mono caps header "Before you read", then rows ≥48 pt tall.
  - Each row has a dot: madder for lapse and probe, thread for memory, an outline for notes. Then the title, detail, and a right-hand action label that wraps at large font sizes.
  - **The probe row is titled "Yesterday's reading"**, not "Recall", to avoid clashing with recall.
  - Open rows render the existing zone as the body:
    - `ProbeZone embedded`
    - `RecallZone flush embedded`
    - `LapseZone embedded`, whose CueEditor `TextInput` must stay visible above the keyboard
    - What's new lines
  - Finished items (graded or skipped, recall done, notes dismissed) collapse to a done row.
  - Accessibility: each row is a `button` with `accessibilityState={{expanded}}` and `hitSlop` 8. Add it to `INTERACTIVE_CALLER_ALLOWLIST`.
- **StudyHint stays outside the list.** It is a single quiet line directly above Scripture, because it is about tapping verses. Precedence with what's new is unchanged: what's new wins.
- `ProbeZone`, `RecallZone`, `WhatsNewCard`, `LapseZone` — MODIFY. Add an `embedded` prop that drops the outer padding, heading and box.
  - Logging, grading, skip and dismiss behaviour stay byte-identical.
  - `probe_fired` stays at load (`Flow.tsx` ~538–541).

### Short sittings (Smart Review HIGH 1)

- The compact header can leave a 1–2 verse sitting shorter than the screen. Then `reading_start`/`scroll_end` never fire, and `canSeal` stays false.
- `readingProgress.ts` — NEW, pure. `fitsWithoutScroll({ scriptureTop, scriptureBottom, viewportHeight, contentHeight })`.
- After layout settles (both `onLayout` values > 0), Flow fires both events once, with fraction 1, when the scripture fits.
- E4/signature boundary noted for S10.

### Flow.tsx

- Replace the separate Lapse, Recall, Probe and WhatsNew blocks with `<BeforeYouRead … />` between `ArrivalZone` and `ScriptureZone`. Spec order is kept: arrival, recall, scripture.

### Tests

- `test/beforeYouRead.test.ts`:
  - order;
  - `startsOpen` flags;
  - what's new persists until dismissed;
  - empty returns `[]`;
  - day-1 `probe = null`;
  - lapse plus everything.
- `test/readingProgress.test.ts`: fits, overflows, and zero/unsettled layout returns false.

### Done when

- `rec.mjs arrival` PNGs on dev synthetic data (busy and quiet day) show verse 1 above the fold on the busy day and no gap.
- A one-verse sitting can be sealed without scrolling.
- TalkBack order checked once.
- Rollback: revert `Flow.tsx` to the old zones.

## S07 — Arrival motion (Direction A signature)

Depends: S06. Mode: inline. Budget: 2 files, 0 tests, ≤8 turns.
Owns: `ArrivalZone.tsx` (the weft element) and `BeforeYouRead.tsx` (row open/close).

- **Weft under the header.** An SVG `AnimatedPath`: a gentle wave 2 px wide in thread colour, from a deterministic function of x.
  - Its `strokeDashoffset` animates from length to 0 over `motion.arrivalWeftMs` (outCubic), once per mount.
  - The length is computed from the points, like `SealZone`'s `fellLineLength`.
  - Under reduced motion it is drawn immediately.
  - **The title does not rise or fade** (mockup's `m-rise` dropped).
- **Row open/close.** Reanimated `LinearTransition` on the list, plus a dashed madder stitch drawn down the body's left edge over `motion.stitchMs`. Close reverses it.
  - Rows that start open (lapse, probe) do not animate on first paint.
  - Under reduced motion they open instantly.

### Done when

- `rec.mjs arrival` shows the weft drawing in the first 600 ms and a memory row stitching open.
- Rollback: revert the two elements.

## S08 — Sealing weaves today's row (F8)

Depends: S07. Mode: inline. Budget: 3 files, 0 tests, ≤8 turns.
Owns: `WeaveZone.tsx` (the `animateTodayRow` prop and shuttle), `Flow.tsx` (the `justSealed` flag), and `sealRehearsal.ts`.

- `Flow.tsx`: `justSealed` is set to true in `handleSeal`, and in the rehearsal's `finish`, never from loaded state. A reopened, already-sealed day stays static. The knot's `WeaveZone` (Knot.tsx ~258) never receives it.
- **Rehearsal.** In dev, when the rehearsal is `'sealed'`, Flow renders `WeaveZone` with the real bolt, which is currently gated on `session.sealedToday` (~709). That makes S08 verifiable. Nothing is logged.
- `WeaveZone.tsx`:
  - Today's row draws by dash-offset over `motion.weftPassMs`, linear, with direction alternating by row parity (boustrophedon).
  - A walnut shuttle glyph rides the row's leading end.
  - The fell line then advances one row over `motion.tensionMs`.
  - Under reduced motion it is static.

### Done when

- A `rec.mjs seal` PNG of the rehearsal shows the pass and then the fell line advancing.
- Reopening a sealed day is static.
- Rollback: drop the prop.

## S09 — The knot comes off the beam

Depends: S08. Mode: inline. Budget: 1 file, 0 tests, ≤8 turns.
Owns: `src/knot/Knot.tsx`.

- Keep the Modal slide and its duration.
- A static selvedge on the sheet's top edge: warp ticks plus one 3 px thread line in SVG.
- On open, one weft line draws under each everyday-tier heading, staggered 45 ms, over `motion.stitchMs`. Content never fades.
- Static under reduced motion.
- Tier logic and section order are untouched.

### Done when

- `rec.mjs knot` shows the selvedge and staggered wefts.
- Open-to-usable takes no longer than today's ~300 ms.
- Rollback: revert.

## S10 — Integration, docs, audit

Depends: all. Mode: inline. Budget: 6 files, ≤10 turns.
Owns: `JOURNAL.md`, `docs/CONTEXT.md` ("Before you read"), `STATUS.md`, `docs/plans/README.md`, `src/whatsNew/index.ts`, `OUTCOME.md`.

- **JOURNAL decision entry.** Direction A, plus the three boundaries with SHAs:
  - **E1** (S02): hold commit and feedback timing, `hold_cancel` and signature friction.
  - **E9** (S06): presentation only. The probe is still shown open and still logged at load.
  - **E4/signature** (S06): short sittings fire `reading_start`/`scroll_end` without scrolling.
- **What's new.** Wave 1's release ships its own entry. Drafts for the owner to edit (≤120 characters each):
  - Wave 1: "Holding to seal now shows the line pulling taut as soon as you touch it." / "The app opens on linen, without the white screen."
  - Final: "Scripture now starts on the first screen; anything due before reading is gathered above it." / "Sealing weaves today's row into the cloth."
- **Device review.** Re-run F1–F11 with `rec.mjs` on the dev app and compare against plan.html → Device audit.
  - Reduced motion: ask the owner before toggling the phone's "Remove animations", and restore it afterwards. Otherwise record a gap.
- **Independent final diff audit** against plan.html and this file. Fix HIGH and MEDIUM findings.
- **OUTCOME.md**: commits, PRs, verification, and remaining gaps.
- Rollback: docs only.
