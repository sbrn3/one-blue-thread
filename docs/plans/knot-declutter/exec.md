# Execute the knot declutter

Grade: C2 — 9 files, two layers (`src/knot` UI + a `src/lab/diagnostics` probe),
one settled UI direction, 3 shippable slices. Top of the C2 band; re-grade to C3
if S03 grows past 12 files.

## Protocol

Use one fresh session per slice. Read only `AGENTS.md`, this protocol, the slice,
`git status --short`, `git log --oneline -5`, and the files the slice names. Do not
read `plan.html`, other slices, project status/history, or `../thread-plan_3.html`.
Append one bounded `PROGRESS.md` entry, return at most 150 tokens, and stop.

Budgets: slice target <=1,200 tokens, hard limit 2,000; progress entry <=80.
Inspect narrowly: list paths, search bounded symbols, read line ranges, and show
quiet test output unless a failure needs expanding.

No delegation. C2 runs one serial task per wave, inline.

## Standing decisions

- **Branch/worktree policy: UNRESOLVED GATE.** The `thread-aesthetic-loom`
  worktree carries another session's uncommitted `apple-web-pwa` work plus two
  other sessions' untracked plan folders (`seal-affordance/`,
  `public-deep-dive/`) and a modified `.agents/skills/grill/SKILL.md`.
  Committing here risks sweeping those in. The plan is a **new sibling worktree**
  `../thread-knot-declutter` on `fix/knot-declutter` cut from `main` (997a618),
  merged back by PR. Creating that worktree and every commit/push/PR needs
  explicit user authorization — plan approval alone does not grant it.
- Moving worktrees means copying `docs/plans/knot-declutter/` (this file,
  `plan.html`, `mockup.html`, `PROGRESS.md`) across first; it is untracked here.
- Unverifiable steps record a gap in `PROGRESS.md`; never claim a pass.
- §13.6 hard rules: this change writes no events, touches no migration, no PRNG,
  no notification scheduling, no backup crypto, no partner hand-off. The single
  existing `log.write({ type: 'knot_open' })` call keeps its exact semantics —
  it fires when the knot opens, never when a tier or group is expanded.

## Execution waves

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S01 | 1 | — | inline | `src/knot/Knot.tsx`, `test/ui-contracts.test.ts` |
| S02 | 2 | S01 | inline | `src/knot/Knot.tsx`, `src/lab/diagnostics.ts`, `test/diagnostics.test.ts` |
| S03 | 3 | S02 | inline | `src/knot/*`, `test/ui-contracts.test.ts`, `docs/CONTEXT.md` |

---

## S01 — Nest the child modals, and gate the pattern

Depends: none
Mode: inline
Budget: 2 files, 1 test file, <=8 turns
Owns: `src/knot/Knot.tsx`, `test/ui-contracts.test.ts`

The repair. Independently shippable and worth shipping alone: it is the fix for
"taps open nothing at all".

### Files

- `src/knot/Knot.tsx` — MODIFY — `Knot`, return statement ~L142-260.
  `<HistoryModal>` and `<ChapterViewer>` currently render as siblings **after**
  the knot's own `</Modal>`, i.e. a second modal opened from inside an already
  open one. Move both inside `<View style={styles.sheet}>`, as siblings of
  `<ScrollView>` and **after** its closing tag — inside the modal tree, outside
  the scroll content so they are never scroll children. Props, state and
  callbacks are unchanged; this is a relocation, not a rewrite. The outer
  fragment then wraps only the opener `<Pressable>` and the one `<Modal>`.
  Match what `DictionaryLibrary` already does correctly — its `<Modal>` renders
  inside the accordion body and is not in this failure class.

- `test/ui-contracts.test.ts` — MODIFY — add one invariant beside the existing
  source-walking checks. Follow the file's own pattern exactly: `walk(SRC)`,
  `codeOf`, `toRepoPath`, a regex, a named `it(...)`.

### Tests

- `test/ui-contracts.test.ts` — new case: *"no component renders a modal-opening
  child after its own last `</Modal>`"*. Shape, no code bodies:
  - build `MODAL_RENDERING` = the set of exported component names whose source
    file contains `<Modal` (derive from the filename/`export function` pair
    while walking `SRC`);
  - for each file containing `</Modal>`, take the substring after its **last**
    `</Modal>` and assert no `<Name` from `MODAL_RENDERING` appears in it;
  - failure message must name the file and the offending child component.
  - This is a source-walking approximation, not a render test — say so in a
    comment, the way the `it.todo` font gap is documented rather than faked.
