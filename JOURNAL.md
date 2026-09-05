# Journal

Reverse-chronological session notes. Newest first. Keep entries short: what
changed, why, and anything the next session needs to know.

---

## 2026-09-05 — The rebrand semantic audit is closed

Ticket 6's scoped name search over current surfaces (excluding `JOURNAL.md`,
`docs/plans/`, and bundled assets, which are historical by design) returns 99
hits, all classified:

- **Brand** — the new name on `app.json`, `src/brand/`, backup, knot and
  onboarding copy, `README.md`, `AGENTS.md`, site metadata, and the APK
  artifact.
- **Compatibility** — the legacy pending-notification matcher
  (`title !== 'Thread'`), the dual `thread-backup` / `one-blue-thread-backup`
  filename matcher and its near-miss tests, and the deliberately preserved
  `slug: "thread"` and `com.sngugi.thread`.
- **Technical** — the weaving "Thread count" comment in
  `scripts/lib/icon-mark.mjs`.

One defect: the 24 internal `.agents/skills/` documents still described the
product in the present tense as "Thread". Renamed. No source, schema, event,
seed, or time-boundary change was involved.

Verified: 430 tests, strict TypeScript, and `git diff -- app.json` showing only
`expo.name` changed. `refreshDisplayName()` is wired at the top of
`syncWindow()`, ahead of its early returns, so a paused or nudge-free reader
still gets the title migration.

Still open, and neither is code: ticket 0 (domain, trademark, and cultural
content review) gates public launch, and the Android upgrade/accessibility
device matrix needs physical hardware. The whole rebrand is still uncommitted
in `thread-aesthetic-loom/` on `main`, not on `feat/one-blue-thread-rebrand`
as the plan intends.

## Decision 2026-09-05 — One Blue Thread puts Scripture before product prose

**Decision:** The public product name is **One Blue Thread**, with the descriptor
“A quiet place to read Scripture.” The name is grounded in Numbers 15:37–41.
Whenever a product or marketing surface cites that source or explains the blue
cord, it presents the whole passage on the same surface with attribution; small
surfaces omit the explanation. The app does not generate devotional prose,
summaries, prayers, interpretations, takeaways, or simulated spiritual
authority. Scripture is the primary voice, followed by the reader's own words
and only the operational or factual prose the experience needs.

**Why:** The blue cord gives the name a memorable biblical centre, but the image
must remain subordinate to the passage rather than becoming an invented product
metaphor. The full-passage rule prevents the reference being reduced to a slogan.

**Consequences:** Current releases use the bundled public-domain World English
Bible for the origin passage. NIV remains preferred but cannot ship until
written permission covers every intended app, source, release, website, image,
and marketing surface. The public name changes while the Android package, Expo
slug, database, keys, event names, deterministic seeds, textile code terms, and
legacy backup import remain stable. Exact-name searching found no competing
Bible app or active software brand, and the user accepted unrelated descriptive
results; domain ownership, trademark research, and cultural content review still
gate public launch. Canonical rules live in `docs/BRAND.md`.

## Repair 2026-09-05 - align the SDK 57 native runtime

The installed release dependencies had drifted behind Expo SDK 57's current
compatibility matrix, including Expo core, React Native, SQLite, Notifications,
Reanimated, and Worklets. That is a native/JavaScript mismatch capable of
failing before React paints the launch weave. The dependency manifest and lock
file are now aligned with Expo's required SDK 57 patch versions, and Expo added
the `expo-status-bar` config plugin during the repair. Verification is clean:
426 tests, strict TypeScript, `expo install --check`, public config resolution,
and an Android production Metro export. A fresh APK launch on the affected
physical device remains the release gate.

## Decision 2026-09-05 — WEB is a translation you can choose, not silent infrastructure

**Decision:** The knot gains a translation section that can change provider
(NIV↔ESV), paste or replace a key, or select the bundled public-domain text
outright — named in full as "World English Bible (WEB)", in both the knot and
onboarding. Onboarding's escape becomes "Skip for now — read the World English
Bible" rather than a third card, so screen 5 keeps two licensed choices plus one
low-friction exit. A change logs a new `translation_changed` event that
`hasConfound()` treats exactly as it treats `cue_changed`. Keys are validated by
a live round-trip before being saved; a failed check refuses the save and leaves
the current setting untouched. Keys are kept per provider, so switching back
does not mean re-pasting. A switch reloads today's portion immediately and
restarts it at sitting 1. Both providers must pass a live round-trip before
merge, and the docs that wrongly imply NIV is already proven are corrected as
part of the same work.

**Why:** The plan says the opposite — line 297 calls WEB "silent, automatic
infrastructure, not a choice" and line 313 says it "is never mentioned", with
onboarding screen 5 "the only place translation is ever discussed". That stance
depends on WEB only ever appearing as an invisible catch during a network
failure. It stops holding the moment the knot can change translations at all:
`ChainedProvider` falls back to WEB silently, so an unnamed fallback plus a bad
key produces a reader who believes they are in NIV and is not, with nothing on
screen to contradict them. Naming WEB is what makes the silent fallback legible.
Validation before save closes the same hole from the other side. Restarting the
day's portion rather than clamping follows from sittings being derived from
verse counts that differ per translation — `load()`'s existing
`Math.min` clamp would otherwise drop a mid-read reader past verses they had not
seen, the precise kind of quiet wrongness the monthly eyeball exists to catch.
Re-reading is the safe failure; skipping is not.

