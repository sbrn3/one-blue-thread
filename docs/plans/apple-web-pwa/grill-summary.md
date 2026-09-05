# Apple support via web/PWA — grill summary

Scratch handoff state for `/plan`. Delete once `plan.html` absorbs it.

## Repository facts established before questioning

- `npm run web` does not run today: `react-dom`, `react-native-web` and
  `@expo/metro-runtime` are absent from `package.json`. The `web` script and
  `expo.web.favicon` are aspirational and have never been exercised.
- `expo-sqlite` has a real wasm web build backed by `AccessHandlePoolVFS`
  (OPFS) — genuinely persistent, and it avoids `SharedArrayBuffer`, so no
  COOP/COEP headers are required.
- `expo-notifications` on web ships only `BadgeModule`,
  `ServerRegistrationModule` and `getDevicePushTokenAsync`. **There is no
  scheduler.** The web platform has no local scheduled-notification API;
  iOS 16.4+ PWA push is server-dependent.
- `expo-secure-store` on web is `export default {}` — a bare stub. The backup
  passphrase keychain (`src/backup/nativeIo.ts`, `src/reset/nativeEnv.ts`) has
  no web equivalent.
- Reanimated 4, gesture-handler, `react-native-svg` and safe-area-context all
  ship web builds. Reanimated 4's web path and the press-and-hold seal/unravel
  gestures still need real verification.
- `src/study/assets.generated.ts` partitions Tyndale into 66 study books and
  26 dictionary shards behind lazy thunks — but they are synchronous
  `require()`s, lazy at evaluation time, not download time. A Metro web export
  puts all 92 in the initial bundle unless converted.
- Corpus on disk: `assets/tyndale` 24MB (13MB study, 11MB dictionary),
  `assets/bible` 4.4MB.
- No licensing blocker: WEB is public domain, Tyndale is CC BY-SA 4.0.

## Resolved

- Which Apple route at all → web/PWA, not EAS Build/TestFlight, round 0 (user
  decision before the grill)
- What the web build has to be → a real reading surface with real persisted
  history, not a demo; honest that reminders are not the same as on Android,
  round 1
- Does "nothing leaves the device" hold on web → yes, absolutely, no server
  ever, even at the cost of the cue, round 1
- How it gets built → `react-native-web` compiling the existing RN source;
  reuses `tokens.ts`, StyleSheet, the flow and the loom rendering as-is, round 1
- Who the web reader is → new Apple readers only. Each browser is its own
  independent device with its own bolt. No bridge from an Android history, and
  no append-only-log merge problem, round 2
- What replaces the cue's firing → the reader still authors the if-then
  sentence, and the app generates a daily recurring calendar event with an
  alarm to add to Apple Calendar. No server, no network; the OS the reader
  already trusts does the firing, round 2
- What ships in the payload → WEB Scripture in the bundle; the 92 Tyndale
  shards convert from `require()` to fetch, cached by the service worker as
  they are opened, round 2
- Installability → installable offline-first PWA with a web manifest and
  service worker, not a plain hosted export, round 2
- Backup on web → none. `/src/backup` and the knot's BackupSection are
  absent from the web target. Chosen against the recommendation; the eviction
  risk below is accepted knowingly, round 3
- Web readers and the lab → they run the trial, but the `nudge_hour` and
  `post_miss_morning` MRTs are suppressed because they randomize a
  notification that cannot fire. E7/E4/E1/E3 reversals stay meaningful, round 3
- PWA updates → new service worker precaches and activates on next cold start,
  then emits the existing `build_changed` event. Never swaps code mid-session, round 3
- Hosting → the existing `docs/` GitHub Pages site under a path. One deploy,
  no new infrastructure, service-worker scope contained to that path, round 3
- Storage durability → call `navigator.storage.persist()` on first run, and
  when the app is running in a browser tab rather than installed, say plainly
  that the loom lives only in this browser and installing protects it. This is
  the mitigation for the accepted no-backup risk, round 4
- CI → a web export check joins the gate beside the Android APK build, so the
  web target is never the one untested build in the project, round 4

## Terms added to docs/CONTEXT.md

- (none yet — the calendar-handoff mechanism still needs its name)

## Decisions added to JOURNAL.md

- (pending confirmation)

## Open threads

- **Accepted risk (round 3):** with no backup on web, an evicted browser store
  is unrecoverable. WebKit exempts installed home-screen PWAs from its ~7-day
  script-writable-storage eviction, but a reader who merely visits without
  installing is exposed. Verify on a real device. Mitigation settled in round 4.

- Whether web readers join the `src/lab` trial, and what that does to
  `trial_seed` reconstructability and phase assignment
- How a new build reaches an already-installed PWA (service-worker cache
  invalidation — the project has never had this problem)
- Hosting and URL, relative to the existing `docs/` GitHub Pages site
- The `.ics` handoff fires on days already read — it has no seal-state awareness
- `STATUS.md` still describes the SDK 57 startup repair as uncommitted; the
  working tree is clean and `997a618` carries it. Stale, unrelated to this work.
