# Status

_Last updated: 2026-09-05 (app-quality-foundations merged, tagged v0.5.0)_

## Current phase

Plan work-packages W1–W13 are complete. Four subsequent releases have also
shipped and are on `main`: the **Tyndale Open Resources** addition (offline
study notes, dictionary discovery/search, book introductions, passage-range
remembering — tagged `v0.3.0`, then `v0.3.1` after a corpus-size fix), the
**"The Loom" aesthetic rollout** (PRs #1–#8, tagged separately in the journal),
**account reset as "the unravel"** (PR #9), and **app-quality-foundations**
(fonts/safe-areas/race-safe startup, 44pt controls, operable seal, honest
on-device recovery + external backup, a quiet knot with local Support,
searchable reading history, and a one-time study hint — 7 stacked PRs,
#11–#17, tagged `v0.5.0`) — see `docs/plans/README.md`.

## Branch state

`main` at `8b6c738`, even with `origin/main`. All four releases above are
fully merged and tagged. The 7 app-quality-foundations PRs merged in order;
their branches (local and remote) have been deleted.

## Critical startup repair (uncommitted)

- Expo SDK 57's native dependency set has been aligned with the current SDK 57
  compatibility matrix after the released early patch versions were found to
  be out of sync across Expo core, React Native, SQLite, Notifications,
  Reanimated, Worklets, and related modules.
- `expo install --check`, the 426-test suite, strict TypeScript, Expo public
  config resolution, and an Android production Metro export are clean.
- A freshly built APK still needs one physical-device launch before this can be
  called shipped; no Android device or emulator is available in this environment.

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

- **one-blue-thread-rebrand** — 🔨 in progress. User-approved Scripture-centred
  rename that preserves the Android package and all local data. Public launch is
  gated on name/domain ownership; NIV wording is gated on permission covering
  every publication surface, with the bundled WEB passage as the safe fallback.
  Slices 1-5 are implemented and ticket 6's semantic rename audit is closed: all 99
  residual name hits on current surfaces are classified as brand, compatibility,
  technical, or historical, and the one defect found (24 internal
  `.agents/skills/` docs still calling the product "Thread") is fixed. What is
  left is external or device-bound, not code.
  See `docs/plans/one-blue-thread-rebrand/plan.html`.

- **app-quality-foundations** — ✅ shipped. 7 PRs (#11–#17) merged to `main`
  in order, tagged `v0.5.0`; each independently focused-tested. See
  `docs/plans/app-quality-foundations/plan.html`'s per-slice ledger for exact
  gaps per PR — the device pass below remains open.

## Next actions

- [ ] Build and install a fresh APK from the aligned SDK 57 dependency set;
      confirm cold launch on the affected Android device before tagging a patch release.
- [ ] One Blue Thread ticket 0: secure the canonical domain/search position and
      complete trademark/content review. The local WEB implementation is
      complete; NIV remains gated on written, surface-complete permission.
- [ ] One Blue Thread ticket 6 device matrix: install the renamed APK over a
      populated current build and confirm local state survives; check the
      launcher name, the pending-notification title refresh, and the origin
      passage at 200% type with a screen reader.
- [ ] Physical-device checks: Tyndale accessibility/startup profiling; loom
      Psalms/Jude widths and warp colour `#8F8779` on a real screen.
- [ ] app-quality-foundations device pass: bundled OTF font assets (none
      exist yet — PR #11 shipped without them, flagged), TalkBack/VoiceOver/
      Switch Control + 200% text matrix, real launch timing (fast/400ms/13s/
      14s/rejected), and an on-device exercise of the real `expo-file-system`
      recovery-snapshot move/rotation calls (PR #14 is fake-IO tested only).
- [ ] Smoke-test `src/text/esv.ts` against a real ESV API key.
