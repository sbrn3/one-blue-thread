# Level-up — Thread aesthetic identity: **THE LOOM** (committed)

_Slug: `aesthetic-thread-textile` · 2026-09-04 · **Direction locked.** Scope this pass:
**app icon + `docs/index.html`**. The in-app weave-zone change this direction implies is a
separate, larger piece of work — see Handoff._

---

## 1. Framed dissatisfaction

Thread is a **singular, private, devotional** object — a Bible reading app for one person,
offline, no account — but it wears the default 2020s minimal-editorial uniform: off-white paper,
one electric-blue accent, Grotesk + serif + mono, a hairline SVG line, centered blocks fading up
on scroll. It is visually indistinguishable from any funded productivity SaaS. The app's entire
vocabulary — **thread, weave, knot, seal, cue** — is textile, and none of it is in the visual
language.

The icon is the worst of it: a blue chevron on pale blue reading as "arrow up," carrying a
**gradient fill and a drop shadow** (both forbidden by the app's own rules in `src/ui/tokens.ts`)
with the construction guides still baked into the PNG.

**User pins (locked):** draw from thread & textile craft · nothing else is sacred · **fluid and
dynamic — cloth being woven as the user works through a book of the Bible.**

---

## 2. Techniques run

### Round 1 — analogy · SCAMPER · worst-idea → **both outputs rejected by the user**

Analogy on the abstract structure (_one actor performs a small repeated act at a fixed moment;
each act adds a unit to a growing physical structure; gaps stay visible; only the actor sees it_)
produced: ship's log (strong), **cross-stitch sampler (strongest)**, tree-rings (**dead** — no
maker), plainsong notation (partial). SCAMPER on "thread = a thin blue line" hit on running-stitch,
thread-on-the-baselines, sewn spine, and thread-as-pressed-channel; **dead** on magnify-to-rope,
**weak** on weave-the-whole-page. Worst-idea produced the never-do cluster (below).

Two directions were mocked — **A "The Sampler"** (`mockup-a-sampler.html`) and
**B "The Impression"** (`mockup-b-impression.html`). **Both rejected:** _"neither of these look
like something sewing."_

