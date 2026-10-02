# Execute the open row

Grade: C3 — 9 files across two layers (`src/ui`, `src/flow`), three slices with
disjoint ownership, and a shipped component (`ThreadRail`) changed independently
of the feature that motivated it.

## Protocol

Use one fresh session per slice. Read only `AGENTS.md`, this protocol, the slice,
`git status --short`, `git log --oneline -5`, and named files. Do not read
`plan.html`, other slices, `level-up.md`, project status/history, or the product
spec unless the slice names that dependency. Append one bounded `PROGRESS.md`
entry, return at most 150 tokens, and stop.

Budgets: slice target <=1,200 estimated tokens, hard limit 2,000; progress entry
<=80; worker result <=150.

Inspect narrowly: list paths first, search bounded symbols, read line ranges,
`git diff --stat` before targeted diffs, quiet test output unless a failure needs
expansion.

### Standing facts every slice may rely on (do not re-derive)

- `src/ui/loom.ts` already accepts `geometry(w, h, chapters, sealed, { pad, amp,
  slackCap })` and `warpX` reads `g.slackCap`. **No change to `loom.ts` is
  required or permitted by this plan** — its exported behaviour is covered by
  `test/loom.test.ts` and `Cloth`/`ThreadRail`/`WeaveZone` all depend on it.
- `rowPlan` clamps pitch to `MAX_ROW_PITCH` 16. Cloth therefore reaches
  `pad + (rows - 1) * pitch` pixels and no further; the **row count**, not the
  pitch, controls how far down a rail draws.
- `Flow` already derives `bolt` (`deriveBolt`, line ~78) on mount regardless of
  `session.sealedToday`, so the pre-seal open row needs no new data plumbing.
  `bolt.sealed`'s last entry is today and is `false` until sealed.
- Vitest is node-only: no component rendering, no RN. Anything that must be
  tested has to be a **pure exported function**, not a component.
- `test/render-path-cost.test.ts` bounds what one `Flow` render costs. Keep new
  SVG path counts bounded and re-run it.

## Standing decisions

