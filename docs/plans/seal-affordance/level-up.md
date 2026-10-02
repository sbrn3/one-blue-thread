# seal-affordance — level-up

Slug reused from `/grill` (same folder, same subject). Surface: `src/flow/SealZone.tsx`,
the hold path only.

## 1. The framed dissatisfaction

The seal mark depicts completion and then asks for input. Four candidate forms
(plate / shuttle / button / plate+shuttle) all failed the same way: each wraps a
container around a picture of *finished* cloth, so the reader is asked to press a
result. Nothing in the mark is unfinished, and nothing in it is the reader's.

Two material facts found while measuring, both load-bearing for the direction:

- **The cloth is fake.** `SealZone` hard-codes `geometry(168, 96, 7, Array(5).fill(true))`
  — seven chapters and four woven rows regardless of the book — and paints it in
  `tokens.color.thread`, not the book's own dye. `WeaveZone` renders the real
  bolt through the shared `Cloth` component, with real `chapterCount`, real
  `sealed[]` and `dyeFor(book)`, 200pt further down the same `ScrollView` — but
  only *after* the seal. The control is a decorative miniature that contradicts
  the truthful drawing below it.
- **The gap is drawn as nothing.** The live weft ships at
  `strokeDashoffset = liveLength` (invisible) while `warpPath(i, 0, WOVEN_ROWS)`
  runs the warp straight through today's row. So today reads as the bottom edge
  of a picture. In this app's own vocabulary a row with no weft *is* bare warp:
  "an opening you can see through… information, not an absence of it"
  (`docs/CONTEXT.md`). The most meaningful graphic in the product is sitting
  under the control unused.

Third, smaller: the mark is off-centre. A 168pt box, a sett capped at
`MAX_SETT` 16, seven threads — ~109pt of ink with ~59pt dead to its right, under
a centred label.

## 2. Techniques run

### concept-fan — "possibly solving the wrong problem"

Climb 1: making the seal look pressable → **making it unmistakable how today's
reading gets committed.** Climb 2: → **making the end of a reading feel like an
act you perform, not a form you submit.** Stopped there; the third rung is "help
someone keep reading" and nothing fans from it.

Fan at rung 1:
- **Dress the widget as a button** — the four mockups. A cosmetic variant of the
  target. **Pruned.**
- **Put the affordance in the state of the cloth** — today visible as a gap in
  the reader's own bolt. → movement (see below).
- **Put it in continuity with the text** — the mark as the reading's last line
  rather than an object beneath it. → partial movement; absorbed into the above.
- **Put it in the label** — better copy. **Failed, no movement.** Copy cannot
  make a picture look operable, and "Hold to seal" is already accurate.

Fan at rung 2:
- **Resistance** — the material pushes back while held. → movement.
- **Consequence before commitment** — you see what your cloth becomes as you
  close it. → movement.
- **The gesture leaves a mark shaped by how you performed it.** **Abandoned** —
  redundant with the set mark, which already owns "the record carries the shape
  of how you wove", and it would make every seal cosmetically unique for no
  informational reason.

Movement extracted: a gap asks to be filled; a picture asks for nothing.

### analogy — "solutions feel derivative"

Structure, no domain words: *an actor sustains an input for a fixed period to
commit an irreversible daily record; the system must make the waiting legible;
the bottleneck is that the actor cannot see where the action begins, or that the
object accepts input at all.*

- **Lock and weir on a canal** (operational). Roles: reader = boat, seal = lock,
  the day = the level change. What it does about the bottleneck that we don't:
  a lock needs no sign, because **the open gap and the water level are the
  instruction**. Mechanism carried back: the object's own unfinished state is
  the affordance. → movement.
- **Ship's log / watch handover** (social). Roles: day = watch, seal = the
  signed entry. Mechanism: **the affordance is a blank ruled line, and the pen
  rests on it** — never a button. Carried back: today's row should read as a
  ruled empty slot positioned where the eye already ends. → movement.
- **Wound healing** (biological). **Abandoned on the one-forced-role rule** —
  mapping "injury" needs a second forced role immediately (a missed day is not
  an injury in this product; §01/§02 explicitly refuse loss-aversion framing).
- **Restaurant kitchen at rush** (operational). "The pass as a single quality
  gate" restates *commit* without changing the mark. **Weak, not kept.**

