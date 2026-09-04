# AGENTS.md — shared contract for Claude Code and Codex

Repository skills under `.agents/skills/` are the canonical workflow instructions.
Host-local skills (Claude Code's `~/.claude/skills/`, Codex wrappers) may provide
discovery shims and tool-specific syntax, but defer to the matching repository
skill and to this file on any conflict.

## What this is

**Thread** — a Bible reading app for one person. Expo / React Native, offline,
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
script. Every push to `main` builds `thread.apk` in GitHub Actions; tagging
`vX.Y.Z` publishes it under Releases.

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
| `docs/plans/<slug>/` | One folder per planned change: `plan.html` (authoritative), plus `grill-summary.md` / `level-up.md` / `mockup.html` scratch. |
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
