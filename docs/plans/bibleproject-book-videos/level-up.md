# Level up — takeaway surfaces

Surface: three new surfaces from this plan, all from Phase 4 of `/plan`:
- the takeaway prompt in Dismissal, after the seal;
- the end-of-book read-back in "You finished";
- the per-book page in Reading history.

Pin: the owner leaned towards **C · Thread** ("open to other ideas … time to
level up ui").

## 1. The dissatisfaction

All three first-pass directions in `mockup.html` (A margin line, B card,
C thread) are **note-taking UI wearing the app's fonts**: a text field and a
list. C's vertical line with beads is a stock timeline or stepper pattern, the
kind any journaling app could ship. None of them uses the fact that Thread
*already has a timeline of the book*: the bolt, whose length is the days and
whose rows are the days you read. A second timeline next to the cloth is
redundant.

## 2. Techniques run

**Analogy.** The structure, in plain terms: *one actor leaves a short mark at
the end of each repeated act; at the end of a long run, the marks are gathered
and read back in order, each tied to where it came from.*

| Domain | Mechanism carried back | Verdict |
|---|---|---|
| Ship's log | Each entry is keyed to a *position*, not just a time. The reference is the line's coordinate. | partial: confirms the reference is primary |
| Weaving, selvedge marks | Weavers put information in the **selvedge**, the cloth's edge, without interrupting the pattern. Yarn changes leave **tails** that get tied off. | **hit** |
| Rosary / prayer cord | Passing beads through the fingers one at a time to review them in order | **dead**: it restates C's beads (redundancy test fails) |
| Commonplace book / marginalia | The line sits beside its text | **dead**: this is direction A |
| Wound healing / scar | — | **dead**: no movement |

**Provocation.**

| Po | Movement | Verdict |
|---|---|---|
| Escape: there is no takeaway list, only the cloth | The cloth *is* the index. A day with a line carries a visible mark in its row. | **hit**, merges with selvedge |
| Reversal: you pull a thread instead of writing | — | **dead**: writing is the point |
| Distortion: the book ends by cutting the bolt off the loom, and the lines are its label | "You finished" shows the finished bolt with its marks, then the lines read back | partial, folded in |
| Exaggeration: every line is a full-width banner | — | **dead** |

**Worst-idea** (the never-do cluster): a count of "lines written" (a streak
in disguise); a word cloud or "your book in 3 points" (generated summary,
which breaks the Scripture-first voice); chat-bubble journal entries; a nag on
days with no line.

Failed prompts: 5 of 11. The batch is honest.

## 3. Meta-pattern

Every prompt that moved converged on one idea: **a takeaway's place is on the
cloth's edge, at the row of the day it was woven.** The bolt already is the
book's timeline, so a takeaway becomes a mark *in* that timeline, not a
separate list.

## 4. The chosen direction: "Selvedge ties"

- **Aesthetic family:** the existing *Field-notebook / Ledger × working loom*
  (`aesthetic-thread-textile/level-up.md`), unchanged. This extends it rather
  than adding a new family.
- **Layout discipline:** a single dominant object. The bolt stays the largest
  thing on each surface, and the lines are set beneath it as editorial text.
  No cards, no panels, no timeline rail.
- **Signature move: the tie.** A short **madder tail** (madder is the token for
  "a mark *you* made") hangs off the bolt's right selvedge at the row of every
  day that has a line. The same tail glyph leads each line in the read-back, so
  the cloth and the list read as one object.
  - **In Dismissal:** under the WeaveZone, a loose dashed warp-coloured tail
    with the prompt "Keep a line from today". Tapping it opens the field, whose
    underline is the tail continuing. Saving pulls the tail taut into madder
    (the seal's pull, with an instant swap under reduced motion), and today's
    row in the bolt above gains its tie.
  - **At "You finished {book}":** the finished bolt with all its ties, then
    the BibleProject link, then the lines oldest to newest (tail · italic
    line · mono reference and date), then the existing "Learn any of what you
    marked?" block.
  - **Reading history → a book:** the book's bolt (finished or in progress) at
    the top, then the overview link, then the lines in the same format. Tapping
    a reference opens the ChapterViewer with those verses highlighted. Edit and
    delete are explicit text actions on each line, not a hidden long-press.
- **Typography:** unchanged. Newsreader italic 17–18 for the reader's lines
  (the reader's language is set in the scripture register, quieter than
  Scripture itself); JetBrains Mono 11–12 `ink40` for references and dates;
  Schibsted only for headings and labels.
- **Colour:** existing tokens only. `madder` for ties and saved-line tails;
  `warp` for the loose (unsaved) tail; the book's dye for the cloth; `ink40`
  for metadata.
- **Spacing:** `tokens.space` scale; 44pt targets on the prompt, references
  and edit actions.
- **Motion:** one movement only, the tail pulling taut on save (Reanimated,
  about 300ms, obeying reduce-motion). Nothing animates on scroll.

## 5. Slop check

- Removed: C's timeline rail and beads (the stepper tell), any "lines
  written" count, card panels.
- Not introduced: new fonts, icons, gradients or dependencies. The tail is a
  `react-native-svg` `Path`.
- The AI Slop Test: the tie only makes sense in *this* app's cloth metaphor,
  so it passes.

## 6. Production-gate constraints (copied for the build)

- Contrast: madder 4.7:1 on paper (text and graphic OK); ink40 4.59:1 for
  metadata; warp 3.15:1, used only for the graphic loose tail, never for text.
- Not colour alone: a saved line shows its text; the loose tail always has the
  visible prompt label.
- The input has a visible label ("Keep a line from today"), an accessible
  label, and is kept visible above the keyboard (the knot editor bug, commit
  f105c58, must not recur in Flow's ScrollView).
- 44pt targets: the prompt, Save, Edit, Delete, each reference, each overview
  link.
- Delete is confirmed or undoable.
- Long references and book names wrap whole. Lines reflow at the largest OS
  font scale.
- Values come from `src/ui/tokens.ts`. No new font, icon set or dependency.
- Dates use the `local_date` helpers.
- Synthetic data only in mockups and fixtures.

## 7. Out of scope

- Restyling the Reading-history list itself, apart from making the book
  section header open the book page.
- The WeaveZone's cloth rendering, apart from the tie overlay.
- Onboarding and the rest of the knot.

## Handoff

Composition is a product choice here (ties change WeaveZone and Dismissal), so
this goes back into this `/plan` (Phase 4, step 3: the direction gate).
`mockup.html` section D shows it.

---

## Round 2 outcome (2026-10-07): D and E rejected

- **D "Selvedge ties" was rejected as "weird".** The tie meant nothing unless
  someone explained it. Lesson: meaning before metaphor.
- **E "As built"** (existing styles reassembled) was also not accepted. The
  owner asked what the options teach, what the user stories are, and how to
  avoid a typical vibe-coded design.
- **Cross-cutting finding:** every option set the reader's line in italic
  Newsreader, the face the app uses for Scripture. When a line sits beside a
  verse, it must not share the verse's voice. The Scripture-first voice rule
  applies: the verse comes first, verbatim and attributed, then the reader's
  language.
- **Proposed direction F, "Scripture, then your words":** the line starts by
  re-reading today's verses and choosing one. The read-back is pairs: the
  verse in Newsreader, then the reader's line in Schibsted with a madder rule.
  It's sketched in `mockup.html` §4 alongside the lessons, the user stories and
  the method. The earlier rounds are archived in `mockup-rounds-1-2.html`.
- Not yet approved. The direction gate is still open.

---

## Round 3 (/level-up-ui, 2026-10-07)

**Framed dissatisfaction (sharpened):** every direction so far treats a
takeaway as *a note kept beside the Bible*: a journal, a highlights list, a
timeline. The concept, not the styling, is what makes them forgettable,
because any notes or highlights app ships the same thing. (F's verse-plus-line
pairs are effectively Kindle highlights.)

Inputs carried in: the meaning-before-metaphor lesson, the "don't put the
reader's words in the Scripture face" lesson, and the 24 user stories
(`mockup.html` §2). No phone screenshots: the dev build holds real reading
history, which the privacy rule bans from design artefacts.

### Concept-fan: what is a takeaway a way of doing?
- **Level 1: consolidating today's reading.** Alternatives:
  - write a line (current);
  - choose a verse (F);
  - **give the day a heading**;
  - answer one question;
  - have the line come back later.
- **Level 2: carrying the book with me.** Alternatives:
  - a keepsake at the end;
  - **the book's own apparatus, written by me**;
  - yesterday's line echoed at the next Arrival;
  - the shelf of finished books.
- Pruned: "answer one question", because it's generated prompting, which
  breaks the Scripture-first voice. "Keepsake" is pruned because it is the
  target restated.

### Random stimulus (10 draws, 6 pools)
| Stimulus | Movement | Verdict |
|---|---|---|
| palimpsest (records) | A re-read writes a new layer over the old one, and both stay legible | **hit**: re-read handling |
| relay baton (transit) | Yesterday's line is handed to today's Arrival | **hit**: borrowed move |
| ship's log (records) | — | dead, redundant with the grill |
| seed bank (living) | — | dead, it restates "show at the end" |
| a proof (craft) | — | dead |
| growth rings (time) | — | dead, already rejected in the Loom round |
| jeweller's loupe (craft) | Focus on one verse | dead, redundant with F |
| a town crier vs noticeboard (social) | The urgent is pushed, the durable is pinned. The line is durable, so it's pinned *in the book* and never pushed | partial |
| threshold (abstraction) | — | dead |
| sheet music (records) | — | dead |

That is 6 of 10 dead, an honest batch.

### Analogy: printed Bibles' own apparatus (cultural/records)
- **The Geneva Bible (1560)** opens each book with **"The Argument"**, a short
  orientation to the book.
- The **1611 King James** prints a **chapter headnote** before each chapter: a
  one-line summary of its contents.
- Printed Bibles have **contents pages**.
- Mechanism carried back: *the summary belongs to the book's structure, not
  to a separate notebook*. The BibleProject overview **is** The Argument. The
  reader's line **is** that chapter's headnote. The end-of-book summary **is**
  the book's contents page, written by the reader.
- One role per element, nothing forced, so the analogy rhymes.

### Meta-pattern
The ideas that moved all say: **the reader's lines become part of the book's
apparatus**, the same furniture printed Bibles have carried for 450 years. It
is legible to anyone who has opened a book. No explanation needed, which is
what D lacked.

### Candidates (DNA)

| | 1 · Headnotes (recommended) | 2 · Pairs (F) | 3 · Relay |
|---|---|---|---|
| Family | Printed-Bible apparatus × the Loom's field notebook | Editorial quotation | Field notebook |
| Layout | The book's own order: a **contents page** with chapter numbers and dot leaders | Single column of verse-then-line pairs | The plain list, plus one line at Arrival |
| Signature move | **Your contents page**: "The peace comes after the asking …… 4:6". Bare chapters show only their number | Choosing a verse first | Yesterday's line echoed under the cue at Arrival |
| Distinctive? | High: no notes app has a contents page in your words | Low: Kindle highlights | Medium |
| Register fit | The emphasis lands on the real peak, finishing the book | Even and steady, no peak | The emphasis lands every morning, which could get noisy |
| Tells | Risk of faux-antique pastiche (blackletter, drop caps, parchment), which is **forbidden** | Quote-card feed | None major |

**Chosen: 1 · Headnotes.** It borrows one move from 3, as an optional,
deferred slice: yesterday's headnote can echo at Arrival. It borrows one move
from 2: the verse range stays optional ("from v. 6–7"), as the grill agreed.

### Direction: "Headnotes"
- **Arrival, first sitting:** a link to BibleProject's overview, titled as an
  introduction to the book ("Before you begin, BibleProject's overview of
  Philippians ↗").
- **Dismissal after the seal:** the existing mono question and button pattern,
  "Give today a line" → the existing bottom sheet. The sheet previews the
  headnote *in place*: a mono "PHILIPPIANS 4" label and the field set exactly
  as the headnote will print.
- **Chapter viewer (from history or a reference):** the reader's headnote
  sits **above the chapter's text**, as a 1611 headnote does, in Schibsted
  15/22 ink60 with a madder left rule. It is never in Newsreader.
- **"You finished {book}" and Reading history → book:** the **contents
  page**. The book name is set big (display 900, the Arrival chapter title
  size), with a mono "Contents" label. Each row is your line, then dot leaders,
  then the mono reference ("4:6–7"). A chapter with no line shows its number
  alone in `ink40`, the bare-warp principle: a gap is information, not a
  reproach. A re-read is a second contents page under the first, dated (the
  palimpsest).
- **Typography:** Schibsted for your lines, the app's voice, never Newsreader.
  JetBrains Mono for chapter numbers, references and leaders. Newsreader
  appears only where Scripture itself does (the chapter viewer).
- **Colour:** ink, with ink40 for bare chapters and leaders. Madder for the
  headnote rule (a mark you made). The book's dye only on the book name, one
  dye on screen.
- **Spacing:** `tokens.space`. Contents rows have a minimum height of 48 and
  are tappable to open the chapter with the headnote.
- **Motion:** none new. Sheets use the existing slide and honour reduced
  motion.
- **Out of scope:** antique ornament of any kind. No new fonts. No shelf
  redesign.

### Production-gate constraints (round 3)
- Dot leaders must survive the largest font scale and narrow widths. They are
  flexible filler; the line wraps and the reference never truncates.
- A bare chapter is shown by number plus a missing line, not by colour alone.
  Screen readers say "Chapter 3, no line".
- All of round 2's §6 constraints carry over: contrast, 44pt targets, the
  keyboard, the confirmed delete, tokens only.

---

## Round 4: "more art, more One Blue Thread" (2026-10-07)

**Pin:** the owner approved Headnotes, then asked for it to be "more themed for
one blue thread … more art".

**Constraints found:**
- `docs/BRAND.md` forbids calling the app a digital tassel and forbids
  inventing a meaning for blue.
- Any surface citing Numbers 15 must quote 15:37–41 in full.
- So the tassel/cord imagery is **out**, and the art has to be **the loom**.

**Direction ("woven"):** the art is the app's own cloth. It is drawn with the
landing page's `cloth()` renderer in the mockup, and with `src/ui/Cloth.tsx` +
`cloth.ts` in the build. Every piece keeps its glossary meaning:
- **Arrival, first sitting:** the book's **warp, strung**: one taut undyed
  thread per chapter, with nothing woven yet ("Warp … strung before reading
  begins"). It sits beside the overview link.
- **The headnote sheet:** a single **weft pass** (today's) across the head of
  the sheet. The label "Today's pass, in your words".
- **"You finished" and the history book page:** the finished **bolt** is the
  frontispiece above its contents. Each reading in history gets its own small
  bolt (the palimpsest).
- **Contents leaders are thread.** A chapter with a headnote is joined to its
  reference by a **taut thread in the book's dye**. A chapter without one gets
  **slack, undyed warp**, the existing "bare warp is information" principle.
  It still reads as a TOC leader, so it needs no explanation (D's failure is
  avoided).
- **Headnote rule in the chapter viewer:** a short vertical thread in the
  book's dye. Not madder: Philippians *is* madder via `dyeFor`, so the
  reader's mark is the book's own dye.

**Build implications (S01–S04):**
- Arrival renders a warp-only `Cloth` variant (zero rows; it needs a
  `strung`/no-weft path in `cloth.ts`).
- The sheet head is a one-row `Cloth`.
- `Contents` leaders are `react-native-svg` `Path`s: straight in the dye, or a
  quadratic sag in `warp`.
- The finished bolt reuses `Cloth` with the reading's sealed days from `days`
  (`book_start`..`book_finish`).
- The colour for headnote rules and leaders is `dyeFor(book)`, not `madder`.

Mockup: `mockup.html` §5. Awaiting the owner's sign-off.

---

## Round 5: "elegant and clean", ornament only (2026-10-07)

**Owner:** round 4 "just looks more tacky. I want something elegant and clean …
the appropriate functionality [was] in the previous version … some more art,
doesn't have to be functional."

**Lesson:** art that *encodes* data (dyed leaders, cloth in rows) turned the
contents page into a chart. Elegance came from round 3's restraint. The art
should **adorn, not encode**.

**Direction:**
- **Layout and behaviour:** round 3, exactly. Dotted leaders in `ink40`; the
  reader's lines in Schibsted; the madder headnote rule; the book name in
  thread.
- **Art:** two `react-native-svg` hairline ornaments, a single thread in
  `tokens.color.thread`, about 1.15 stroke, round caps.
  - The **headpiece** (a long thread with one soft loop) appears above the
    first sitting's Arrival and above the book name on the history Contents
    screen.
  - The **tailpiece** (a short thread with a loop over a faint `warp` hairline)
    closes the Contents at "You finished".
  - Both are `aria-hidden`, static (no motion), and never carry meaning.
- **Rejected for good:** cloth in contents rows, thread leaders, a warp strip
  at Arrival, a weft pass on the sheet, and dye-coloured rules.

Mockup: `mockup.html` §5. The ornament paths are there to copy into a new
`src/ui/Ornament.tsx` (`kind: 'head' | 'tail'`).
