# One Blue Thread

_A quiet place to read Scripture._

One Blue Thread helps one reader arrive, read, remember, and return. Scripture
is the voice: no generated devotionals, summaries, or takeaways; one flow, no
feed, and no streak to defend. See [`docs/BRAND.md`](docs/BRAND.md) for the
origin of the name and the product's editorial rule.

It is a free, open-source **Bible reading app for Android**. The translation is
bundled, so it works fully offline; spaced repetition brings passages back for
recall; and there is no account, no feed, no ads, and no telemetry — nothing
leaves your phone.

**[Try the demo →](https://sbrn3.github.io/one-blue-thread/)**
a browser preview of the daily flow — arrival, recall, scripture, seal,
weave. Nothing to install.

**[Get the app →](https://github.com/sbrn3/one-blue-thread/releases/latest)**
download `one-blue-thread.apk`, allow "install unknown apps," done. Android, free,
no account, nothing leaves your phone.

## The first time you open it

Onboarding asks a few short questions, in order, and then gets out of the way:

1. **Your cue** — one sentence: "After ___, I read in ___." Pick something
   that already happens every day (a coffee, a commute, a bedtime) so the
   reading rides along with it rather than needing its own willpower.
2. **A reminder time** — optional, for if you haven't read by a given hour.
3. **A translation** — the public-domain WEB ships offline out of the box;
   NIV or ESV need a free API key, entered on-device, and are cached per
   chapter after that.
4. **Where to start** — pick a book, or take the suggested one.
5. **Backups** — a weekly on-device recovery snapshot, and an optional
   "someone to read alongside" the app never contacts on its own.

After that, every day looks the same: it opens to your cue, gives you a
passage to read, occasionally asks you to recall an earlier verse from
memory (grade it "Held it," "Partly," or "Lost it" — nothing is penalised),
and you press and hold to seal the day once you're done. Miss a day and it
just... shows a gap. No streak to protect, no makeup lesson.

## A few things worth knowing

- **Nothing leaves your phone.** No account, no analytics, no ads. The one
  optional exception is a translation API key, if you choose NIV or ESV.
- **It works fully offline.** The bundled WEB translation never needs a
  network; NIV/ESV cache each chapter after the first fetch.
- **Undo is real.** A missed recall touches nothing. A held-down reset ("the
  unravel" — see `docs/CONTEXT.md`) erases everything and starts over, and
  it's the only irreversible action in the app.
- **It's not trying to be sticky.** See [`docs/BRAND.md`](docs/BRAND.md) for
  the editorial rule behind that, and the `lab` in the demo/app for the one
  quiet, fully-auditable, one-tap-freezable exception.

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
  /knot      Sheet: weave, reading history, cue editor, safekeeping    (W5)
  /cue       Cue model, cue_strength metric, anchor validation         (W1 ✓ / §05)
  /notify    Rolling 30d window, cancel-on-seal + decision voiding     (W7 ✓)
  /text      TextProvider (WEB/NIV/ESV), sitting splitter              (W2 ✓ / §08)
  /study     Offline Tyndale notes, dictionary, context + search
  /log       Event log: schema, driver, writer, time                   (W1 ✓)
  /lab       PRNG, phase assignment, ladder, reconcile, experiments,
             analysis (NAP/randomization/MRT/reports)                  (W1 ✓ / W8 ✓ / W9 (engine only) / W10 ✓)
  /memory    Leitner scheduler                                         (W1 ✓ / W6a)
  /partner   Hand-off only. No network, by construction                (W12 ✓)
  /backup    On-device recovery snapshots + external export/restore    (W11 ✓)
  /ui        Design tokens                                             (W1 ✓)
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
link this README's "Get the app" points people to. Latest is `v0.6.1`; bump
the patch/minor number for the next one:

```sh
git tag v0.6.2 && git push --tags
```

The signing key is stable across builds, so updates install over the old
version with no extra steps on the phone.

### Bible text (plan §08)

Bundled **WEB** (public domain) ships in `assets/bible/web.json` — the app
always works offline. Regenerate it with `node scripts/build-bible.mjs`.

**NIV or ESV (licensed):** chosen in-app, at onboarding's translation
screen — not at build time. The API key is entered on-device and stored in
SQLite (`meta` table), never compiled into the build or committed to the
repo. NIV needs only a free key from api.bible (the specific NIV bible id
is resolved automatically from the key via `/v1/bibles`); ESV needs a free
key from api.esv.org, which requires accepting Crossway's statement of
faith. Whichever is chosen is cached per chapter after first fetch and
falls back to WEB automatically with no network. Each provider's required
copyright notice renders under every chapter via `attribution()`, and
neither provider has a method capable of bulk-downloading the translation.

The ESV integration (`src/text/esv.ts`) was built from published API docs,
not exercised against a live key — there was none available to test with.
The parser is unit-tested against the documented response shape; smoke-test
it against a real key before relying on it day to day.

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