### inversion — "an assumption goes unquestioned"

| Assumption | Strongest plausible flip | Already true where |
|---|---|---|
| The mark must look pressable | **It must look unfinished** | A signature tab on a contract — DocuSign's tag is an unfinished slot, not a button |
| The affordance belongs on the mark | It belongs to the page's end state | Kindle end-of-chapter, Instapaper's mark-as-read at scroll bottom |
| The seal is a control you go looking for | The seal comes to the reader | **Abandoned — redundancy test failed.** `SealZone` already renders immediately after `ScriptureZone` in the same `ScrollView`; the flip describes what ships today |
| The mark should be small and modest | It should be the largest thing on screen at the moment it matters | Apple Pay's confirm sheet; ceremonial signing surfaces |
| The cloth is illustrative | The cloth is the reader's own bolt | Survives unexamined — simply true, and worth fixing regardless of direction |
| Holding should feel like waiting | Holding should feel like work | Survives inversion **unscathed**: nothing in the current build distinguishes 1.2s of labour from 1.2s of latency. Finding — E1 currently risks measuring a dead-time implementation rather than the gesture it was written to test |

## 3. Meta-pattern

Every prompt that produced movement replaced **decoration on a control** with
**a legible absence in a record the reader owns**. The abandonments share a
reason too: each tried to make the *object* more object-like (plate, shuttle,
frame, label) rather than making its *state* incomplete — which is the same
mistake the four mockups make, arrived at four more ways.

## 4. The direction — "The Fell Line"

- **Aesthetic family:** Ledger / bookkeeping, borrowing one axis (composition:
  a single dominant object) from Nature-distilled. Deliberately *not* Editorial
  — that is `ScriptureZone`'s family, and the seal must read in a different
  register from the reading it follows: a record, not a page.
- **Layout discipline:** single dominant object, full content width, no
  container. Asymmetric — the cloth is anchored to the same left margin as the
  scripture, not centred in a box of its own.
- **Signature move: the gap closes under your thumb.** The mark becomes the
  reader's real bolt — their book's chapter count, their actual sealed days,
  their book's dye — cropped to the **last five rows** (decided), with today rendered as
  genuine bare warp: slack, see-through, the fell line raw across the bottom.
  Holding draws the weft across that gap; the warp visibly tightens as it goes.
  At completion the new pass **beats up** against the fell — the row settles by
  ~1.5pt into the cloth and the slack comes out of the warp. Release early and
  the pass withdraws, the warp going slack again.
- **Typography:** unchanged tokens. The helper line drops to
  `tokens.font.mono` at 11pt / `.14em` / uppercase in `ink40` — the register of
  a record's rubric, not a button's label, and the same register the sealed
  state already uses.
- **Color:** `dyeFor(book)` for the live pass and the cloth (not the flat
  `thread` indigo), `warp` for bare warp, `ink40` for the rubric. No new values.
- **Spacing:** `tokens.space` throughout; cloth crop ≤ ~120pt tall, full content
  width; the 44pt target floor is met by the cloth's own height, not by padding.
- **Atmosphere:** a loom mid-work. Nothing framed, nothing centred, nothing
  finished.
- **Motion intent:** every movement is information. Warp tension tracks hold
  progress; the beat-up marks commitment; the withdrawal marks abandonment.
  No entrance animation, no idle decoration beyond the bounded invitation below.

### Why this is not just a nicer picture

It deletes the duplicate rather than restyling it: `SealZone` and `WeaveZone`
end up drawing the same cloth through the same component, so the post-seal
`WeaveZone` becomes a *continuation* of the mark — the crop widens to the whole
bolt — instead of a second, contradicting drawing of different fake cloth.

## 5. Slop rejected

Tells the direction still carried on the first pass, and what replaced them:

- **A container around everything** (the plate; "identical cards"). Removed —
  the mark has no frame at all. Bounds come from the cloth's own edges.
- **Motion with no informational purpose.** The round-2 idle nudge was a
  perpetual animation with no meaning. Replaced by the slack warp, which *is*
  the app's existing sign for an unwoven row.
- **Emphasis without register.** "Largest thing on screen" risks a hero on a
  quiet product surface. Bounded: ≤120pt tall, no headline, no count, no
  celebration on completion beyond the beat-up.
