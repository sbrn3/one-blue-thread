# AGENTS.md — shared contract for Claude Code and Codex

Repository skills under `.agents/skills/` are the canonical workflow instructions.
Host-local skills (Claude Code's `~/.claude/skills/`, Codex wrappers) may provide
discovery shims and tool-specific syntax, but defer to the matching repository
skill and to this file on any conflict.

## What this is

**One Blue Thread** — a quiet place to read Scripture. Expo / React Native, offline,
no account, nothing leaves the device. The full product spec is
`../thread-plan_3.html` (v3.0), outside this repo. `README.md` covers only how to
run the repo. Work packages W1–W13 from the plan's table are all landed; current
effort is polish, verification, and the items in `ROADMAP.md`.

## Stack

- **Expo ~57**, React Native 0.86, React 19, TypeScript (strict), Zustand,
  Reanimated 4, `react-native-svg`.
- Storage: `expo-sqlite`. Notifications: `expo-notifications` (needs a dev build,
  not Expo Go). Secrets: `expo-secure-store` / SQLite `meta` table.
- Tests: **Vitest**, `node` environment — pure logic and simulation/invariant
  suites only. No component rendering, no network, no Supabase, no Testing
  Library. Test fakes: `better-sqlite3` stands in for `expo-sqlite`.

## Commands

```sh
npm start          # Expo dev server (Metro) — QR / press a for Android
npm run android    # build+run on Android (dev build required for notifications)
npm run ios | web  # other targets
npm test           # vitest run — the invariant/simulation suite (currently ~301)
npm run typecheck  # tsc --noEmit, strict
```

**The gate is `npm test` && `npm run typecheck`.** There is no lint or `ship`
script. Every push to `main` builds `one-blue-thread.apk` in GitHub Actions; tagging
`vX.Y.Z` publishes it under Releases.

**What's new:** a tag that changes anything a reader can notice also adds a
newest-first entry to `RELEASES` in `src/whatsNew/index.ts`, keyed by that tag:
1–3 plain operational lines, each ≤120 characters. Claude drafts it in the
release PR and the owner edits it in review. Fix-only and internal tags (CI,
docs, refactors) add none. `test/whatsNew.test.ts` guards the format.

## The owner's phone (dev client)

The owner's phone (motorola edge 50 neo, adb serial `ZY22KR4XFF`) has **two
apps side by side**:

- **One Blue Thread** (`com.sngugi.thread`): the release APK from
  `android-apk.yml`. It holds the owner's **real reading data** and works with
  no laptop. Update it only by installing a newer release APK over it
  (`adb install -r`; same package and debug signing key, so data survives).
  Never uninstall it, and never point a dev server at it.
- **One Blue Thread (dev)** (`com.sngugi.thread.dev`, hazard-striped DEV icon):
  the dev-client debug build from the `Dev client APK` workflow, built with
  `APP_VARIANT=development` (`app.config.js`). It has its **own separate
  data**. Restore a backup into it to test against real data. **It won't open
  without a Metro server it can reach.** JS-only changes never need a new APK;
  only `app.json`/`app.config.js`, `package.json` or native-config changes do.

**Don't guess. Check the phone.** `adb` is installed via winget, and a shell
started before 2026-10-07 may lack it on PATH. Use the full path:
`%LOCALAPPDATA%\Microsoft\WinGet\Packages\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\platform-tools\adb.exe`

```sh
adb devices                                        # phone listed? if empty: ask the owner to plug in / accept the prompt
adb shell pm list packages com.sngugi              # expect com.sngugi.thread and com.sngugi.thread.dev
adb shell dumpsys activity activities | grep topResumedActivity   # DevLauncherErrorActivity = the dev app failed to load a bundle
adb exec-out screencap -p > phone.png              # see exactly what the owner sees
```

**Serving the dev app a bundle.** Start your own Metro rather than trusting one
you found running. A long-lived Metro whose terminal has gone can't spawn child
processes: its manifest returns HTTP 500 (`runtimeversion:resolve … exited with
non-zero code: 3221225794`), and the phone shows "There was a problem loading the
project". Before pointing the phone at any server, check that its manifest
returns 200. Start Metro with `APP_VARIANT=development` so the manifest matches
the dev app:

```sh
APP_VARIANT=development npx expo start --dev-client --lan --port <free port>   # --lan listens on IPv4 too
curl -s -o /dev/null -w "%{http_code}" -H "expo-platform: android" http://127.0.0.1:<port>/   # must be 200
adb reverse tcp:<port> tcp:<port>
adb shell am start -a android.intent.action.VIEW -d "exp+thread-dev://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A<port>"
```

Metro serves the working tree it starts in, uncommitted changes included. Start
it from the checkout you mean to test, not from a worktree holding another
session's work. One Metro per session; stop it when you are done.

**Screen reviews.** Use `scripts/device/` to see what the phone shows, including
motion that happens too fast for a single screenshot. The scripts need `adb` and
`ffmpeg` (`winget install Gyan.FFmpeg.Essentials`); they find both on PATH or
under winget. They work on the **dev app only**: any command that names the
release app throws, because each launch of it writes an `app_open` row to the
owner's real log. If the phone is locked they stop and say so; ask the owner to
unlock it.

```sh
node scripts/device/ui.mjs open --port <port>         # adb reverse + open the dev app on your Metro
node scripts/device/ui.mjs find "Hold to seal"        # x y label of on-screen elements, by text or accessibility label
node scripts/device/ui.mjs tap "Open settings"        # tap by label; `hold <label> <ms>` presses and holds
node scripts/device/rec.mjs knot 3 --fps 8 --tap "Open settings"
                                                      # record a tap → .device/knot.png, frames tiled and numbered
node scripts/device/rec.mjs seal 4 --hold "Hold to seal" 1900 --crop 600:110:0:1180
                                                      # record a press-and-hold, zoomed on one row
```

`--crop w:h:x:y` (in 600×1334 recording pixels) zooms in on one area, such as
the seal row. A recording stops early once the screen stops changing. A dev
bundle's cold start includes about 8 s of bundle loading; time release-speed
behaviour with `APP_VARIANT=development npx expo start --dev-client --no-dev --minify --lan`.
**One session drives the phone at a time.** Before you relaunch or force-stop
the dev app, run `adb reverse --list`. A tunnel to a port that isn't yours means
another session is mid-test on it: message that session first. `ui.mjs open`
refuses in that case unless you pass `--force`. Output goes to `.device/` (gitignored). Images of the dev app can show the
owner's restored data, so keep them local; commit only synthetic-data images.

## Source layout (README "Repository shape", plan §05)

`/src` — `onboarding` · `flow` (Arrival·Recall·Scripture·Seal·Weave·Dismissal) ·
`knot` (the settings sheet) · `cue` · `notify` · `text` (TextProvider WEB/NIV/ESV) ·
`log` (append-only event log) · `lab` (PRNG, phase assignment, experiments,
`analysis/`) · `memory` (Leitner) · `partner` (hand-off only, no network) ·
`backup` (encrypted export/restore) · `ui` (`tokens.ts`) · `errors` · `services` ·
`state` (Zustand stores). Tests in `/test`, one file per area.

## Hard rules (plan §13.6 — enforced by tests, do not break)

- `events` is **append-only**; migrations are **additive-only**.
- The log writer stamps `ts`, `local_date` (4 AM boundary), and `build_sha` —
  callers never do.
- **No `Math.random()` anywhere.** Seeded PRNG only; the trial year must be
  reconstructible from `trial_seed`.
- Import boundaries: `/src/lab` never imports `/src/ui`; `/src/memory` never
  imports `/src/lab`; `/src/partner` has no code path to a network.
- `test/boundaries.test.ts` enforces the import rules; keep it green.

## Privacy

Personal, offline, single-user. Use **synthetic data only** in mockups,
screenshots, fixtures, and test batches — never the user's real reading history,
verse notes, cue times, prayer/partner contact, or API keys. On-device API keys
live in SQLite `meta`, never in the build or the repo.

## Design

One visual register. App styling is React Native `StyleSheet` reading
`src/ui/tokens.ts` — there is no CSS and no theme switcher. The public demo
landing page `docs/index.html` is the canonical reference for palette and
typography (its `:root` custom properties: `--scripture`, `--display`,
`--thread`, `--ink*`). Vector work uses `react-native-svg`; motion uses
Reanimated and must honour the OS reduce-motion setting.

## Project documents — keep these current

| File | Role |
|---|---|
| `STATUS.md` | Snapshot: current phase, working tree, next actions, Active Plans table. Not a log — replace the "just shipped" line, don't stack. |
| `ROADMAP.md` | Future features / larger changes. `📋 planned · 🔨 in progress · ✅ shipped · ❄️ parked`. New feature ideas land here. |
| `JOURNAL.md` | One short entry per working session, newest first. Durable decisions and completed-work history. |
| `README.md` | Public pitch + how to run the repo + hard rules. |
| `docs/CONTEXT.md` | Glossary of canonical project terms. Created on first use by `/grill`; absent until then. |
| `docs/plans/<slug>/` | One folder per C2-C4 change: `plan.html` owns approved intent/scope; `exec.md` owns recipes; `PROGRESS.md` owns live status; C4 adds `OUTCOME.md` after completion. `grill-summary.md` / `level-up.md` / `mockup.html` remain evidence/scratch. |
| `docs/plans/README.md` | Index / triage ledger of all plans. Created with the first saved plan. |

## Working rules

- Preserve unrelated pre-existing changes in the working tree.
- Commits: narrow, by concern, agent-neutral message body. Footer:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. PR descriptions end
  with the Claude Code generation line.
- Commit/push/merge/deploy each require explicit user authorization — verifying
  and handing off does not.
- Use a sibling **worktree** for broad, risky, multi-session, or 10+ commit work.
  Two or more active worktrees/agents → separate branches, merge via PR in order.
  A small clean single-session change stays on `main`.
- Process termination (`/kill-node`) is destructive — only on explicit request.

## Verification policy

Automated (`npm test` + `npm run typecheck`) plus CI is the real ship gate.
Catching the rest in real use on a dev build is the accepted fallback — do not
write itemised manual walkthroughs no one runs. Add a mandatory manual checklist
**only** when a change touches the event-log schema/migrations, PRNG determinism,
notification scheduling, the backup crypto, or the partner hand-off — the places
where "find out later" is genuinely unsafe.