**Consequences:** The plan's §19 settings table already classes translation as a
confound, so this is the first setting to make that clause real —
`hasConfound()` has only ever known about `cue_changed` and 7-day gaps, and days
around a switch will now be reported but excluded from verdicts. Recall probes
fetch verse text live, so switching mid-trial changes the wording of an
in-flight memory probe; the confound flag covers the data but the reader still
meets a passage they memorised in different words, which nothing undoes.
Per-provider keys mean two API keys resident in `meta`, which is inside
`BACKUP_TABLES` — an unencrypted export now carries both, where before it
carried one. `niv_bible_id` is cached in `meta` globally rather than per key and
must be cleared whenever the NIV key changes, or a replaced key inherits a stale
bible id. Multi-translation reading stays cut (plan line 226): this is one
primary at a time, changed deliberately, not passages shown side by side.

Designing this surfaced that **neither** licensed provider has ever made a real
network call in this codebase. ESV says so in three places; NIV says nothing, so
it reads as proven when its tests are equally mocked and its only verification
claim is that the host was checked against the published docs. That asymmetry is
not harmless: an earlier `apiBible.ts` pointed at the wrong host and would have
failed silently into the WEB fallback forever, a bug that survived exactly
because nothing exercised it live. The validation round-trip is therefore the
first real exercise of either provider, which is why both are gated on it rather
than ESV alone.

**Branch:** none yet — targets `main` (`efcf041`). Designed via `/grill`; not
implemented.

## 2026-09-05 — Account reset shipped as "the unravel"

Design settled by `/grill` (see the decision entry below), then implemented
directly at the user's request rather than going through `/plan`.

- The reset itself was already written but had never been committed — it sat as
  untracked files on `feat/account-reset`, 25 commits behind `main`. Rebuilt on
  current `main` as `feat/reset-unravel`.
- `performReset()` gained an `onWiped` callback. Without it the UI cannot tell a
  failure *before* the wipe (nothing lost, return to the sheet) from one *after*
  it (data already gone, the app must not carry on). The old `catch` did the
  wrong thing in the second case.
- `src/ui/Unravel.tsx` animates the current book's bolt coming apart: the warp
  stays strung and the weft withdraws, newest pass first, each on its own
  staggered window so it runs on the UI thread with no re-layout.
- Fallback for screen reader / reduced motion is the two-tap confirm, not a
  single tap — the accessible path keeps the same deliberation as the default.

Suite 365 → 374.

## Decision 2026-09-05 — Erasing the account is an unravel, not a danger zone

**Decision:** The account reset is a press-and-hold of about 2.5s that visibly
unravels the bolt of the book being read, re-weaving if released early. The
section is headed "Starting over", not "Danger zone". It offers no backup export
on the way out. Where a hold is unavailable (screen reader active, or reduced
motion), it falls back to the existing two-tap confirm rather than to a single
tap. If the post-wipe reload fails, the app blocks with a "close and reopen"
message instead of returning to the sheet.

**Why:** The app's commit gesture is a hold that weaves; making its destruction
the literal inverse costs almost nothing to build (the loom geometry already
exists) and is far harder to fire through by reflex than a second tap. A longer
hold than the seal's 1200ms prevents muscle memory carrying over from a daily
gesture into an irreversible one. "Danger zone" is borrowed from GitHub settings
and is out of register for an app that deliberately avoids alarm language
everywhere else — gaps stay gaps, a mirror not a threat. Offering an export on
the way out was rejected as friction aimed at the one person who has explicitly
asked for everything to be gone; backup already lives in the same sheet.

**Consequences:** The unravel animates the current book's bolt, which already
renders — so this needs no new derivation and stays inside the existing path
budget. Showing *everything* ever woven was considered and dropped: it would
have required a per-book sealed history that does not exist and a multi-bolt
render that hits the same limit already forcing Psalms to degrade, for a screen
most people see once. The near-empty case is shown honestly rather than
special-cased, so a reader with four days of history watches four rows come
apart; that is the correct signal, but it means the moment has little visual
weight for exactly the person most likely to use it. The two-tap fallback leaves
the accessible path with a different guard from the default one — equal in
deliberation, but not identical in kind.

**Branch:** feat/reset-unravel

## 2026-09-05 — Doc correction: Tyndale was already shipped

- Asked to rebase `feat/tyndale-open-resources` onto `main` (the assumption
  being it predated the loom PRs and would conflict with them). `git rebase
  main` came back with zero commits to replay — checked the reflog first (no
  data lost, original tip `7c5ce98` still reachable) before concluding why:
  the branch tip was already an ancestor of `main`. The 8 Tyndale commits sit
  directly in `main`'s line, fast-forwarded in *before* any loom PR (`#1`
  onward) — confirmed by `src/study/`, `assets/tyndale/`, and tags `v0.3.0`/
  `v0.3.1` all present on `main`, 365 tests passing.
