# Journal

Reverse-chronological session notes. Newest first. Keep entries short: what
changed, why, and anything the next session needs to know.

---

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
