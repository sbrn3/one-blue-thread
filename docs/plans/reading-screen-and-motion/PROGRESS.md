# Progress: Reading screen and motion

Format: `SNN status | files N | focused result | suite result | types result | gap …`

2026-10-08, planning:
- The device audit (F1–F11) is in plan.html → Device audit.
- The owner chose Direction A, approved `expo-splash-screen`, chose to keep the probe row open, and accepted the E1, E9 and E4/signature boundaries.
- The Smart Review ran; all 14 findings are resolved in plan.html → Smart Review.
- Waiting on the owner's approval of plan.html and exec.md. Next: S00.

## Wave 1 (2026-10-09)

S00 done | files 5 | rec/ui verified on the dev app (knot tap recorded, sheet slide at frames 6–8, F4 reproduced at frame 9) | suite 624 ✓ | types ✓ | `ui.mjs open` also refuses when another session holds an adb reverse (after colliding with another session's headnotes checklist)
S05 done | files 8 | motionTokens ✓ | suite 631 ✓ | types ✓ | pure refactor, values unchanged
S01 done (device splash pending APK) | files 12 | startupTiming, cueTermsFastPath ✓ | suite 639 ✓ | types ✓
  - Root cause of F1: cueTerms re-normalized 7,943 dictionary aliases (NFD plus toLocaleLowerCase, slow on Hermes) inside Flow's first render, for 10.7 s.
  - Dev app on a no-dev bundle, jsStart → weave first frame: 13.0 s → 2.1–2.6 s. Reading shown: 13.7 s → 2.6–2.9 s.
  - Linen splash via expo-splash-screen. Gap: needs a new dev-client APK to see on the device.
S03 done (device check pending) | files 13 | fonts ✓ (with a guard against fontStyle) | suite 644 ✓ | types ✓ | Schibsted Grotesk italic was also bundled for the study-note emphasis
S02 code done, uncommitted | files 4 | suite 644 ✓ | types ✓ | gap: device check (rehearsal) plus the owner's finger. Paused while another session runs its checklist on the phone.
