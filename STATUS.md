# Status

_Last updated: 2026-09-04_

## Current phase

Plan work-packages W1–W13 are complete. The approved Tyndale Open Resources
addition is implemented and in release verification: offline study notes,
dictionary discovery/search, book introductions, and explicit passage-range
remembering.

## Branch state

Implementation branch `feat/tyndale-open-resources`; merge and v0.3.0 tag are
pending the final independent audit. The separate `docs/index.html` work in the
main worktree is not part of this release.

## Verification

- `npm test` — 318 passing tests across 38 files.
- `npm run typecheck` — clean.
- `npm run check:tyndale` — 17,477 study resources, 6,010 dictionary articles,
  66 canonical book partitions, references, links, hashes, and notices verified.
- Android production Metro export — clean; compressed export is 12.4 MiB, about
  8.7 MiB above the recorded 3.3 MiB baseline and below the 18 MiB feature gate.
- Physical-device accessibility and startup/heap profiling remain manual checks;
  no Android device or emulator is available in this environment.

## Next actions

- [ ] Merge, push `main`, tag v0.3.0, and confirm the Android release workflow.
- [ ] Smoke-test `src/text/esv.ts` against a real ESV API key.
