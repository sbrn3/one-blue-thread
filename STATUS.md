# Status

_Last updated: 2026-09-05 (doc correction)_

## Current phase

Plan work-packages W1–W13 are complete. Two subsequent releases have also
shipped and are on `main`: the **Tyndale Open Resources** addition (offline
study notes, dictionary discovery/search, book introductions, passage-range
remembering — tagged `v0.3.0`, then `v0.3.1` after a corpus-size fix) and the
**"The Loom" aesthetic rollout** (PRs #1–#8, tagged separately in the journal).
Remaining effort is polish, verification, and the items below.

## Branch state

`main` at `aed0009`, even with `origin/main`. Both releases above are fully
merged — nothing pending for either. `feat/tyndale-open-resources` was found to
be a fast-forward ancestor of `main` (merged before the loom PRs even started)
and has been retired; see `JOURNAL.md`.

## Verification (Tyndale release, historical)

- `npm test` — 318 passing at the time (now 365, with the loom suite added).
- `npm run typecheck` — clean.
- `npm run check:tyndale` — 17,477 study resources, 6,010 dictionary articles,
  66 canonical book partitions, references, links, hashes, and notices verified.
- Android production Metro export — clean after runtime corpus packing; compressed
  export is 10.4 MiB and Hermes bytecode is 20.0 MB, down from 40.0 MB in v0.3.0.
- Physical-device accessibility/startup profiling for Tyndale, and the two
  loom device checks (Psalms/Jude widths, warp colour on a real screen), remain
  open manual checks — no Android device or emulator available in this
  environment.

## Active plans

_(none — both plans above shipped; see `ROADMAP.md` → Shipped)_

## Next actions

- [ ] Physical-device checks: Tyndale accessibility/startup profiling; loom
      Psalms/Jude widths and warp colour `#8F8779` on a real screen.
- [ ] Smoke-test `src/text/esv.ts` against a real ESV API key.
- [ ] `feat/account-reset` (separate worktree, off an older `main`) is built
      and green but not yet merged — needs review + a rebase check before
      merging, same as Tyndale needed here.