- **A dashboard tell** — no counter, no streak, no progress percentage on this
  surface; the fell line is the only progress indicator the product has.
- **New material** — no font, icon set, dependency, or hex added. `Cloth`,
  `loom.ts`, `dye.ts`, `tokens.ts` and Reanimated already exist.

AI Slop Test: a designer choosing "the affordance is bare warp, because bare
warp already means something in this system" is a decision traceable to this
product's own doctrine. It is not reachable by styling a button.

## 6. Gate constraints carried into the build

From `references/production-gate.md`, the lines this direction actually touches:

- **No infinite loops in motion.** The `/grill` round-2 idle nudge is kept but
  **bounded: three cycles on zone entry, then still** — decided. It now previews
  the exact movement being asked for rather than decorating, and the slack warp
  carries "unfinished" permanently at zero motion cost. No perpetual animation
  ships.
- Honor `prefers-reduced-motion` — under reduce, no nudge and no beat-up; the
  gap and slack warp still read, since they are static.
- Touch target ≥44pt with the seal not shadowing system gestures; scroll stays
  locked for the hold (`onScrollLock`) exactly as now.
- Accessible label and role on the target; the screen-reader / reduced-motion /
  `sealMode='tap'` fallback and the "Use two taps instead" link are unchanged.
- Not colour alone: the gap is carried by *position and slack*, not hue.
- Reflow at ~360–430pt and at the largest OS font scale; the cloth is measured
  from `onLayout` width like `WeaveZone`, never a fixed 168.
- Values from `src/ui/tokens.ts`; no hard-coded values in the `StyleSheet`.
- Synthetic data only in the mockup.
- `npm test` + `npm run typecheck` green.

## 7. Out of scope

- The gesture itself: 1.2s, 20pt drift, six pulses, `hold_cancel` logging, and
  `Gesture.Simultaneous` composition are unchanged (`/grill` round 1 settled
  this).
- The tap fallback, the two-tap link, and every `sealMode='tap'` path.
- `WeaveZone`'s own layout, the streak line, and E3.
- Anything in `src/lab/` — no experiment definitions, arms, or ladder rungs.
- The off-centre bug: real, but a one-line consequence of this direction (the
  cloth is measured, not fixed at 168), not a separate piece of work.

## 8. Handoff

Composition and hierarchy change, so **step 6 applied: mock first, get sign-off**
(mockup published, awaiting the user). After sign-off this is purely visual
within one component → hand to `/visual-surgery`, not `/plan`. Delete this file
once absorbed. `grill-summary.md` in this folder still holds the round-1/2
decisions this direction sits on.

## 9. What the full screen exposed (mockup round)

Judged in isolation the mark is one zone; judged on the whole screen it is half
of a duplicated pair. `Flow` renders, in one `ScrollView`:
`ArrivalZone` (minHeight 400) → `ScriptureZone` → `SealZone` → and, only once
sealed, `WeaveZone`. So the reader holds a **7-chapter indigo loom** and is then
shown a **16-chapter woad bolt** roughly 40pt below it — two drawings of the
same idea, in different fabrics, seconds apart.

Once the mark is the real bolt, that duplication is untenable and also
unnecessary: the seal zone and the weave zone collapse into **one zone with two
states** — the fell line before, the bolt after. Sealing stops being a control
that reports success and becomes the act that closes the visible gap, after
which the same cloth simply carries a header and a caption.

Consequence for handoff: this is no longer purely visual. It changes `Flow`'s
zone composition and `WeaveZone`'s existence as a separate zone, so **hand to
`/plan`, not `/visual-surgery`** — pending the user's answer to decision 01 in
the mockup. If they want the smaller scope instead (keep both zones, crop the
mark to ~3 rows), it stays a `/visual-surgery` job.

Mockup: published for sign-off, full phone screens, both states, live holds.
Synthetic history only — eight days in Mark, two missed, today open.

## 10. Decisions closed (user, this session)

1. **Scope — merge the two zones.** `SealZone` and `WeaveZone` become one zone
   with two states. The reader never sees two cloths on one screen. This is a
   composition change, so it hands to `/plan`.
2. **Idle nudge — bounded to three cycles on zone entry**, then still. Not
   perpetual; gate satisfied without discarding the `/grill` round-2 answer.
