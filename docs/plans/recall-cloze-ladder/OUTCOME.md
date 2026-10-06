# Outcome — Recall cloze ladder + narrowed probe (#40, #41)

Built as planned in five slices on `feat/recall-cloze-ladder`; 564 tests and typecheck green.

- **Migration V12** (additive, no backfill): `passages.rung`, `probes.verse_start/verse_end/marked`, `days.first_verse/last_verse`, `events.verse_first/verse_last`. A V11 dump restores into V12 and the effective rung is derived from the Leitner box.
- **Cloze ladder**: `src/memory/ladder.ts` and `cloze.ts`. Seven rungs; key words only; the hidden set is seeded by passage id and word index so steps nest. `grade()` moves the rung (held +1, lost −1) without changing Leitner boxes or dates.
- **Probe**: asks about up to 3 verses inside the verses actually read (recorded at seal); a marked verse wins. The arm roll is bit-identical (golden test). The dose analysis counts only span-level grades.
- **UI**: `RecallZone` draws the cloze card with letter stubs / underscore gaps and four step bars; `ProbeZone` shows the span and its reference.

**Not verified here** (no device available): on-device look and wrapping of underscore gaps and stubs, TalkBack/VoiceOver reading of the paragraph label, and an in-place upgrade from a v0.7.0 install. These are the owner checks in the plan's verification tab.

**Deviation**: `ClozeToken` hidden tokens also carry `lead`/`word`/`trail` so punctuation stays outside the gap.
