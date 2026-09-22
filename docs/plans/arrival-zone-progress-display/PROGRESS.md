# ArrivalZone progress-line visibility experiments — progress

Format: `SNN status | files N | focused result | suite result | types result | gap …`

S01 done | files 8 (registry.ts, arrivalVisibility.ts NEW, report.ts, arrivalVisibility.test.ts NEW, report.test.ts, lab.test.ts, profile.test.ts, reconcile-steps.test.ts) | focused 8/8 files pass | suite 486 passed/1 todo | types clean | gap: reconcile-steps.test.ts needed 2 new/updated cases beyond exec.md's original file list (E3-is-no-longer-last, E12-is-now-last) — not in the original S01 file recipe, added when the full suite caught it. Commit f12896a.

S02 done | files 2 (ArrivalZone.tsx, Flow.tsx) | focused: none (exec.md's own decision — no renderer for Flow, see plan.html Testing Decisions) | suite 486 passed/1 todo | types clean | gap: none. Commit 680e864.

Both experiments queued after E3 in REVERSAL_QUEUE; inert (both lines render as before) until either reaches an active B phase, which — per the existing ~11-month E7→E4→E1→E3 backlog — is not expected for some time. Not yet pushed or opened as a PR.
