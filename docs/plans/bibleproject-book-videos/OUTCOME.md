# Outcome: book bookends (BibleProject overviews and headnotes)

Built in seven slices (S00–S06) and merged as PRs #57–#64. Fixes from the device check went in afterwards: #66, plus the release PR. Released as `v0.11.0`. 627 tests passing, plus 1 todo, and the typecheck is clean.

- **Overviews.** BibleProject's video overview is linked on a book's first sitting, under a hairline headpiece, and again at "You finished". The links cover all 66 books, and `npm run check:overviews` verified all 71 URLs by page title.
- **Headnotes.** After the seal, the reader can keep one optional line about the day's passage, or narrow it to verses. They can edit or delete it from the reading screen or from Reading history. The lines live in an additive **V14 `headnotes`** table outside the event log, keyed to the seal event. Backup and the unravel both include it.
- **Contents.** Each book's headnotes are read back in chapter order. They appear at "You finished", under a hairline tailpiece, and in Reading history. Tapping one opens the chapter viewer, with the headnote above the chapter and its verses highlighted.
- **Docs.** The README and the website were refreshed for the shipped app (S00, S06).

**Verified on the device** (dev client, 2026-10-09; full list in PROGRESS.md):
- the in-place v13 → v14 upgrade, with every event kept;
- writing, editing, narrowing and deleting a headnote, and its keyboard behaviour;
- a kill and reopen;
- the contents at the end of a book and in history;
- the headpiece and overview link on a book's first sitting.

**Found on the device and fixed:**
- A short sitting that fit on screen never unlocked the seal. This was an existing bug.
- Android drew the field's rule on all four sides.
- The verse picker list went blank.
- A headnote deleted in history still showed on the reading screen.

**Not verified on the device:**
- the encrypted export, unravel and restore round trip;
- a pre-V14 backup restore;
- the overview link with no network.

The owner picked up the phone before the export ran. Unit tests cover the first two (backup, reset and headnote tests). Screen-reader order and the largest font scale were not checked either.

**Deviations:**
- The headnote field's madder rule is a separate 2px bar, not a border.
- The verse picker scrolls to the range after its verses load, not through `initialScrollIndex`.
- Flow learns about headnote edits from history through `src/state/headnoteEpoch.ts`, the same pattern as `memoryEpoch`.
