# Progress: Book bookends (BibleProject overviews + headnotes)

Format: `SNN status | files N | focused result | suite result | types result | gap …`
Append one bounded entry per slice (at most 80 tokens). Include the What's-new draft for reader-facing slices.

S00 done | files 6 (README, index.html, what-thread-asks-you.html, sitemap, voice inventory, +PROGRESS) | brand tests 6/6 | suite 592 passed, 1 todo | types clean | gap: verified by headless Edge at 1100/900px + iframe overflow at 360/390 (none); not checked on a physical phone browser. No What's new (docs only).
S01 done | files 9 (overviews.ts, OverviewLink.tsx, Ornament.tsx, ArrivalZone, DismissalZone, check-overviews.mjs, package.json, inventory, ui-contracts) + test/overviews.test.ts | overviews 7/7 · brand/ui-contracts green | suite 599 passed, 1 todo | types clean | URLs: 71/71 verified by page title (npm run check:overviews), form bibleproject.com/videos/<slug>/ (site's own nav hrefs). gap: not seen on a device. What's new draft: "A new book opens with a link to BibleProject's video overview, and it comes back when you finish."
S02 done (merged; device checklist open) | files 14 (schema V14, headnote/index.ts, dump, reset, HeadnoteEditor, HeadnoteSheet, DismissalZone, Flow, inventory, ui-contracts, boundaries, schema.test) + test/headnote.test.ts | headnote 12 · schema/backup/reset/boundaries green | suite 614 passed, 1 todo | types clean | gap: plan.html mandatory migration checklist NOT run (dev client owned by another session) — release tag held until it is. What's new draft: "After you seal, you can keep one line about the day — a headnote. It's optional."
S03 pending
S04 pending
S05 pending
S06 pending
