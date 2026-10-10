# The fell-line seal — progress

Format: `SNN status | files N | focused result | suite result | types result | gap …`

Live status only. Intent and scope live in `plan.html`; recipes in `exec.md`.

- S01 done | files 3 | rail tests pass | suite 517 pass | types pass | gap: rail look on device
- S02 done | files 6 | fellLine+rail tests pass | suite 529 pass | types pass | gap: line/rail alignment on notched phone, hold/unwind feel, tap mode on device
- Device sweep 2026-10-10 (dev client, v0.11.0, Moto edge 50 neo): PASS rail's woven edge meets the seal line exactly, nothing clipped under the punch-hole; tap mode seals on one tap (replay). FIXED tap mode's pill said "Hold to seal"; now "Tap to seal" whenever the pill is a button (fix/device-sweep). Note: the dev data's Sealing is "Switched to tap" (the app switched it), and the restored snapshot keeps that.
- merged to main as PR #43 (2026-10-02); device checks still owner-verified
