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
