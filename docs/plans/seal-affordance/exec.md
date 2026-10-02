# Execute the fell-line seal

Grade: C2 — 7 product/test files across two layers (`src/ui`, `src/flow`), one
UI direction settled by mockup (`mockup.html`), two shippable slices. Supersedes
the unapproved C3 "open row" plan (`superseded-open-row/`).

## Protocol

Use one fresh session per slice. Read only `AGENTS.md`, this protocol, the slice,
`git status --short`, `git log --oneline -5`, and named files. Do not read
`plan.html`, other slices, `level-up.md`, `superseded-open-row/`, project
status/history, or the product spec. Append one bounded `PROGRESS.md` entry,
return at most 150 tokens, and stop.

Budgets: slice target <=1,200 estimated tokens, hard limit 2,000; progress entry
<=80. Inspect narrowly; quiet test output unless a failure needs expansion.

### Standing facts (do not re-derive)

- `src/ui/loom.ts` already takes `geometry(w, h, chapters, sealed, { pad, amp,
  slackCap })`. **No change to `loom.ts`.** `rowPlan` clamps pitch at
  `MAX_ROW_PITCH` 16, so cloth reaches `pad + (rows - 1) * pitch` and no further:
  the row *count* decides how far down the rail weaves.
- Vitest is node-only. Anything tested must be a pure exported function. A
  `'worklet'` directive string is harmless under Node.
