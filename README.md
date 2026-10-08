# One Blue Thread

_A quiet place to read Scripture._

One Blue Thread helps one reader arrive, read, remember, and return. Scripture
is the voice: the app writes no devotionals, summaries, or takeaways of its own;
one flow, no feed, and no streak to defend. See [`docs/BRAND.md`](docs/BRAND.md)
for the origin of the name and the product's editorial rule.

It is a free, open-source **Bible reading app for Android**. The World English
Bible is bundled, so it works fully offline; memory passages come back as cloze
cards on a spaced ladder; and there is no account, no feed, no ads, and no
telemetry. The network is used only for a licensed translation (NIV or ESV) you
add your own free key for, and for links you choose to open.

**[Try the demo →](https://sbrn3.github.io/one-blue-thread/)**
a browser preview of the daily flow — arrival, recall and the probe, scripture
with study notes, the seal, the weave, the knot, and the book end. Nothing to
install.

**[Get the app →](https://github.com/sbrn3/one-blue-thread/releases/latest)**
download `one-blue-thread.apk`, allow "install unknown apps," done. Android, free,
no account, nothing leaves your phone.

## First run

Onboarding really only asks one thing that matters: a cue, one sentence —
"After ___, I read in ___." Pick something you already do every day so the
reading rides along with it. Everything else it asks (reminder time,
translation, starting book) is a sensible default you can change later.

After that it's the same each day: your cue, a passage, sometimes a verse
to recall from memory, then hold to seal. Miss a day and nothing happens —
no streak, no catch-up. The only irreversible thing in the app is a
deliberate, held-down reset that starts you over from scratch.

## What's in it

- **One daily flow.** Arrival (the day, your cue, today's chapter), recall
  (memory passages due today), sometimes a next-day probe on a few verses you
  read, the Scripture itself, the seal, the weave, and dismissal ("Now close
  the app.").
- **Scripture as the voice.** One paragraph per verse. Tap a verse for
  Tyndale study notes, or to remember it or a passage; a dotted word opens the
  Bible dictionary. Book introductions and the full dictionary, with search,
  are offline.
- **Memory on a ladder.** Passages you choose to learn come back on a
  five-box Leitner schedule as cloze cards: a few key words hidden, then most,
  then all of it, first with letter stubs and then with plain gaps. A daily cap
  (2 by default) keeps it small; the memory library lets you add any passage,
  edit, start over, delete, or review ahead.
- **The seal.** Hold to seal the day along the fell line, or switch to two
  taps in the knot.
- **The weave.** Each book is a bolt of cloth: one warp thread per chapter,
  one weft pass per day read, and gaps that stay visible without counting
  against you.
- **The book end.** When you finish a book: learn any of the verses you
  marked, then pick what's next.
- **The knot** (the gear, top right). Practice (your cue), Memory, and
  searchable Reading history every day; under More, Translation (WEB bundled;
  NIV or ESV with your own key, with a short guide), Sealing, Partner,
  Adaptive policy, Safekeeping (encrypted backup and an on-device recovery
  snapshot), Starting over (hold to unravel), What's new, Study library,
  Origin story, and Support.
- **The lab.** Dormant for your first year, then it learns quietly which kind
  of reminder gets you back — only whether and when it nudges, never what or
  how much you read. One tap freezes it. See
  [what the app asks you](https://sbrn3.github.io/one-blue-thread/what-thread-asks-you.html).

Curious how it's built, or want to run it yourself? Read on.

---

## Building it

The full v3.0 specification lives outside this repository. What is tracked here
is [`AGENTS.md`](AGENTS.md), the working contract, and
[`docs/plans/`](docs/plans/), one folder per planned change. This section covers
only what those don't: how to run this repo.

```sh
npm start          # Expo dev server
npm run android    # run on Android (dev build required for notifications)
npm test           # vitest — the simulation/invariant suite
npm run typecheck  # tsc --noEmit, strict
```

### Repository shape (plan §05)

```
/src
  /onboarding  Premise·anchor·place·net·translation·books·safekeeping  (§05 ✓)
  /flow      Arrival · Recall · Scripture · Seal · Weave · Dismissal   (W3–W6a)
  /knot      The settings sheet: everyday tier (cue, memory library,
             reading history) and rare tier (translation, sealing,
             partner, adaptive, safekeeping, unravel, about)           (W5)
  /cue       Cue model, cue_strength metric, anchor validation         (W1 ✓ / §05)
  /notify    Rolling 30d window, cancel-on-seal + decision voiding     (W7 ✓)
  /text      TextProvider (WEB/NIV/ESV), sitting splitter              (W2 ✓ / §08)
  /study     Offline Tyndale notes, dictionary, context + search
  /log       Event log: schema, driver, writer, time                   (W1 ✓)
  /lab       PRNG, phase assignment, ladder, reconcile, experiments,
             analysis (NAP/randomization/MRT/reports)                  (W1 ✓ / W8 ✓ / W9 (engine only) / W10 ✓)
  /memory    Leitner scheduler, cloze ladder, memory library            (W1 ✓ / W6a)
  /partner   Hand-off only. No network, by construction                (W12 ✓)
  /backup    On-device recovery snapshots + external export/restore    (W11 ✓)
  /reset     The unravel: erase everything, back to first run
  /whatsNew  Bundled release notes, keyed by tag
  /brand     Numbers 15:37–41 origin, shown in full
  /state     Zustand stores (session, seal rehearsal)
  /ui        Design tokens ("The Loom"), cloth renderer, shared controls (W1 ✓)
/test        vitest suite incl. §13.6 import-boundary invariants
/assets/bible  Bundled public-domain translation (W2 ✓)
/assets/tyndale  CC BY-SA study notes and dictionary (transformed)
```

### Hard rules (enforced by tests, §13.6)

- `events` is append-only; migrations are additive-only.
- `ts` / `local_date` (4 AM boundary) / `build_sha` are stamped by the writer.
- No `Math.random()` anywhere — seeded PRNG only; the trial year is
  reconstructible from `trial_seed`.
- `/src/lab` never imports `/src/ui`; `/src/memory` never imports `/src/lab`;
  `/src/partner` has no code path to a network.

### Cutting a release

Every push to `main` builds `one-blue-thread.apk` in GitHub Actions (Actions → latest
run → Artifacts). Tagging a version publishes it under **Releases** — the
link this README's "Get the app" points people to. Latest is `v0.10.0`; bump
the patch/minor number for the next one, and add its What's new entry first
(see `AGENTS.md`):

```sh
git tag v0.10.1 && git push --tags
```

The signing key is stable across builds, so updates install over the old
version with no extra steps on the phone.

### Bible text (plan §08)

Bundled **WEB** (public domain) ships in `assets/bible/web.json` — the app
always works offline. Regenerate it with `node scripts/build-bible.mjs`.

**NIV or ESV (licensed):** chosen in-app, at onboarding's translation
screen or later from the knot's Translation row — not at build time. The API key is entered on-device and stored in
SQLite (`meta` table), never compiled into the build or committed to the
repo. NIV needs only a free key from api.bible (the specific NIV bible id
is resolved automatically from the key via `/v1/bibles`); ESV needs a free
key from api.esv.org, which requires accepting Crossway's statement of
faith. Whichever is chosen is cached per chapter after first fetch and
falls back to WEB automatically with no network. Each provider's required
copyright notice renders under every chapter via `attribution()`, and
neither provider has a method capable of bulk-downloading the translation.

Neither the ESV integration (`src/text/esv.ts`) nor the NIV one
(`src/text/apiBible.ts`) has been exercised against a live key: both were built
from published API docs and are unit-tested against fakes. The knot's
Translation row proves a pasted key with a live round-trip before saving it and
refuses the save on failure, so the first real key doubles as the smoke test.

### Study resources

Tyndale Open Study Notes and the Tyndale Open Bible Dictionary ship as
partitioned offline data. Reproducible JSON remains under `assets/tyndale`, while
the app loads checksum-verified gzip modules lazily to keep the APK compact.
While reading, a few exact dictionary matches receive
a dotted underline; tapping a verse opens study context and explicit
single-verse or same-chapter passage remembering. The knot contains full
title/alias dictionary search.

Validate committed assets with `npm run check:tyndale`. To rebuild them, download
the two reviewed archives from <https://tyndaleopenresources.com/> and run:

```sh
npm run build:tyndale -- --notes path/to/tyndale_open-studynotes.zip --dictionary path/to/TyndaleOpenBibleDictionary.zip
```

The transformed resource data is CC BY-SA 4.0 and separately attributed in
`assets/tyndale/LICENSE.md` and `THIRD_PARTY_NOTICES.md`; One Blue Thread's application
code retains its existing licence.
