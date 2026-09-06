# Status

_Last updated: 2026-09-06 (v0.6.0 shipped; docs, render guard and plan ledger closed out)_

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

`main` at `25a3faf`, tagged `v0.6.0` and released with the APK attached.
Merged today: #18 (rebrand), #19 (launch-hang fix, bundled fonts, CI), #20
(docs), #21 (render-path guard), #22 (plan ledger). The `v0.4.0`, `v0.5.0` and
`v0.5.1` release notes now carry a warning that those builds do not open.

The `thread-aesthetic-loom` worktree sits on the merged `fix/launch-hang` and
holds another session's uncommitted `apple-web-pwa` work (`docs/CONTEXT.md`,
`docs/plans/README.md`, three untracked plan directories) - leave it alone. The
`thread/` worktree is still on the long-merged `feat/account-reset` at
`baddf2f` and is badly stale; check `git worktree list` before trusting it.

## The app opens again

`v0.4.0` through `v0.5.1` all shipped an app that froze on its launch screen.
`cueTerms` re-normalised each verse once per dictionary candidate (~7,900 per
verse); with no early return a 21-verse sitting scanned the lot, blocking the
JS thread inside a `useMemo` during `Flow`'s render. Normalising once per
verse took that from 6222ms to 35ms. The weave kept animating throughout
because Reanimated runs on the UI thread, and `LaunchWeave`'s stall timeout
could never fire because `setTimeout` needs the blocked thread - so the Retry
button that would have escaped it never appeared.

The SDK 57 dependency alignment (tagged `v0.5.1`) was never the cause, but its
device-launch gate is now satisfied along with everything else: the `v0.6.0`
build was installed over a populated build on a Motorola edge 50 neo
(Android 16), kept its reading history, reached the reading screen, rendered
all three bundled typefaces, and sat idle instead of pinning a core.

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

- **one-blue-thread-rebrand** — ✅ shipped in `v0.6.0` (PR #18, `2118227`).
  Public name, notification title, backup filenames, onboarding, knot, website
  and release artifact all renamed; the Android package, Expo slug, database,
  keys and deterministic seeds are untouched, so it installs as an upgrade. The
  repository is now `sbrn3/one-blue-thread` and the GitHub Pages URL is the
  permanent canonical address - no domain will be registered. Numbers 15:37-41
  ships in full from the bundled WEB text wherever the name is explained; NIV
  remains gated on surface-complete written permission. Still open: cultural
  review of the origin context line.
  See `docs/plans/one-blue-thread-rebrand/plan.html`.

- **apple-web-pwa** — 📋 planned, **not approved, nothing implemented**. Reaching
  Apple readers as an installable offline-first PWA compiled from the existing
  React Native source through `react-native-web`, hosted from `docs/`. C4:
  12 slices, ~42 files, ~12 sessions. Smart Review complete (4 HIGH, 5 MEDIUM,
  all resolved); aesthetics Direction A chosen; all 7 gates resolved.
  Two risks accepted knowingly by the owner: **no backup on web**, and **no Apple
  hardware exists to verify any of it** — including all seven steps of the
  mandatory calendar checklist. Begins with S01, a throwaway spike whose stop
  conditions can still invalidate the route.
  See `docs/plans/apple-web-pwa/plan.html`.

- **app-quality-foundations** — ✅ shipped. 7 PRs (#11–#17) merged to `main`
  in order, tagged `v0.5.0`; each independently focused-tested. See
  `docs/plans/app-quality-foundations/plan.html`'s per-slice ledger for exact
  gaps per PR — the device pass below remains open.

## Next actions

- [x] ~~Build and install a fresh APK; confirm cold launch on the Android
      device.~~ Done 2026-09-06 on `v0.6.0` - and it found the launch hang that
      had been shipping since `v0.4.0`.
- [ ] Give the suite a real component renderer. PR #21 added a stand-in -
      `test/render-path-cost.test.ts` calls what one `Flow` render calls, in
      render order, against Psalm 119 (176 verses, the canon's worst case), and
      was verified to fail: reintroducing the defect takes it to ~30s against a
      2s bound. That guards this bug class, not the gap itself - nothing still
      renders `Flow`. The obvious route to a renderer adds `react-native-web`,
      which `apple-web-pwa` S02 already owns, so sequence it with that plan.
- [ ] Install the dev-client APK (`Dev client APK` workflow) to retire the
      ~20-minute build loop for JS-only changes. Note it needs Metro running to
      start at all, so do not leave it as the only build on the phone.
- [ ] One Blue Thread: cultural content review of the origin context line by
      someone competent in Jewish biblical practice. Ticket 0 is otherwise
      closed - no domain will be registered, and the repo is now
      `sbrn3/one-blue-thread` with the GitHub Pages URL as the permanent
      canonical address. NIV stays gated on written, surface-complete
      permission; the bundled WEB passage ships.
- [ ] One Blue Thread ticket 6 device matrix - partly done on 2026-09-06.
      Confirmed: installs over a populated build with reading history intact,
      and `refreshDisplayName()` ran (the boot trace logged it completing).
      Still unchecked: the launcher name and notification shade by eye, and the
      origin passage under Knot -> App at 200% type with a screen reader.
- [ ] Physical-device checks: Tyndale accessibility/startup profiling; loom
      Psalms/Jude widths and warp colour `#8F8779` on a real screen.
- [ ] app-quality-foundations device pass: ~~bundled font assets~~ (done in
      `v0.6.0` - three OFL variable fonts bundled and confirmed rendering on
      device), TalkBack/VoiceOver/
      Switch Control + 200% text matrix, real launch timing (fast/400ms/13s/
      14s/rejected), and an on-device exercise of the real `expo-file-system`
      recovery-snapshot move/rotation calls (PR #14 is fake-IO tested only).
- [ ] Smoke-test `src/text/esv.ts` against a real ESV API key. This also answers
      `apple-web-pwa` S01 question 5 (whether `api.esv.org` and `rest.api.bible`
      send browser CORS headers), which decides that plan's S09 branch.
- [ ] `apple-web-pwa`: decide whether to approve. **Sequence it after the APK
      confirmation above** — its S02 adds `react-native-web` / `react-dom` /
      `@expo/metro-runtime` to the same dependency tree the SDK 57 alignment just
      stabilised, and disturbing that before the Android build is confirmed would
      confound the two. Its S11 also edits `README.md`, `AGENTS.md` and the
      landing page, which `one-blue-thread-rebrand` still owns.
