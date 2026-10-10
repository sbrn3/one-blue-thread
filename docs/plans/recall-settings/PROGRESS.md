# Progress — Memory library in the knot (recall-settings)

Plan: `plan.html` (C4, approved 2026-10-07). Recipes: `exec.md`.

S01 done | files 6 | V13 source column, event types | tests+types green | d98ae6a | gap: none
S02 done | files 3 | Memory add/editRange/reset/remove/learned/marked/cap; no per-book limit | tests+types green | eef41ac | gap: none
S03 done | files 6 | probe span seeded only; marked label removed | tests+types green | c6a9d86 | gap: none
S04 done | files 5 | passageRange + PassagePicker + contracts | tests+types green | 8e0a0d3 | gap: none
S05 done | files 8 | MemoryModal, MemoryStrip, Knot row, epoch store, RecallZone props | tests+types green | ea35406 | gap: owner device check vs `mockup.html#option-a`/`#picker`
S06 done | files 4 | frozen daily set + cap, multi-pick book end | tests+types green | bddf8eb | gap: owner device check of book end and cap
Device sweep 2026-10-10 (dev client, v0.11.0, Moto edge 50 neo): PASS list + marked list, add via picker, edit range, start over, delete (all live, no reload), daily cap 1 shows one card, picker lists scroll smoothly (owner). FIXED "Next due due today" → "Due today" (fix/device-sweep). GAP: book-end multi-pick (not at a book end).
