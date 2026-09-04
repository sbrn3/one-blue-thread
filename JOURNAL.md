# Journal

Reverse-chronological session notes. Newest first. Keep entries short: what
changed, why, and anything the next session needs to know.

---

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
