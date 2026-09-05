---
name: dev
description: Start or reuse the One Blue Thread Expo/Metro dev server, or build to a device, when the user asks to run, preview, or screenshot the app.
---

# Dev server

One Blue Thread is an Expo React Native app — there is no localhost web port to poll. The
dev server is Metro; the app runs on a device/emulator or (roughly) in the
browser via `npm run web`.

1. Read `AGENTS.md`. Check for an already-running Metro process (`Get-Process node`
   with a `expo`/`metro` command line, or an existing background session you
   started). Reuse it; do not start a duplicate.
2. Otherwise start it in a persistent background session from the repo root:
   - **Default / logic preview:** `npm run web` — fastest way to see flow and
     knot screens. Note: notifications, SQLite, and haptics are stubbed or absent
     on web.
   - **Real device behavior:** `npm run android` (a dev build is required for
     `expo-notifications`; Expo Go will not do). `npm start` alone if the user
     will pick the target.
   Keep the session id for later polling or shutdown.
3. Wait for the Metro "ready" / bundle-complete line. Report bundler errors and
   the dev-server URL without printing any env values or on-device keys.
4. Opening a GUI browser or launching an emulator needs the host's approval —
   request it, then open `http://localhost:8081` (Metro) or the web URL Expo
   prints.
5. Use synthetic data only. Never sign in with, display, capture, or upload the
   user's real reading log, verse notes, or partner contact.
6. Report whether the server was reused or started, the target, the URL, session
   ownership, and how to stop it (`/kill-node` or stopping the background
   session).

## Iterating on a physical device without 20-minute builds

There is no Android SDK on this machine, so `npm run android` cannot build
locally — the device APK comes from CI. A release build takes ~20 minutes, which
is a terrible loop for a JS-only change, and nearly everything is a JS-only
change.

Do this instead, once:

1. Run the **Dev client APK** workflow (`gh workflow run "Dev client APK"`) and
   install the artifact. It contains `expo-dev-client` and no embedded bundle.
2. `npx expo start --dev-client` on this machine.
3. `adb reverse tcp:8081 tcp:8081` so the phone reaches Metro over USB.

After that every JS or asset edit reloads in about a second, and `console.log`
goes straight to the Metro terminal — no logcat filtering, no artifact download,
no reinstall. Only a **native** change (new native module, `app.json` native
config, SDK bump) needs the dev client rebuilt.

`adb` is not on PATH; fetch Google's platform-tools zip into the scratchpad if
it is missing. The device must have USB debugging enabled and the RSA prompt
accepted (`adb devices` shows `unauthorized` until it is).

Two things this loop is NOT for:

- **Confirming a performance fix.** A debug build is slower than release, so it
  is where you find a perf bug, not where you prove one fixed. Verify against
  the release APK.
- **Anything reproducible off-device.** The launch hang of 2026-09-05 was pure
  logic, and a Node benchmark caught it in seconds after three device builds had
  failed to. Reach for a failing test or a benchmark first; go to the device
  only for what genuinely needs one — native modules, notifications, layout,
  fonts, accessibility, upgrade behaviour.
