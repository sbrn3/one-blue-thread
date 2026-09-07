# knot-declutter — grill summary

Subject: the knot (§04, `src/knot/`) is disorganised, cluttered, and has
controls that do nothing. Scratch handoff for `/plan`; delete once absorbed.

## Repo-resolved facts (not asked of the user)
- The knot is one bottom-sheet `<Modal>` holding a compact weave plus six
  `DisclosureSection` accordions — Practice (open by default), Reading & Study,
  Safekeeping, Partner, Support, App. `src/knot/Knot.tsx`.
- It aggregates ~60 interactive controls across 11 components: BackupSection
  (16), DictionaryLibrary (14), CueEditor (7), HistoryModal (6), plus
  Adaptive, Reset, Diagnostics, Partner, ChapterStrip, ChapterViewer.
- **`HistoryModal` and `ChapterViewer` are rendered as siblings AFTER the
  knot's own `</Modal>`** (`Knot.tsx:250-257`), so they are opened from inside
  an already-open modal without being nested in it — a known React Native
  stacking hazard and the leading structural candidate for the dead controls.
  `DictionaryLibrary`'s own `<Modal>` is already nested inside the knot's modal
  tree (it renders in the accordion body), so it is NOT in this class.
- The "App" section is a grab bag: `BrandOrigin` (origin story) + adaptive
  policy + account reset.
- The opener is an unbackgrounded 44pt target labelled "• Knot", mono 12pt in
  `ink40`, absolutely positioned at top 56 / right 20.
- Safekeeping and Support self-open when they need attention, re-evaluated on
  every knot open (`handleOpen`); attention comes from two sources —
  `backup.status()` (snapshot/external) and `needsAttention(getSupportSummary)`.
- Translation state/provider/copy is deliberately absent — owned by the parked
  `docs/plans/knot-translation-switch` plan. Keep that carve-out.
- The test suite is source-walking plus logic only; there is no
  `react-native-testing-library`, `react-test-renderer` or jsdom, so no
  component can currently be rendered in a test.
- No Android device or emulator exists in this environment (STATUS.md), so
  nothing here can be reproduced locally; the owner's device reports are the
  only bug evidence.
- The `thread-aesthetic-loom` worktree carries another session's uncommitted
  `apple-web-pwa` work (`docs/CONTEXT.md`, `docs/plans/README.md`, three
  untracked plan dirs). Leave those files alone.

## Resolved
- What "the buttons don't work" means → **both**: (a) taps open nothing at all,
  and (b) targets are hard to hit or hard to find, the opener included. Round 1.
- Repair vs rethink → **repair the broken first, then declutter**, as one plan
  in two passes; keep the accordion, fix what is inside it. Round 1.
- Declutter shape → **split everyday from rare**. Round 2.
- The opener → **give it a visible resting affordance in its current position**
  (hairline pill/backing), keeping the quiet loom aesthetic. Not relocated,
  not enlarged beyond the existing 44pt floor. Round 2.
- Verification → **extend the source-walking gate only**
  (`test/ui-contracts.test.ts`); no React Native Testing Library, no new
  render-test dependency. Round 2.
- Deeper layers → **move `HistoryModal` and `ChapterViewer` inside the knot's
  own `<Modal>` tree**, matching what `DictionaryLibrary` already does. No
  in-sheet drill-down rewrite; every screen keeps its current full-screen
  presentation. Round 3.
- Everyday tier → **compact weave, the cue, reading history**. Study library
  moves to the rare tier. Round 3.
- Merge gate → **merge on the source-walking gate; check on device at release
  time**, not before merge. Round 3.
- Rare tier grouping → **three groups: Your data** (Safekeeping + account
  reset), **Practice** (Partner + adaptive policy), **About** (origin story +
  Support/diagnostics). This dissolves the "App" grab bag. Round 4.
- Attention behaviour → **promote the section into the everyday tier, already
  open**, when Safekeeping or Support needs attention — preserving today's
  self-opening behaviour rather than hiding it behind a dot on "More".
  Round 4.

## Terms added to docs/CONTEXT.md
- **Pending, deliberately not written yet**: "the everyday tier" and "the rare
  tier" (working names for the knot's two levels). `docs/CONTEXT.md` is dirty
  with another session's uncommitted `apple-web-pwa` work, and STATUS.md says
  to leave that worktree state alone — appending here would fold this session's
  vocabulary into their diff. `/plan` should write both terms once those
  changes are committed or the work moves to its own branch.

## Decisions added to JOURNAL.md
- (none — the merge-gate decision is proposed at confirmation, below, and
  should be journaled by whoever starts implementation, not by this session,
  since it only takes effect if the work proceeds.)

## Open threads
- The source-walking gate cannot prove the dead controls work on a real
  device; it only prevents the pattern recurring. Accepted knowingly — this is
  the same blind spot (logic-only suite, nothing renders a component) that let
  the launch freeze ship through four releases. Worth a JOURNAL entry when
  implementation starts.
- The "taps open nothing at all" diagnosis is inferred from source, not
  reproduced. If the device check at release shows history/chapter rows still
  dead after nesting, the sibling-modal theory was wrong and the next suspect
  is the `KeyboardAvoidingView` (`behavior="height"` on Android) wrapping the
  transparent sheet in `Knot.tsx`.
- Which controls specifically felt "hard to hit" beyond the opener was not
  enumerated; the 44pt floor is already gated by `test/ui-contracts.test.ts`,
  so the issue is more likely contrast/affordance than target size.
- Not asked, deferred to `/plan`: whether the everyday tier's reading-history
  entry stays a "Reading history" button or shows recent chapters inline.
