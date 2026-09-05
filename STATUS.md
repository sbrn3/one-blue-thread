# Status

_Last updated: 2026-09-05 (app-quality-foundations PRs opened)_

## Current phase

Plan work-packages W1–W13 are complete. Three subsequent releases have also
shipped and are on `main`: the **Tyndale Open Resources** addition (offline
study notes, dictionary discovery/search, book introductions, passage-range
remembering — tagged `v0.3.0`, then `v0.3.1` after a corpus-size fix), the
**"The Loom" aesthetic rollout** (PRs #1–#8, tagged separately in the journal),
and **account reset as "the unravel"** (PR #9). A fourth, **app-quality-
foundations** (fonts/safe-areas/race-safe startup, 44pt controls, operable
seal, honest on-device recovery + external backup, a quiet knot with local
Support, searchable reading history, and a one-time study hint), is in
progress as 7 stacked PRs (#11–#17) — see `docs/plans/README.md`.

## Branch state

`main` at `efcf041`, even with `origin/main`. All three releases above are
fully merged. The 7 app-quality-foundations PRs are open, stacked in order,
each green on `npm test`/`npm run typecheck`; none merged yet.

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

- **app-quality-foundations** — 🔨 in progress. 7 PRs (#11–#17) opened against
  `main`, each independently focused-tested; awaiting merge in order and a
  device pass. See `docs/plans/app-quality-foundations/plan.html`'s per-slice
  ledger for exact gaps per PR.

## Next actions

- [ ] Merge PRs #11–#17 in order (each depends on the previous).
- [ ] Physical-device checks: Tyndale accessibility/startup profiling; loom
      Psalms/Jude widths and warp colour `#8F8779` on a real screen.
- [ ] app-quality-foundations device pass: bundled OTF font assets (none
      exist yet — PR #11 shipped without them, flagged), TalkBack/VoiceOver/
      Switch Control + 200% text matrix, real launch timing (fast/400ms/13s/
      14s/rejected), and an on-device exercise of the real `expo-file-system`
      recovery-snapshot move/rotation calls (PR #14 is fake-IO tested only).
- [ ] Smoke-test `src/text/esv.ts` against a real ESV API key.
