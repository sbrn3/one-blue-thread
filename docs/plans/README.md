# Plans

One folder per planned change: `docs/plans/<slug>/`, containing the authoritative
`plan.html` plus any `grill-summary.md` / `level-up.md` / `mockup.html` scratch.
Created by `/plan`; retained by `/save-plan`.

| Slug | Intent | Status | Next action |
|------|--------|--------|-------------|
| tyndale-open-resources | Offline study context, dictionary cues/search, and passage remembering | ✅ shipped | Merged to `main`, tagged v0.3.0 then v0.3.1 (corpus-size fix). |
| aesthetic-thread-textile | Icon, palette, and the weave zone become woven cloth ("The Loom") | ✅ shipped | Merged as PRs #1–#7. Open: device checks for Psalms/Jude widths and the warp colour. |
| account-reset | Erase everything and return to first run, as an unravel of the current bolt | ✅ shipped | Implemented directly from the grill; no plan.html. Decision is in `JOURNAL.md`. |
| app-quality-foundations | Fonts, safe areas, race-safe startup, 44pt controls, operable seal, honest recovery, quiet knot/Support, searchable history, study hint | 🔨 in progress | 7 PRs opened (#11–#17), each with focused tests + typecheck; awaiting merge in PR order and a device pass (bundled font assets, TalkBack/VoiceOver/Switch Control matrix, real `expo-file-system` recovery-snapshot exercise — see plan.html's per-slice ledger for exact gaps). |

Status: 📋 planned · 🔨 in progress · ✅ shipped · ❄️ parked.
`knot-translation-switch` is intentionally not listed here yet — its plan.html asks that it move to Parked in this index only with separate, explicit user approval.
Keep this table and `STATUS.md`'s Active Plans table in sync.
