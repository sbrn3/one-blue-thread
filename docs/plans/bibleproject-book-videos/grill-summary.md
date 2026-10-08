# BibleProject book videos + daily takeaways — grill summary

## Framing

The owner wants context with a summary before and after reading a book, "just
to help consolidate things": a link to BibleProject's video overview at the
start and end of every book. Beyond that, the reader writes one takeaway
message every day; at the end of the book those takeaways are shown back as a
summary. Previous books can be reviewed along with their summary messages, and
each message is linked to the verses it came from.

Facts gathered before round 1:
- `docs/CONTEXT.md` "Scripture-first voice": the app never *generates*
  summaries or takeaways. The reader's own words are allowed ("the reader's
  language comes next").
- Plan §10 (`thread-plan_3.html`): per-chapter notes were cut in v2, and
  marking a verse is a tap, not a note. Adding a zone with friction in the
  middle of the trial would confound E1 and E4.
- Reading history (`src/knot/HistoryModal.tsx`) is already grouped by book.
  Dismissal already has a "You finished {book}" moment. Outside links already
  open in the system browser (`KeyGuide`, `DictionaryLibrary`).

## Resolved

- Is the daily takeaway required or offered? → Offered and skippable. The book
  summary can have gaps. (round 1)
- What is a takeaway linked to? → The day's passage by default, optionally
  narrowed to specific verses. (round 1)
- How does it ship? → As small **vertical** slices, with the order left to
  `/plan`. The owner said: "make sure they are not too horizontal". Each slice
  must be usable end to end, not a layer such as "schema only" or "writing
  with nowhere to see it". (rounds 1, 3)
- Is a lab trial live? → No, or the owner doesn't mind. The reading flow is
  free to change, and confounding the trial is not a constraint. (round 1)
- When is the takeaway offered? → After sealing, in Dismissal. The seal itself
  is unchanged. (round 2)
- Where are a book's takeaways reviewed? → Inside Reading history, as a
  takeaways view for each book. No new row in the knot. (round 2)
- Can a takeaway be edited or deleted? → Yes, both. (round 2, see JOURNAL)
- What does a takeaway's verse link open? → The existing chapter viewer at
  those verses, with them highlighted. (round 2)
- When does the start-of-book video show? → On the first sitting of a new book
  (Arrival). After that it is always reachable from the book's entry in
  Reading history. (round 3)
- What shows for books with two-part videos? → Both parts, at both ends.
  (round 3)
- Where does a video link open? → BibleProject's own page on
  bibleproject.com, in the browser. No embedding and no YouTube. (round 3)
- What does the end-of-book summary look like? → An inline list in "You
  finished": the video link(s), then the takeaways oldest to newest with their
  references, then the existing "Learn any of what you marked?" block.
  (round 3)
- Are the current book's takeaways visible before it's finished? → Yes, in
  Reading history. (round 4)
- Are takeaways in the backup and wiped by the unravel? → Assumed yes; they
  are personal free text, like the rest of the account. `/plan` should confirm
  this against `src/backup` and `src/reset`.

One possible slicing (for `/plan` to refine; each slice is vertical):
1. Video links: Arrival on the first sitting, "You finished", and the book's
   entry in history.
2. Write a takeaway after sealing, linked to the day's passage, and see, edit
   or delete it in that book's history view.
3. Narrow a takeaway to specific verses, with the reference opening the
   chapter viewer at those verses.
4. The inline takeaway summary at "You finished".

## Terms added to CONTEXT.md

- Takeaway, later renamed **Headnote** (/level-up-ui round 3); plus **Contents** and **Overview**

## Decisions added to JOURNAL.md

- Decision 2026-10-07 — takeaways are the reader's editable words, kept outside
  the event log. `/close-tab` and `/wrap-up` should reference it, not restate
  it.

## Open threads

- For `/plan`: the book → bibleproject.com URL table. Hand-verify every URL,
  and include books that share one video (e.g. 1–3 John, Ezra–Nehemiah) and
  books with two parts.
- For `/plan`: check whether the chapter viewer (`src/knot/ChapterViewer.tsx`)
  can already open at and highlight a verse range.
- For `/plan`: how long can a takeaway be ("one line"), and what happens to
  takeaways on a re-read of the same book?

## Confirmed understanding

The owner confirmed this by moving straight to `/plan` (2026-10-07).

- **Book bookends:** a BibleProject overview link, with both parts for
  two-part books, opens bibleproject.com in the browser. It appears on Arrival
  at the first sitting of a book, in "You finished", and always in the book's
  Reading-history entry.
- **Takeaways:** one optional line in the reader's own words, offered in
  Dismissal after the seal. It is linked to the day's passage and can be
  narrowed to specific verses. The reference opens the chapter viewer at
  those verses, highlighted. Takeaways can be edited and deleted.
- **Where they show:** "You finished" lists the video link, then the
  takeaways oldest to newest, then the marked-verses block. Reading history
  shows each book's takeaways, including the book still being read.
- **Delivery:** small vertical slices, with the order left to `/plan`. The
  trial isn't a constraint.

## Direction (after /level-up-ui, 2026-10-07)

The owner approved **Headnotes**: the daily line is a chapter headnote and the end-of-book summary is the book's contents page (`level-up.md` round 3, `mockup.html` §5). Open: copy wording ("headnote" kept by default) and the optional relay slice (deferred).