- Guard against a vacuous pass: assert `MODAL_RENDERING` is non-empty and
  contains at least `HistoryModal` and `ChapterViewer`. A regex that silently
  matches nothing is the main way this check could rot.

### Stop inspecting when

- The two child components are relocated and the new test fails before the fix
  and passes after it (verify in that order — a test that never went red proves
  nothing).

### Verify

- `npx vitest run test/ui-contracts.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Stories 1, 2, 15 satisfied.
- The new invariant went red on the pre-fix tree and green after.
- Recorded gap: no automated check proves the modals actually present on a
  device; that lands at release-time spot-check by owner decision.
- Rollback: `git revert` the single commit; the relocation is self-contained.

**Commit:** `fix(knot): open reading history and the chapter viewer from inside the sheet`

---

## S02 — The opener earns an affordance, and a meaning for its dot

Depends: S01
Mode: inline
Budget: 3 files, <=8 turns
Owns: `src/knot/Knot.tsx`, `src/lab/diagnostics.ts`, `test/diagnostics.test.ts`

Mockup direction **iii**: identical to a hairline pill at rest, but the leading
`•` becomes a real attention dot when something needs the reader.

### Files

- `src/lab/diagnostics.ts` — MODIFY — add
  `export function hasSupportAttention(db: SqlDb, now?: () => number): boolean`
  next to `needsAttention` (~L113). It must answer the same question
  `needsAttention(getSupportSummary(db))` answers, but cheaply: read
  `invariant_failed`, `recovery_snapshot_last_ok` and `recovery_snapshot_last_error`
  from `meta`, plus one bounded recent-errors query. **Do not** call
  `getAmendmentLog` or build the full `SupportSummary` — the opener runs this on
  the reading screen, and an unbounded read on that path is exactly the shape of
  the `cueTerms` launch hang (JOURNAL 2026-09-06). Keep `getSupportSummary`
  untouched; the knot body still uses it.
- `src/knot/Knot.tsx` — MODIFY — `styles.button` (~L263): add
  `borderWidth: 1`, `borderColor: tokens.color.ink15`, and a translucent
  `tokens.color.paper` background so the pill holds its shape over scripture.
  Keep `top: 56 / right: 20`, the 44pt floor, and `zIndex: 200` exactly. Replace
  the literal `'• Knot'` string with a `<View>` dot + `<Text>Knot</Text>`; the dot
  is `tokens.color.ink40` at rest and `tokens.color.madder` when attention is
  needed. Add closed-state attention via `useState` + `useEffect` calling
  `backup.status()` and the new `hasSupportAttention(db)` on mount and again in
  `handleClose`, so dismissing the knot re-reads it. Extend
  `accessibilityLabel` — append ", needs attention" only when the dot is lit; the
  dot must never be the sole carrier of the signal.

### Tests

- `test/diagnostics.test.ts` — MODIFY — follow the existing `better-sqlite3` fake
  and injected-`now` patterns already in that file. Assert `hasSupportAttention`
  agrees with `needsAttention(getSupportSummary(db))` across the same fixtures:
  clean db, invariant failed, snapshot error set, recent error inside and outside
  the 7-day window. **The equivalence is the contract** — two functions answering
  one question is the risk this slice introduces, so pin them together.

### Stop inspecting when

- `hasSupportAttention` matches `needsAttention` on every existing diagnostics
  fixture and touches no unbounded query.

### Verify

- `npx vitest run test/diagnostics.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Stories 3, 4, 16, 17 satisfied.
- Rollback: `git revert`; `hasSupportAttention` is additive and has no callers
  outside `Knot.tsx`.

**Commit:** `feat(knot): give the opener a resting affordance and a live attention dot`

---

## S03 — Everyday tier over a grouped rare tier

Depends: S02
Mode: inline
Budget: 5 files + 1 doc, <=12 turns
Owns: `src/knot/Knot.tsx`, `src/knot/MoreSection.tsx`, `src/knot/DisclosureSection.tsx`, `src/knot/ChapterStrip.tsx`, `src/knot/index.ts`, `test/ui-contracts.test.ts`, `docs/CONTEXT.md`