- Branch/worktree/PR policy: a **new sibling worktree** `../thread-open-row` on
  `feat/seal-open-row`, cut from `main` (not from this worktree, which holds
  another session's uncommitted `apple-web-pwa` work). Other worktrees are
  active, so per `AGENTS.md` merges go through PRs, in order: **PR 1 = S01**
  (independently shippable), **PR 2 = S02 + S03**.
- **Unresolved gate:** commit, push, PR, and merge each need explicit user
  authorization. Plan approval is not that authorization.
- Unverifiable steps: record a gap in `PROGRESS.md`; never claim a pass. No
  Android device or emulator exists in this environment, so every visual and
  gesture behaviour here is owner-verified on a dev build.
- Cross-slice integration owner: inline (S03 joins the work).

## Execution waves

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S01 | 1 | — | inline | `src/flow/ThreadRail.tsx`, `src/ui/rail.ts`, `test/rail.test.ts` |
| S02 | 2 | — | inline | `src/ui/openRow.ts`, `src/ui/OpenRow.tsx`, `src/ui/Shuttle.tsx`, `src/flow/SealZone.tsx`, `test/openRow.test.ts` |
| S03 | 3 | S02 | inline | `src/flow/Flow.tsx`, `src/flow/WeaveZone.tsx`, `test/ui-contracts.test.ts` |

S01 and S02 have disjoint ownership and could run in one parallel wave, but
neither meets the delegation threshold on its own (each is ~3 files and well
under eight turns), and delegation is not authorized. Run inline, in order.

---

## S01 — ThreadRail: reach the fell, and calm down

Depends: none
Mode: inline
Budget: 3 files, 1 test file, <=8 turns
Owns: `src/flow/ThreadRail.tsx`, `src/ui/rail.ts`, `test/rail.test.ts`

### Files

- `src/ui/rail.ts` — NEW — the pure part, so the suite can hold it:
  - `export const RAIL_WIDTH = 26`, `RAIL_THREADS = 3`,
    `RAIL_OPTS = { pad: 4, amp: 0.7, slackCap: 1.2 }`.
  - `export function railRows(height: number, pitch = MAX_ROW_PITCH): number` —
    returns `Math.max(2, Math.ceil(height / pitch) + 2)`.
  - `export function railCoverage(height: number): number` — the pixel depth the
    woven cloth actually reaches for that row count, so a test can assert it is
    `>= height`.
- `src/flow/ThreadRail.tsx` — MODIFY:
  - replace the local `RAIL_WIDTH` / `ROW_PITCH` / `WARP_THREADS` constants with
    the imports from `src/ui/rail.ts`; row count comes from `railRows`.
  - pass `RAIL_OPTS` as the fourth argument to **both** `geometry(...)` calls
    (`slack` and `cloth`), so the three threads stop crossing at a 4pt sett.
  - delete the third `<G>` block — the interlace pass over the woven half. At
    26pt it is illegible; `Cloth`'s own `detailLevel` drops interlace first for
    the same reason. Leave a one-line comment saying so.
  - soften strokes: bare warp `strokeWidth 1.8 / strokeOpacity .3`; woven warp
    `2.0 / .55`; weft `2.6 / .85`.
  - **do not** touch `fillStyle`, the `useAnimatedStyle` worklet, the
    `pointerEvents="none"`, or the deliberate not-gated-on-reduced-motion
    comment.

### Tests

- `test/rail.test.ts` — NEW — closest pattern: `test/loom.test.ts` (pure
  geometry, no fakes):
  - `railRows` covers the full height at the pitch clamp: for heights 480/736/1024,
    `railCoverage(h) >= h`.
  - regression: the shipped `ROW_PITCH` 20 would *not* have covered 736 —
    assert the old formula's coverage is short, so the bug cannot come back
    silently.
  - `RAIL_OPTS.slackCap` keeps lateral drift below the sett: with
    `geometry(26, 736, 3, [...false], 4, RAIL_OPTS)`, `warpX` spread across a
    thread stays under `sett.sx`.

### Stop inspecting when

- `ThreadRail`'s two `geometry` calls, its three `<G>` blocks and its constants
  are located. No other caller imports `ThreadRail`'s internals.

### Verify

- `npx vitest run test/rail.test.ts test/loom.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass; changes stay inside `Owns`.
- Acceptance stories 12–15 are satisfied.
- Gap to record: the rail's on-device appearance at both ends of the scroll is
  owner-verified only.
- Rollback: revert the single commit; `ThreadRail` is self-contained.

---

## S02 — The open row and the shuttle

Depends: none (but land after S01 so the fell it lands on is already correct)
Mode: inline
Budget: 4 files, 1 test file, <=10 turns
Owns: `src/ui/openRow.ts`, `src/ui/OpenRow.tsx`, `src/ui/Shuttle.tsx`,
`src/flow/SealZone.tsx`, `test/openRow.test.ts`

### Files

- `src/ui/openRow.ts` — NEW — pure geometry for one row plus the warp that runs
  on past it:
  - `export const FUTURE_ROWS = 3`.
  - `export function openRowCrop(sealed: boolean[], contextRows = 0): boolean[]`
    — the last `contextRows + 1` entries of `sealed` (today last, `false`)
    followed by `FUTURE_ROWS` `false` entries.
  - `export function openRowIndex(contextRows = 0): number` — `contextRows`.
  - `export function shuttleTravel(clothWidth: number, shuttleWidth: number)`.
  - Rationale to carry in a comment: today's row must keep the bolt's sett and
    set-mark displacement, so the crop is fed through the *existing*
    `geometry()`; the future rows exist so `supportDistances` produces the
    increasing slack that reads as unread days.
- `src/ui/Shuttle.tsx` — NEW — `react-native-svg` only, no new dependency:
  - 54×26 boat outline + paper eye, filled `dyeFor(book)`; `Path` + `Ellipse`.
  - Presentational; takes `{ dye, style }`. No gesture, no state.
- `src/ui/OpenRow.tsx` — NEW — the record: bare warp for today's row (repainted
  as slack leaves it), the warp running on into `FUTURE_ROWS`, the live weft
  drawn by `strokeDashoffset`, its interlace revealed over the last 40% of the
  hold, and the 7×2 fell mark in the book's dye at `weftY(g, today, pad)`.
  - Props `{ width, sealed, chapterCount, dye, progress: SharedValue<number>,
    beat: SharedValue<number> }`. `accessible={false}` — the shuttle owns the
    accessible name.
  - Animate via `useAnimatedProps` on the weft, exactly as `SealZone` does now.
    Slack repaint is a JS-side `useMemo` keyed to a coarse progress bucket, not
    a per-frame React render — keep the UI thread doing the dash offset.
- `src/flow/SealZone.tsx` — MODIFY — hold path only:
  - new props `{ sealed: boolean[]; chapterCount: number; dye: string }`;
    existing `sealed: boolean` prop is renamed to `sealedToday` (update the two
    call sites in S03).
  - replace the hard-coded `geometry(168, 96, 7, Array(5).fill(true), {pad:8})`
    loom with `<OpenRow>` at measured width (`onLayout`, like `WeaveZone`) —
    never a fixed 168.
  - the `GestureDetector` wraps the **shuttle**, not the cloth. Keep
    `Gesture.LongPress().minDuration(tokens.seal.holdMs).maxDistance(
    tokens.seal.maxDriftPx).enabled(canSeal)`, `Gesture.Simultaneous(hold,
    Gesture.Native())`, `onScrollLock`, the six-pulse haptic sequence,
    `triggerSuccess`, `onHoldCancel`, and the unwind — **unchanged**. Only the
    node the gesture is attached to and what the shared value drives change.
  - shuttle position: `useAnimatedStyle` translating X by
    `shuttleTravel(...) * ringProgress.value`; ≥44pt target via `hitSlop`
    around the 54×26 art.
  - beat-up: on success, `withTiming` a `beat` shared value 0→1 over 180ms
    translating the woven row by -1.5pt; then call `onSeal()`.
  - the invitation nudge: `withRepeat(..., 3)` — **bounded to three cycles**,
    skipped entirely when `reducedMotion`.
  - rubric under the row becomes `tokens.font.mono` 11 / `.14em` / uppercase /
    `ink40`, stating the fact ("Today is the open row"); the instruction lives
    on the shuttle's accessible label and the existing helper text.
  - **unchanged:** the `sealMode === 'tap' || screenReaderEnabled ||
    reducedMotion` fallback branch, the two-tap link, `canSeal`, `floor` and
    every string in the disabled-state helper text.
- Decision to honour: under reduced motion the fallback button still renders,
  and `OpenRow` renders above it as a static record (no nudge, no travel). The
  gap is legible without motion, which is the point of drawing it as bare warp.

### Tests

- `test/openRow.test.ts` — NEW — pattern: `test/loom.test.ts`:
  - `openRowCrop` puts today last and appends exactly `FUTURE_ROWS` unread rows.
  - fed through `geometry`, `supportDistances` gives today `dist === 1` when
    yesterday was sealed, and strictly increasing slack across the future rows.
  - a two-day lapse inside the crop still produces the `setMarkOffsets`
    displacement, so the open row sits where the bolt would put it.
  - `shuttleTravel` never returns negative for a one-chapter book (narrow cloth).

### Stop inspecting when

- `SealZone`'s gesture block, `loom.ts`'s exports and `Cloth`'s painting order
  are located. Do not open `lab/`, `log/` or `state/` — this slice writes no
  events.

### Verify

- `npx vitest run test/openRow.test.ts test/loom.test.ts test/render-path-cost.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass; changes stay inside `Owns`.
- Acceptance stories 1–7, 16–19 are satisfied.
- `hold_cancel` / `seal` events are byte-identical to before — no event shape,
  no new event, no removed one.
- Gap to record: the gesture itself (drift tolerance, pulse timing, whether the
  shuttle is comfortable under a thumb) is owner-verified on a dev build only.
- Rollback: revert the commit; `SealZone`'s previous loom is restored intact.

---

## S03 — One zone, two states

Depends: S02
Mode: inline
Budget: 3 files, <=8 turns
Owns: `src/flow/Flow.tsx`, `src/flow/WeaveZone.tsx`, `test/ui-contracts.test.ts`

### Files

- `src/flow/Flow.tsx` — MODIFY:
  - pass `sealedToday={session.sealedToday}`, `sealed={bolt.sealed}`,
    `chapterCount={bundledChapterCount(bolt.book)}`, `dye={dyeFor(bolt.book)}`
    to `<SealZone>` (line ~581). `bolt` is already in scope from line ~78.
  - **delete** the separate `{session.sealedToday && <WeaveZone .../>}` render
    at line ~593; the sealed state now lives inside the seal zone. Leave
    `SrbaiZone` / `YearReviewZone` / dismissal exactly where they are, still
    gated on `session.sealedToday`.
  - keep `streak` (E3) flowing — it moves from `WeaveZone`'s prop to the seal
    zone's sealed state.
- `src/flow/SealZone.tsx` — MODIFY (sealed branch, second half of S02's work):
  - when `sealedToday`, render the whole bolt through the existing `Cloth`
    component with `dyeFor(book)`, the `Mark · 16 chapters` label and the
    `N of M days woven` caption — i.e. `WeaveZone`'s body — and **do not**
    render the lane. One cloth, one geometry.
  - the mockup bug this prevents: growing the bolt in *above* a lane that still
    holds context rows draws those days twice at two pitches in two SVGs that
    cannot align.
- `src/flow/WeaveZone.tsx` — MODIFY — keep the component (the knot's `compact`
  summary at `src/knot/Knot.tsx:190` is still a caller) but update its comment:
  it is no longer a flow zone. If S03 finds the flow and knot bodies have
  diverged, prefer extracting the shared body over duplicating it.
- `test/ui-contracts.test.ts` — MODIFY only if the new files introduce a raw
  `Pressable` (the shuttle uses `GestureDetector`, so probably not). If they do,
  add them to `INTERACTIVE_CALLER_ALLOWLIST` deliberately, not reflexively.

### Tests

- No new pure logic here; this slice is composition. Rely on the existing suite
  plus `test/render-path-cost.test.ts`, which must stay inside its bound with
  the seal zone now drawing a cloth pre-seal.

### Stop inspecting when

- `Flow`'s zone stack and both `WeaveZone` call sites are located.

### Verify

- `npx vitest run test/render-path-cost.test.ts test/history.test.ts test/session.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass; changes stay inside `Owns`.
- Acceptance stories 8–11, 20 are satisfied.
- The knot's compact weave still renders (owner-verified on a dev build).
- Rollback: revert the commit to restore `WeaveZone` as a flow zone; S02's seal
  zone keeps working, it simply renders a second cloth again.

---

## Commits

| # | Slice | Message | Files |
|---|---|---|---|
| 1 | S01 | `fix(rail): weave the full height and calm the sett` | `src/ui/rail.ts`, `src/flow/ThreadRail.tsx`, `test/rail.test.ts` |
| 2 | S02 | `feat(seal): draw today as an open row` | `src/ui/openRow.ts`, `src/ui/OpenRow.tsx`, `test/openRow.test.ts` |
| 3 | S02 | `feat(seal): the shuttle carries the weft` | `src/ui/Shuttle.tsx`, `src/flow/SealZone.tsx` |
| 4 | S03 | `refactor(flow): one cloth, before and after the seal` | `src/flow/Flow.tsx`, `src/flow/SealZone.tsx`, `src/flow/WeaveZone.tsx` |

PR 1 = commit 1. PR 2 = commits 2–4. Both need explicit authorization first.