- The branch's own `STATUS.md`/`JOURNAL.md` were never updated post-merge and
  still read "in release verification, pending merge" — that's what caused
  the wrong read the previous session. Corrected `STATUS.md` and
  `docs/plans/README.md` here on `main` to reflect both releases as shipped.
- Retired the now-fully-merged `feat/tyndale-open-resources` branch and its
  worktree (`../thread-tyndale-open-resources`).
- Left open: `feat/account-reset` is a similar situation in miniature — built
  on an older `main`, not yet merged. Worth a rebase check before merging,
  not assumed clean.

## 2026-09-05 — "The Loom" aesthetic rollout

Shipped the whole aesthetic pass as 7 PRs. Plan and design record in
`docs/plans/aesthetic-thread-textile/`.

- **The direction took three attempts.** The first two ("The Sampler", a
  cross-stitch grid; "The Impression", a debossed channel) were both rejected —
  guarding against twee had turned craft into *structure*, structure became
  **grids**, and a grid of discrete cells is the opposite of cloth. The fix was
  a corrected target: a loom, not a sampler. Threads under tension, not a lattice.
- **The idea worth keeping:** one book = one bolt. Warp threads are the book's
  chapters, rows are calendar days, a weft pass is a day read. A missed day
  leaves bare warp you can see through, and the first pass after a lapse leaves
  a permanent set mark. The texture of the cloth is the texture of the practice.
- **Smart Review earned its place.** It found 5 HIGH defects in the plan,
  including a second `WeaveZone` caller (`src/knot/Knot.tsx`) that a naive prop
  change would have broken, and a stale-session trap that would have rendered
  the wrong book's bolt on a book-finish day. Both are now covered by tests.
- **Two pre-existing bugs fixed in passing:** `ink40` was 2.64:1 against paper,
  well under the 4.5:1 floor for the secondary text it is used for; and
  `ThreadRail` forced progress to 1 under reduced motion, showing those readers
  fully woven cloth and no fell line.
- **Left open, deliberately:** a keyboard/switch user without a screen reader
  still gets only the press-and-hold seal. Closing it means restructuring
  §05/§13.4 code and wants its own change.
- **Needs a device:** Psalms (150 chapters) and Jude (1) at real widths, and
  whether the darker warp `#8F8779` reads correctly on a real screen.

Suite 318 → 365. Icons rebuild with `node scripts/build-icons.mjs`.

---

## 2026-09-04 — Offline Tyndale study resources

- Added the CC BY-SA Tyndale Open Study Notes and Bible Dictionary as a
  reproducible, checksum-pinned, partitioned offline corpus.
- Reading now uses contextual verse taps, restrained exact dictionary cues, and
  explicit single-verse or same-chapter passage remembering; the knot has full
  offline title/alias dictionary search.
- Kept lookup/search activity local and out of the event log. Existing memory
  events remain unchanged; identical active ranges are idempotent.
- The first v0.3.0 APK exposed a 28.4 MiB increase over v0.2.0, above the 18 MiB
  gate. The corpus was repacked as lazy gzip modules; Hermes bytecode fell from
  40.0 MB to 20.0 MB. v0.3.1 is the corrected release candidate.

## 2026-09-04 — Project docs, workflow skills, reset button planning

- Added project scaffolding docs: `STATUS.md`, `ROADMAP.md`, this `JOURNAL.md`,
  `docs/plans/README.md`. The repo had none — state was reconstructed from git
  history + README.
- Pulled the 16 workflow skills from the Surgery Logbook project into
  `.agents/skills/` and adapted every one to Thread's stack (Expo/RN, Vitest
  logic suite, `src/ui/tokens.ts`, the §13.6 hard rules, offline/single-user).
  Rewrote `AGENTS.md` into the full shared contract they lean on. The global
  `~/.claude/skills/` wrappers redirect here automatically.
- Added a global `~/.claude/skills/new-project` skill that scaffolds a new
  project (dir + git + skills + STATUS/ROADMAP/JOURNAL docs). Named
  `new-project`, not `init`, because Claude Code's built-in `/init` wins the
  typed command.
- Logged a planned **account reset button** (roadmap + `memory/deferred-account-reset.md`):
  the user hasn't really used the app and wants a clean restart.
- Noted an unresolved contradiction: README says `/src/partner` is "not yet
  built" but `66a9fe8` claims the W12 hand-off shipped. Needs checking.
- `docs/index.html` "the lab" landing-page section is written but still
  uncommitted from the prior session.
- Tests green: 301 passing.

## 2026-07-21 — Phases 5–10 (from git history)

W13 adaptive layer, §19 operations, W10 completion, R6 year review, monthly
SRBAI + the eyeball. Completes the plan's work-package table.

## 2026-07-14/15 — W1–W12 (from git history)

Foundation through the partner hand-off: Expo scaffold + event log + core
algorithms, WEB/NIV text layer, five-zone flow, the knot, recall zone,
cue-strength notifications, experiment engine, analysis + reports, encrypted
backup, onboarding, applied decision-rule profile, lapse ladder.