**Why they failed — the finding that mattered.** The worst-idea guard ("twee comes from
*decorating* with craft; craft as *structure* is safe") over-corrected. Structure became
**grids** — and a grid of discrete cells is the exact opposite of cloth. A cross-stitch is stiff
and pixel-like; the debossed version removed the thread entirely. **Neither had a thread moving
through anything.** The target was wrong: it framed textile as a *finished artefact* rather than
a *process under tension*.

### Round 2 — provocation, against the corrected target

Target restated: _a loom, not a sampler — fluid comes from threads under tension and in motion._

| Prompt | Movement | Verdict |
|---|---|---|
| **Po:** threads are never straight | the page becomes a field of curves; weave is where curves cross with real over/under occlusion; discrete cells die | **hit** |
| **Po:** the cloth weaves itself as you scroll | the **fell line** — where bare warp becomes cloth — is the progress indicator. Not a bar, a horizon | **hit — the signature move** |
| **Po:** the unit is the book, not the day | **one book = one bolt of cloth**; warp count = chapter count; weft rows = calendar days; a finished book releases tension and joins a shelf | **hit — the strongest idea in the whole session** |
| **Po:** colour comes from the dye, not a palette | each book takes a natural dye; only one is ever on screen; a year of reading is a polychrome shelf | **hit** |
| **Po:** it's 3D and you rotate the cloth | WebGL, wrong register, heavy dependency | **dead** |
| **Po:** you drag the shuttle across yourself | the mascot-motion trap again; fights reading | **dead** |

### Round 3 — the gap test (user-driven)

_"Show me what it looks like with missed days"_ → `mockup-d-gaps.html`. The physically honest
answer turned out to be the best one: **the cloth grows with the calendar, not with effort**, so a
missed day still takes up length and simply has no weft in it. Unsupported warp across a gap goes
slack, thins, and drifts off its sett. The first pass after a lapse never beats up flush — weavers
call the line it leaves a **set mark**, and it never comes out.

Consequence: **the texture of the cloth is the texture of the practice.** Read steadily → dense,
close cloth. Read erratically → open gauze. *Gauze is still cloth.* This renders the project's
"gaps stay gaps — a mirror, not a threat" thesis instead of asserting it in a caption.

### Honesty check
- Dead prompts shown dead: tree-rings, magnify-to-rope, 3D-rotate, drag-the-shuttle. Weak: reverse-weave, plainsong. ~5 of ~20 prompts yielded nothing — within the expected 1-in-3-to-4 band.
- Round 1 produced two polished directions that both died at the taste gate. Recorded, not hidden: **that is the honest signal that the target was wrong**, and re-framing (not more prompts) was the fix.
- Redundancy test on the survivor: "one book = one bolt whose width is its chapter count and whose length is the calendar" could not have been reached from "make the thread nicer." The provocation did the work.

**Meta-pattern:** every prompt that produced movement replaced *discrete cells* with *continuous
threads under tension*, and replaced *a static record* with *an advancing edge*.

---

## 3. The committed direction — **THE LOOM**

> Stated in three words: **cloth on a loom.**

- **Aesthetic family:** Field-notebook / Ledger **crossed with** a working textile loom. The single
  borrowed axis is *composition* — the loom's advancing fell line as the page's organising
  horizon. This cross does not exist as a cluster in training data.
- **Layout discipline:** a **single dominant object** — the cloth — with editorial text set beside
  and beneath it. Not a grid, not cards, not a bento. The cloth is always the largest thing on the
  screen it appears on.
- **Signature move:** **the fell line.** The edge where bare warp becomes cloth. It advances one
  weft pass per day. It is the *only* progress indicator in the product — no bar, no percentage,
  no ring.
- **The organising idea (carries into product):** **one book of the Bible = one bolt of cloth.**
  Warp thread count = the book's chapter count. Length = calendar days elapsed. Weft passes =
  days you read. Psalms weaves a wide banner over months; Jude a narrow ribbon in an afternoon.
  Finished bolts go on a shelf.
- **Typography:** **unchanged** — Schibsted Grotesk (display) · Newsreader (scripture) ·
  JetBrains Mono (data). The Fraunces experiment from Direction A is **dropped**; the production
  gate forbids a new typeface for aesthetics alone, and the cloth now carries the personality that
  a display face was being asked to carry.
- **Colour:** the electric `--thread: #1F3FFF` is **retired** — it is the single strongest generic-SaaS
  signal in the current palette and cannot sit in a family with the dyes. Replaced by a
  **natural-dye system**, one dye per book, only ever one on screen at a time:

  | Token | Hex | Role |
  |---|---|---|
  | `paper` | `#F4F1E9` | linen ground (warmer than today's `#FBFAF7`) |
  | `ink` | `#1A1A17` | text — **15.5:1** on paper |
  | `warp` | **`#8F8779`** | undyed warp thread — **3.15:1**, see gate note below |
  | `indigo` | `#2E3A8C` | default dye / primary accent — **8.9:1** |
  | `madder` | `#B5482F` | dye — **4.7:1**, passes AA for text |
  | `walnut` | `#6B4E37` | dye |
  | `weld` | `#A8761E` | dye — **3.5:1**, non-text only |
  | `woad` | `#3E6B5A` | dye |
  | `cochineal` | `#8E2F4A` | dye |

- **Spacing:** driven by the cloth's sett — warp pitch and weft pitch are the layout unit. Text
  columns align to warp positions, not to an arbitrary 8pt grid.
- **Atmosphere:** a working loom, mid-project. Warm, taut, slightly irregular, unmistakably being
  made by hand and not yet finished.
- **Motion intent:** *tension and passage.* The shuttle passes left-to-right then right-to-left
  (authentic boustrophedon) when a day is sealed; the fell line advances; slack warp settles. No
  bounce, no spring, no fade-and-rise on everything, no character performing. Under
  `prefers-reduced-motion` the cloth renders at its current state instantly.
- **The mark:** a **weft caught mid-pass** — three warp threads, two weft passes interlaced, the
  lower weft running off the edge because the cloth isn't finished. Fluid and asymmetric rather
  than a symmetrical glyph. Replaces the chevron entirely.

### Decided open questions
- **Slack is capped.** A long lapse must read as **open**, not as **unravelling**. Cap the
  slack/drift factor at ~4.5 rows (as in `mockup-d-gaps.html`) and do not let it grow further.
  Rationale: Thread's posture is explicitly non-punitive; "damage" is the wrong emotional read.
  The **set mark stays permanent** — that is honest without being punishing. Reversible if the
  capped version feels dishonest in use.
- **Rejected mockups A and B are retained** in this folder as the record of the pivot. Delete with
  this file once absorbed.

---

## 4. Production-gate constraints (carry into build)

**Contrast — one real finding.** The mockups' delicacy came partly from a warp colour that fails
accessibility. `#C9C0AC` on `#F4F1E9` is **1.6:1**. Bare warp *carries meaning* here (it is how a
missed day is expressed), so it must reach **3:1** for non-text meaningful graphics.
**Use `#8F8779` (3.15:1).** Consequence to expect: **the cloth will read more graphic and less
delicate than mockups C and D.** Verify this looks right before committing the palette.

- Body text ≥ 4.5:1 on its actual background — verified above for `ink`, `indigo`, `madder`.
- **Not colour alone:** a book's dye must never be the only carrier of its identity — always pair
  it with the book name in text. On the shelf, the bolt's *shape* (width = chapters) is a second
  non-colour signal.
- **`prefers-reduced-motion`:** no shuttle animation, no settle; cloth renders woven to its current
  row immediately.
- **No horizontal page scroll** at 375 / 768 / 1024 / 1440 and at 200 % zoom. The shelf scrolls
  inside its own container. **Psalms at 150 chapters is ~1350 px at mockup scale — the bolt
  renderer needs a per-book scale factor**, not a fixed sett.
- **Keyboard:** the "seal a day" control and every shelf bolt reachable, visible focus ring
  (`madder`, 2 px, 3 px offset as in the mockups).
- **No new dependency and no new typeface.** The demo stays a single static HTML file with
  Google-hosted fonts only. In-app, `react-native-svg` + Reanimated are already in the stack.
- **Icon deliverables:** `assets/icon.png`, `favicon.png`, and the three Android adaptive layers
  (`foreground` / `background` / `monochrome`). The **monochrome layer must survive as a single-colour
  silhouette** — verify the interlace still reads when warp and weft are the same colour.
  `app.json`'s `adaptiveIcon.backgroundColor` moves from `#E6F4FE` to the linen ground.
  **No gradients, no drop shadows, no construction guides in the exported PNGs.**
- **Synthetic data only** in the demo and in every screenshot.

---

## 5. Explicitly out of scope this pass

- `src/ui/tokens.ts` and every `src/flow/*Zone.tsx` restyle.
- The in-app weave zone becoming cloth — that is a **product change**, not a restyle (it alters
  what the weave view means and needs chapter-count and per-book dye data). See Handoff.
- Onboarding, the knot sheet, any other React Native component work.
- Copywriting on the demo — structure and words stay; only the visual layer moves.
- The `feat/account-reset` and `feat/tyndale-open-resources` branches. Do not touch.

---

## 6. Handoff

| # | Work | Route | Notes |
|---|---|---|---|
| 1 | Restyle `docs/index.html` to The Loom | **`$visual-surgery`** | Purely visual — existing structure, zones and copy stay. Source of truth for the cloth renderer: `mockup-c-loom.html` (interlacing, fell line, shuttle) and `mockup-d-gaps.html` (gap physics, capped slack). Swap the page's `:root` custom properties to the dye palette; retire `--thread: #1F3FFF`. |
| 2 | New app icon + adaptive/favicon set | asset task (no skill) | Mark = weft caught mid-pass; geometry in `mockup-c-loom.html` → `drawIcon()`. Export PNGs, update `app.json`. |
| 3 | In-app weave zone → cloth, and the shelf of finished bolts | **`$plan`** | Product change. Needs: chapter-count per book (already in `src/text/canon.ts`), a per-book dye assignment, and a decision on whether finished bolts are a new surface. Add to `ROADMAP.md` under *Under consideration* first. |

`$visual-surgery` and the icon task can run in parallel; item 3 is a separate session and should
not start until 1 and 2 have shipped and the palette has been seen in real use.

Delete this file once a plan has absorbed it.