Mockup direction **A · Quiet list**. No new navigation concept: `More` is a final
row that expands in place into three labelled groups.

### Files

- `src/knot/DisclosureSection.tsx` — MODIFY — add an optional `nested?: boolean`
  prop. When set, the header uses the smaller weight/indent used for a group's
  child rows so a disclosure inside a disclosure still reads as subordinate.
  Keep `expanded`/`onToggle` parent-owned; do not add internal state.
- `src/knot/ChapterStrip.tsx` — MODIFY — direction A shows reading history as a
  **row with a chevron**, not an `ActionButton`. Keep the `hasHistory` empty
  state ("Nothing sealed yet.") and the `onOpen` callback; restyle to match the
  disclosure row's summary/status/chevron geometry so the everyday tier reads as
  one list. Preserve the comment's rule: history is reachable any time, never
  gated behind sealing.
- `src/knot/MoreSection.tsx` — NEW — renders the rare tier's three groups behind
  a group label each:
  - **Your data** — Safekeeping (`BackupSection`), Starting over (`ResetSection`)
  - **Practice** — Partner (`PartnerSection`), Adaptive policy (`AdaptiveSection`)
  - **About** — Origin story (`BrandOrigin`), Support (`DiagnosticsSection`)
  Signature: `MoreSection({ services, db, log, today, openSections, onToggle, backupStatus, supportSummary })`.
  Owns no open-state of its own — the parent keeps owning it, matching
  `DisclosureSection`'s existing contract. Reuse `styles.sectionLabel` (mono
  11pt, 1.5 letter-spacing, uppercase, `ink40`) for the group labels; it already
  exists in `Knot.tsx` and moves here.
- `src/knot/Knot.tsx` — MODIFY — replace the flat six-section body:
  - `SectionKey` becomes `'practice' | 'more' | 'safekeeping' | 'partner' | 'support' | 'app-origin' | 'adaptive' | 'reset'`; default `practice: true`, everything else false.
  - Everyday tier order: paused banner → **promoted attention section (if any)** →
    `WeaveZone` → Practice disclosure (`CueEditor`) → reading-history row →
    `More` disclosure containing `<MoreSection>`.
  - **Promotion**: `handleOpen` currently sets `safekeeping`/`support` open when
    they need attention. Change it to set a `promoted: 'safekeeping' | 'support' | null`
    state; that section renders in the everyday tier, already expanded, and is
    then **omitted from its group inside More** so it never appears twice.
    Re-evaluated on every open, as today.
  - `DictionaryLibrary` leaves the everyday tier with the rest of Reading &
    Study. Its `book` prop currently derives from `viewingEntry?.book ?? meta.get(db,'current_book') ?? 'genesis'` — carry that expression across verbatim.
  - Do not touch `bolt`, `hasHistory`, `handleCueSave`, the focus helpers, or the
    `knot_open` log write.
- `src/knot/index.ts` — MODIFY — the header comment still describes "one sheet
  containing the weave, a chapter strip… built in W5". Rewrite to the two tiers.
- `docs/CONTEXT.md` — MODIFY — **gated on the dirty-tree resolution above.** Add
  two glossary entries only (no implementation detail): *the everyday tier* and
  *the rare tier*. If the file is still carrying another session's uncommitted
  changes, record the gap in `PROGRESS.md` and leave it.

### Tests

- `test/ui-contracts.test.ts` — MODIFY — add `src/knot/MoreSection.tsx` to
  `INTERACTIVE_CALLER_ALLOWLIST` **only if** it ends up holding a raw
  `Pressable`/`TextInput`; if it composes `DisclosureSection` only, do not add it
  — the third existing test fails on stale allowlist entries.
- No new behavioural test: the tier split is layout, which this suite explicitly
  does not render. Named as a deliberate gap, not an oversight.

### Stop inspecting when

- Every one of the eight rare items has exactly one home, and the promoted
  section appears in exactly one place.

### Verify

- `npx vitest run test/ui-contracts.test.ts`
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Stories 5-14, 18-21 satisfied.
- No section renders twice when promoted.
- Recorded gap: nothing automated proves the visual hierarchy; owner spot-check
  at release.
- Rollback: `git revert`; S01 and S02 stand on their own, so reverting S03
  restores the flat accordion **with** the modal fix and the new opener intact.

**Commit:** `refactor(knot): split the sheet into an everyday tier and a grouped rare tier`
