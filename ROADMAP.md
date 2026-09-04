# Roadmap

Future features and larger changes, beyond the plan's W1–W13 work-packages
(which are all landed). Near-term tactical items live in `STATUS.md` → Next
actions; this file is for things that need their own design pass.

Status key: 📋 planned · 🔨 in progress · ✅ shipped · ❄️ parked

## Planned

### 📋 Account reset button
Return the app to first-run / pre-onboarding state — a clean start for a user
who hasn't really begun. Full notes in `memory/deferred-account-reset.md`.
- Clears: event log, Leitner schedule, notification window/decisions, lab phase
  assignments + bandit posteriors, cached chapters, onboarding-complete flag.
- Open question: reconcile with the append-only `events` / additive-only
  migrations hard rule (README §13.6) — delete the DB file, or start a fresh
  `trial_seed`/epoch that analysis ignores before.
- Open question: do the on-device API key and translation choice survive?
- Likely `src/knot/DiagnosticsSection.tsx`, double-confirm.

### 🔨 The weave zone becomes cloth ("The Loom")
Plan: `docs/plans/aesthetic-thread-textile/plan.html`. The locked aesthetic
direction implies a product change, not a restyle: **one book of the Bible = one
bolt of woven cloth**. Warp thread count = the book's chapter count; length =
calendar days since the book was started; a weft pass = a day you read. A missed
day leaves bare warp you can see through; the first pass after a lapse leaves a
permanent **set mark**.
- **Replaces** today's 15-column grid of sealed/dashed squares in
  `WeaveZone.tsx` — the zone's meaning changes from "this month" to "this book".
  Note `src/knot/Knot.tsx` is a second caller of that component.
- Chapter counts come from `bundledChapterCount()`; no new data source needed.
- Renders via `react-native-svg` + Reanimated (both already in the stack). Warp
  is drawn per-row-span so opacity can track support — costs more than the
  current `View` grid; **may need Skia for long books** (Psalms is 150 chapters).
- Shipping as 7 PRs off `feat/loom-*` in `../thread-aesthetic-loom`.
- Deferred to its own plan: the shelf of finished book-bolts.

## Under consideration

_(nothing yet — add ideas here before they graduate to Planned)_

## Parked

_(none)_

## Shipped

- ✅ 2026-09-04 — Tyndale Open study notes, Bible dictionary, and passage-range remembering
- ✅ 2026-07-21 — W13 adaptive layer (Thompson sampling nudge-hour bandit)
- ✅ 2026-07-21 — §19 operations, W10 completion, R6 year review
- ✅ 2026-07-15 — W12 lapse ladder + partner hand-off
- ✅ 2026-07-15 — W9 analysis engine + reports, W10 encrypted backup
- ✅ 2026-07-14 — W1–W8: foundation, text layer, five-zone flow, knot, recall,
  notifications, experiment engine
