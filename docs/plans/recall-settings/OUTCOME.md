# Outcome — Memory library in the knot (recall-settings)

All six slices are built as planned on `feat/recall-settings`. 579 tests and the typecheck pass.

## What was built

- **Migration V13** is additive: it adds `passages.source`. Existing rows are NULL, meaning marked while reading. A V12 backup restores cleanly.
- **Memory API** (`src/memory/memory.ts`):
  - new calls `learned()`, `marked()`, `add()`, `editRange()`, `learnRange()`, `reset()`, `remove()`, `recallCap()` and `setRecallCap()`;
  - any number of passages per book;
  - one duplicate check that returns a result instead of throwing;
  - E4 marks exclude passages added with the picker.
- **Probe:** the span is seeded only and marks are ignored. The E9 arm roll is bit-identical (golden test).
- **Knot:**
  - a "Memory" row;
  - `MemoryModal`, built as direction A: the list, a passage page, Review now and the cap stepper;
  - `PassagePicker` with the pure `passageRange` helper.
- **Reading screen:**
  - recall shows up to the daily cap;
  - the set is frozen for the day and kept in `meta.recall_shown_today`, so a restart doesn't refill it;
  - the book end lets you learn none, one or several marks, then Done.

## Reviews

- **Smart Review (pre-build):** 3 HIGH and 6 MEDIUM findings, all resolved in `exec.md`. See plan.html → Smart Review.
- **Final diff audit:** no HIGH findings, 1 MEDIUM and 5 LOW, all fixed before the PR:
  - "Learn this" is now atomic (`learnRange` in one transaction);
  - stale text no longer shows on the passage page;
  - a refusal message clears when the selection changes;
  - the picker scrolls to the start verse and updates its highlight;
  - Android back steps through the picker one screen at a time;
  - `recall_shown` logs once per day, and the frozen set survives a restart.

## Deviations from the plan

- Learning rows show the reference only, not the mockup's snippet line. This was decided in Smart Review and keeps licensed NIV/ESV text from being fetched in bulk.
- `learnRange` was added to the API after the final audit.
- The frozen daily set is persisted in `meta`, a key the plan didn't name.

## Not verified here

No device was available. The plan's mandatory checklist (plan.html → Verification) is for the owner on a dev build installed over v0.8.0:
- upgrade;
- add, edit, start over and delete;
- the cap and the frozen set;
- Review now;
- the book end;
- the NIV/ESV picker offline;
- backup restore;
- TalkBack.
