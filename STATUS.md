# Status

_Last updated: 2026-09-04_

## Current phase

**Plan work-packages W1–W13 all landed.** Phase 10 (`480f472`) shipped the W13
adaptive layer — the last item in the plan's own work-package table. The app is
feature-complete against `../thread-plan_3.html` (v3.0); remaining effort is
polish, verification, and small additions.

## Working tree

- **Uncommitted:** `docs/index.html` — new "the lab" section on the landing page
  (how Thread quietly self-experiments; unlocks with the weave). Complete and
  self-contained, just not committed.
- **Uncommitted (new, 2026-09-04):** project docs (`STATUS.md`, `ROADMAP.md`,
  `JOURNAL.md`, `docs/plans/README.md`), the rewritten `AGENTS.md`, and
  `.agents/skills/` — 16 workflow skills adapted from Surgery Logbook. None
  committed yet.

## Branch state

`main`, even with `origin/main`. No other worktrees.

## Recent commits

| Hash | Date | Summary |
|------|------|---------|
| `480f472` | 2026-07-21 | Phase 10: W13 adaptive layer (Thompson sampling, dormant until day 366) |
| `9170fad` | 2026-07-21 | Phases 6–9: §19 operations, W10 completion, R6 year review |
| `f82727f` | 2026-07-21 | Phase 5: monthly SRBAI + the eyeball (§09/§19) |
| `f105c58` | 2026-07-15 | Fix bugs: keyboard-obscured knot inputs, LapseZone flows, SMS URI |
| `66a9fe8` | 2026-07-15 | Phase 4: W12 — lapse ladder, dose stepping, partner hand-off |

## Tests

`npm test` — 301 passing (34 files), clean as of 2026-09-04.

## Next actions

- [ ] Commit the `docs/index.html` "the lab" section.
- [ ] Reconcile the `/src/partner` status: README repo-shape table says "not yet
      built", but commit `66a9fe8` claims W12 partner hand-off shipped. Confirm
      which is current and fix the README.
- [ ] Smoke-test `src/text/esv.ts` against a real ESV API key — it was built
      from published docs and never exercised live.
## Active plans

| Plan | State | Notes |
|------|-------|-------|
| Account reset button | 📋 planned | See `ROADMAP.md` and `memory/deferred-account-reset.md`. |