3. **Crop — last five rows before sealing, the full bolt after.** Before the
   seal the fell line is a constant ~16pt target in a constant place; once
   today's row is closed there is nothing to aim at, so the zone expands and the
   whole book is visible at whatever pitch `rowPlan` gives it.

The four `/grill` candidate forms (plate / shuttle / button / plate+shuttle) are
**all rejected** — superseded by this direction, which solves the affordance in
the cloth rather than around it.

## 11. Handoff — ready for `/plan`

Build shape for the plan to work out, not decided here:

- One zone, two states, replacing `SealZone` + `WeaveZone` in `Flow`'s stack.
- The cloth comes from the existing `Cloth` component (real `chapterCount`,
  real `sealed[]`, `dyeFor(book)`), with a five-row crop before the seal.
- The live pass, the warp tension, the beat-up and the bounded nudge are
  Reanimated on top of that cloth — the gesture itself (`Gesture.LongPress`,
  1.2s, 20pt drift, `hold_cancel`, scroll lock) is untouched.
- The tap / screen-reader / reduced-motion fallback and the two-tap link are
  untouched.
- `docs/plans/seal-affordance/grill-summary.md` holds the round-1/2 decisions
  this direction rests on; `/plan` absorbs both files and deletes them.

## 12. Correction — ThreadRail (mockup round 2)

**Missed in the first pass:** `src/flow/ThreadRail.tsx` already draws a fell line.
A 26pt rail is absolutely positioned down the whole left edge of `Flow`
(`zIndex 100`, over the `ScrollView`, which carries `paddingLeft: 30` to clear
it): slack bare warp for what is ahead, woven cloth for what has been read, and
a 2pt `thread`-coloured mark on the boundary, driven by `scrollY` on the UI
thread. Its own comment states the doctrine — *"progress is not a bar, it is an
edge"*.

Three consequences, all of which strengthen the direction rather than weaken it:

1. **The shipped screen always has one cloth on it.** The old seal mark made
   two, and `WeaveZone` made three — in three different setts and two colours.
   That is the real reason the mark read as ornament: it was the only cloth on
   screen that meant nothing. The merge decided in §10 is now clearly right.
2. **The name is taken.** "The fell line" is ThreadRail's boundary and a defined
   term in `docs/CONTEXT.md`. This direction is renamed **"the open row"** to
   avoid colliding with shipped vocabulary.
3. **The five-row crop was sized for the wrong problem.** Given the whole screen
   the cloth should take as many rows as the viewport holds (~16 on a 390×844
   phone at `MAX_ROW_PITCH` 16). §10 decision 3 is superseded, pending
   confirmation.

The open row now also carries the rail's own fell mark — the same 2pt thread bar
on the boundary — so the two graphics use one signifier instead of two.

### Open: which treatment

- **F1 "Arrive at it"** — the seal owns the end of the screen; you read to the
  bottom and the bolt is there with one row open. Quieter, nothing intrudes on
  the reading, matches the register rule.
- **F2 "Sticky open row"** — the last three rows ride the bottom edge while you
  read the tail, so the target is visible before you reach it and the rail
  descends toward it. More discoverable; a permanent strip over the scripture is
  the cost, and it is the option most likely to read as chrome.

Mockup 2 published with both, ThreadRail live in each.

## 13. Adjacent finding — the translation credit

`ScriptureZone` renders the provider's attribution as its last element, so a
copyright string sits directly between the end of the reading and the seal —
the one place the screen should have a single subject. With a licensed
translation it is worse: `esv.ts` hard-codes Crossway's three-line notice and
`apiBible.ts` uses the publisher's returned copyright string.

Split the two jobs the line currently mixes:

- **Identity** ("which translation am I reading") → the head of the sitting,
  with the chapter title, in the same mono register as the day line.
- **The statutory notice** → the knot.

WEB is public domain, so nothing is owed at the foot and the reading can end
straight into the open row. This is applied in mockup 2.

Still open, and **not this plan's to answer**: whether a short credit plus the
full notice one tap away satisfies Crossway and API.Bible. That is a licence
check (BRAND.md has the slot for recording it) and belongs to the parked
`knot-translation-switch` plan, which owns translation state and copy
(`src/knot/Knot.tsx:52`). Nothing is blocked today — WEB is the only shipping
source.

Brand constraint to respect either way: `docs/BRAND.md` ranks content by
authority and puts "Scripture, verbatim **and attributed**" first, so the credit
stays on the reading surface — it moves, it does not disappear.