- Flow's root `View` pads `insets.top`, but `ThreadRail` is `position:absolute;
  top:0`, so **rail y = screen y**, while the ScrollView's viewport starts at
  `insets.top`. A content-Y on screen, in rail coordinates, is
  `insets.top + contentY - scrollY`.
- `Flow` already holds `scrollY`, `contentHeight`, `layoutHeight` shared values
  and measures `scriptureTop/Bottom` from a child `onLayout`. Copy that pattern.
- The ScrollView has `paddingLeft: 30` (`styles.scroll`), so SealZone's x=0 is
  screen x=30. The rail's centre is screen x≈13.
- `test/render-path-cost.test.ts` bounds one Flow render; re-run it.

## Standing decisions

- **Branch/worktree:** new sibling worktree `../thread-seal-fell-line` on
  `feat/seal-fell-line`, cut from `origin/main` (`fdaddbb` at planning). Copy
  `docs/plans/seal-affordance/` into it first (untracked in
  `thread-catch-me-up`). PR 1 = S01, PR 2 = S02, merged in order.
- **Unresolved gate:** creating the worktree, each commit, push, PR and merge
  need explicit user authorization. Plan approval is not that authorization.
- No events, migrations, PRNG, notifications, backup crypto or partner hand-off
  change. `seal` / `hold_cancel` logging, `tokens.seal.holdMs` 1200,
  `maxDriftPx` 20, `UNWIND_MS` 220, the 6 haptic pulses and the success haptic
  keep their exact semantics.
- Unverifiable steps record a gap in `PROGRESS.md`; never claim a pass.

## Execution waves

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S01 | 1 | — | inline | `src/ui/rail.ts`, `src/flow/ThreadRail.tsx`, `test/rail.test.ts` |
| S02 | 2 | S01 | inline | `src/ui/fellLine.ts`, `src/flow/SealZone.tsx`, `src/flow/ThreadRail.tsx`, `src/flow/Flow.tsx`, `test/fellLine.test.ts`, `test/rail.test.ts` |

---

## S01 — ThreadRail: full height, calm, no bare warp under cloth

Depends: none · Mode: inline · Budget: 3 files, 1 test file, <=8 turns
Owns: `src/ui/rail.ts`, `src/flow/ThreadRail.tsx`, `test/rail.test.ts`

### Files

- `src/ui/rail.ts` — NEW — `RAIL_WIDTH = 26`, `RAIL_THREADS = 3`,
  `RAIL_OPTS = { pad: 4, amp: 0.7, slackCap: 1.2 }`;
  `railRows(height, pitch = MAX_ROW_PITCH) = max(2, ceil(height / pitch) + 2)`;
  `railCoverage(height)` = depth the woven cloth reaches for that row count.
- `src/flow/ThreadRail.tsx` — MODIFY:
  - constants from `rail.ts`; rows from `railRows`; `RAIL_OPTS` into **both**
    `geometry(...)` calls.
  - **Bare layer windowed below the fell** (prototype already written in
    `thread-catch-me-up`, uncommitted): wrap the bare `Svg` in an
    `Animated.View` (`overflow:'hidden'`, animated `top: fellPx`,
    `height: railHeight - fellPx`) with an inner `Animated.View` counter-offset
    `top: -fellPx`, so slack warp never paints under woven cloth.
  - drop the interlace `<G>` (illegible at 26pt; `detailLevel` drops it first
    for the same reason). One-line comment.
  - strokes: bare warp 1.8 / .30, woven warp 2.0 / .55, weft 2.6 / .85.
  - keep `fillStyle`'s worklet, `pointerEvents="none"`, and the
    not-gated-on-reduced-motion comment.

### Tests

- `test/rail.test.ts` — NEW, pattern `test/loom.test.ts`: for heights
  480/736/1024, `railCoverage(h) >= h`; regression — old `ROW_PITCH` 20 rows fall
  short at 736; with `RAIL_OPTS`, a bare thread's `warpX` spread stays under
  `sett.sx` (threads never cross).

### Verify

- `npx vitest run test/rail.test.ts test/loom.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5` · `npm run typecheck`

### Done when

- Tests/types pass inside `Owns`; stories 13–14 satisfied.
- Gap: rail appearance at top, middle and end of scroll is owner-verified.
- Rollback: revert the S01 commit; `ThreadRail` is self-contained.

---

## S02 — The fell-line seal, and the rail locking onto it

Depends: S01 · Mode: inline · Budget: 6 files, 2 test files, <=12 turns
Owns: see table

### Files

- `src/ui/fellLine.ts` — NEW, pure + `'worklet'`:
  - `fellLinePath(width, x0, amp, baselineY): string` — polyline from `x0` to
    `width - 16`, step 3; offset `(sin(x/23)·amp + sin(x/7.3+1)·amp·0.35)`
    ramped from 0 over the first 30px so it leaves the rail pinned.
  - `lineAmp(progress) = 2.4·(1 − easeInOut(progress)) + 0.25`.
- `src/ui/rail.ts` — MODIFY — add `railFell(progressPx, lineY | null,
  railHeight, sealedSweep)`:
  `base = lineY == null ? progressPx : min(progressPx, lineY)`, clamp `[0, H]`,
  then `base + (H − base)·sealedSweep`. `'worklet'`.
- `src/flow/ThreadRail.tsx` — MODIFY — new props `sealLineY: SharedValue<number>`
  (content Y, `-1` = unknown), `viewportTop: number` (`insets.top`), `sealed:
  boolean`, `reducedMotion: boolean`. In the worklet:
  `lineY = sealLineY < 0 ? null : viewportTop + sealLineY − scrollY`;
  fell from `railFell`. `sealedSweep` shared value: `withTiming(1, 600ms)` when
  `sealed` flips true during the session, set to `1` instantly on mount-if-sealed
  or under reduced motion; `0` when `sealed` is false (next day). Drives
  `fillStyle`, the bare window and the fell mark.
- `src/flow/SealZone.tsx` — MODIFY:
  - replace the loom `Svg` (`LOOM_W`/`LOOM_H`, `geometry(168, 96, 7, …)`) with a
    **row**: `marginLeft: -30` stretched to screen width, height 84; one `Svg`
    holding two `AnimatedPath`s from `fellLinePath` — bare (warp, 1.6, .45) and
    live weft (thread, 3, .95, `strokeDasharray`/`strokeDashoffset` on
    `ringProgress`, `d` re-derived from `lineAmp(ringProgress)` via
    `useAnimatedProps`). `x0 = 13`.
  - centred **pill** over the line: paper fill, `borderWidth 1`, `borderColor
    ink`, `borderRadius tokens.radius.pill`, `minHeight 48`, `paddingHorizontal
    tokens.space[6]`, label display 700 14. While holding: border + label
    `thread`, scale .985. Label = existing `helperText` ("Hold to seal" / "Read
    to the end to seal" / "Start reading to seal"); disabled = opacity .4. The
    `GestureDetector` wraps the **pill only**. The separate `holdLabel` text goes.
  - sealed: pill fades out (200ms), a mono label sits on the line (existing
    `sealedLabel` style + paper background, `paddingHorizontal 12`) reading
    `Sealed · day N` when new prop `dayLabel` is a number, else `Sealed`. The
    line stays blue (progress 1). If `sealed` flips with progress < 1 (tap or
    two-tap path), run progress to 1 over 300ms — instant under reduced motion.
  - tap / screen-reader / reduced-motion path: **same row and pill**, pill is a
    `Pressable` that seals on press (`accessibilityRole="button"`,
    `accessibilityLabel="Seal today's reading"`); the 96pt `ringFallback`
    circle goes. The line `Svg` is `accessible={false}`.
  - new prop `onLineLayout(contentY: number)`: root `onLayout` y + row `onLayout`
    y + 42.
  - "Use two taps instead" and its confirm row: unchanged.
- `src/flow/Flow.tsx` — MODIFY — `sealLineY = useSharedValue(-1)`; pass
  `onLineLayout={(y) => (sealLineY.value = y)}` and
  `dayLabel={showDayCount ? session.daysInBook : null}` to `SealZone`; pass
  `sealLineY`, `viewportTop={insets.top}`, `sealed={session.sealedToday}`,
  `reducedMotion` to `ThreadRail`.

### Tests

- `test/fellLine.test.ts` — NEW, pattern `test/loom.test.ts`: path starts at
  `x0` exactly on the baseline; offset never exceeds `amp·1.35`; ends at
  `width − 16`; deterministic; `lineAmp(0) = 2.65`, `lineAmp(1) = 0.25`.
- `test/rail.test.ts` — EXTEND `railFell`: no line → progress; line below
  progress → progress; line above → line; line above the screen → 0; clamps to
  H; `sealedSweep 1` → H.
- `test/ui-contracts.test.ts` — must still pass unchanged (SealZone is already on
  the Pressable allowlist; pill meets 44pt).

### Verify

- `npx vitest run test/fellLine.test.ts test/rail.test.ts test/ui-contracts.test.ts test/render-path-cost.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5` · `npm run typecheck`

### Done when

- Tests/types pass inside `Owns`; stories 1–12, 15–17 satisfied.
- Gaps (owner, dev build): rail fell meets the line exactly on a notched phone;
  the −30 margin row reaches the rail; hold/unwind/tap feel.
- Rollback: revert the S02 commit; S01 stands on its own.