## 14. The join — rail into seal (mockup 3)

Common to all three variants, and the mechanic worth keeping whichever wins:
**the rail's fell lands on the open row and cannot descend past it.** Today's row
*is* the fell, so there is nowhere further for it to go. The line the reader has
watched descend all session arrives exactly at the thing they are asked to
close — discoverability with no chrome at all.

- **M1 They meet.** Rail keeps `tokens.color.thread` and its own sett; only the
  landing is shared. Truthful that they are two records; cheapest to build.
- **M2 They match.** M1 plus the rail taking `dyeFor(book)`. This also fixes a
  standing inconsistency: `dye.ts` exists to enforce one book / one dye, and
  `ThreadRail` is the only surface that ignores it, painting every book indigo.
  Worth doing on its own merits.
- **M3 Through the reed.** The bolt goes flush to the screen edge and the rail's
  warp **spreads to full sett through a reed** before the cloth starts. This is
  the loom's real anatomy — warp leaves the beam gathered and is spread before
  weaving — so the join is mechanically true rather than a transition effect.
  The rail (bare warp included) ends where the spread begins.

**M3 is a bigger commitment than it looks.** It redefines the rail from "your
reading, woven" to "the warp your reading is woven into", which changes a
shipped component's meaning, not just its appearance. That belongs to `/plan`.

Recommendation unchanged from the conversation: build **M2**, keep M3 as the
next move once M2 is real, since M3 is the variant most likely to look wrong on
a one-chapter book or a very long one.

## 15. Correction — the cloth is the record, not the control

The direction was wrong in one specific way for four rounds, and the user was
right to keep pushing: **a picture of cloth does not say "hold me", however
truthful the cloth is.** Making the mark meaningful fixed a real problem (it
meant nothing) but never touched the affordance problem, because the affordance
problem was that the target was fabric.

On a loom the hand never goes on the cloth. It goes on the **batten** and the
**shuttle** — and those parts look operable because they are the parts a hand
belongs on. The earlier "shuttle" candidate failed not because the idea was
wrong but because it was drawn as an ornament parked on a static picture rather
than as the thing you operate.

So the split is:

- **The record** — the open row in the reader's own bolt, the missed days, the
  set mark, the rail's fell landing on it. Not interactive: no role, no tab
  stop, `aria-hidden`, and the rubric under it now states a fact ("Today is the
  open row") rather than an instruction.
- **The instrument** — a control directly beneath it that takes the hold, shows
  its own progress, and closes the row as it fills. It owns the accessible name,
  the 44pt+ target and the press state.

Everything decided earlier survives unchanged; only the target moves.

### The three mocked (mockup 4)

- **C1 The batten** — full-width bar, hairline edge, two grips, `HOLD TO SEAL`
  in mono; dye crosses the bar as the weft crosses the row. A button by every
  convention *and* the loom's own part. **Recommended.**
- **C2 The shuttle** — a thumb-sized shuttle parked at the start of the row that
  travels the width as you hold, so gesture and result are one movement. More
  charming; smaller target; may invite a swipe.
- **C3 Plain button** — the app's own button filled with dye. The control group.
  If this feels best, that is a real finding: it means the loom belongs in the
  record and nowhere near the control.

Note for whichever wins: a button still does not say *hold* by itself. The fill
crossing the control is what teaches the duration, which is why every variant
carries it and why the copy stays "Hold to seal".

## 16. The shuttle, and how much cloth belongs before the seal (mockup 5)

The user chose the shuttle over the batten. Two consequences worked through:

**1. The shuttle is the instrument, and it carries the weft.** Holding it moves
it across today's row at hold progress, laying the weft behind it and taking the
slack out of the warp as it goes; at completion it beats up and the shuttle
retires. Gesture and result are one movement, which no button gives you. The
44pt floor is met by an invisible target ring around a deliberately small object
(the shuttle itself is 54×26).

**2. The bolt should not be on screen before the seal.** This was the user's
question and it is right: the bolt records days you *have* read, so sixteen rows
of it while today is still open puts the reward before the act — and it crowds
the instrument. At a loom you see the warp, the fell and the shuttle in your
hand; the finished cloth is behind you on the beam. So:

- **Before:** the open row, its fell mark, and the warp **running on into the
  days not yet read** — genuinely slacker the further out it goes, straight from
  `supportDistances`. This also gave the row the vertical extent it needed; one
  row alone read as tally marks.
- **After:** the bolt grows in above the row just closed, with the book name and
  day count. The old `WeaveZone`, arriving as a consequence.

This supersedes §10 decision 3 and §12 point 3 (crop size): the question is no
longer "how many rows" but "cloth before, or not". Variants mocked: **S1** one
open row, **S2** the same with the shuttle riding the rail's fell down as you
read, **S3** four rows of context.

Open: which of S1/S2/S3, and whether a control on screen during reading (S2) is
acceptable at all given the register.

## 17. Decided — S1, and a rail cleanup

**S1 "One open row" is the chosen shape.** Before the seal: today's row, its
fell mark, the warp running on into the unread days, and the shuttle parked at
the row's start. Nothing else. After the seal: **one bolt**, today woven into
it, with the book name and day count — the lane collapses and the cloth is
rendered once, from one geometry.

That last point came out of a bug in mockup 5 worth recording, because the
build must not repeat it: growing the bolt in *above* a lane that already holds
context rows draws those days twice, at two different pitches, in two SVGs that
cannot align. The sealed state must **replace** the lane, not stack on it.

### ThreadRail is too busy, and it is fixable without touching loom.ts

At 26pt the rail's three warp threads sit ~4pt apart, but it calls `geometry`
with the defaults — `DEFAULT_SLACK_CAP` 4.5 and `amp` 1.8 — so each thread
wanders up to ~4.7pt sideways and they cross each other. Add `ROW_PITCH` 20
(≈46 wefts down a phone) plus a full interlace pass, and the woven half reads as
a zip rather than cloth.

`loom.ts` already takes what is needed: `geometry(w, h, chapters, sealed, {pad,
amp, slackCap})`, and `warpX` uses `g.slackCap`, so this is entirely local to
`src/flow/ThreadRail.tsx`:

- pass `{ pad: 4, amp: 0.7, slackCap: 1.2 }` to both geometries;
- **`ROW_PITCH` must stay at 16, not go up.** See the correction below —
  raising it shortens the cloth instead of spacing the wefts;
- drop the interlace pass — illegible at 26pt, and `Cloth`'s own `detailLevel`
  already drops the interlace first for exactly this reason;
- soften strokes: bare warp 1.8 / .30, woven warp 2.0 / .55, weft 2.6 / .85.

Verified in mockup 5: the rail reads as a narrow, orderly edge at every scroll
position instead of a tangle. Worth shipping on its own merits, independently of
the seal work.

## 18. Correction to §17 — why the rail stops short

Raising `ROW_PITCH` was wrong, and it exposed an existing bug rather than
creating one. `rowPlan` clamps row pitch at `MAX_ROW_PITCH` 16, so the rail's
weaving reaches `pad + (rows - 1) × 16` pixels and no further — the row *count*,
not the pitch, decides how far down the screen the cloth goes.

- Shipped today: `ROW_PITCH` 20 → ~38 rows → the cloth covers ~600pt of a 736pt
  screen. **The rail has always stopped short of its own fell mark**, which is
  why the woven edge appears to give up partway down while the fell mark
  continues to the bottom.
- Raising it to 28 made that worse (~440pt), which is what showed up in the
  mockup.

Fix: `ROW_PITCH = MAX_ROW_PITCH` (16) and `rows = ceil(height / pitch) + 2`, so
the weaving always reaches the fell wherever it lands. The calming work in §17
stands — `{ pad: 4, amp: 0.7, slackCap: 1.2 }`, no interlace, softer strokes —
it just must not be done by removing rows.

Net effect, verified in the mockup: the rail weaves continuously from the top of
the screen down to the fell mark, which sits level with the shuttle on today's
open row. That continuity is the thing worth protecting in the build.

## 19. Scope closed

Mockup 5 is now a single screen — S2 and S3 are dropped. The direction is
settled end to end:

1. Read; the rail weaves down the left edge, calmed per §17/§18.
2. Its fell lands on today's open row and cannot pass it.
3. The shuttle waits at the row's start: the instrument, and the only target.
4. Hold it — the weft crosses, the slack leaves the warp, the row beats up.
5. The bolt appears, one cloth, today woven into it.

Ready for `/plan`.
