# seal-affordance — grill summary

The seal mark (`src/flow/SealZone.tsx`) does not read as a control. Reported
symptom: "pressing on the weave as a hold to seal doesn't seem intuitive — it
doesn't look like a button."

## Resolved
- Scope → fix the affordance, keep hold-to-seal. The hold is doctrine
  (`docs/CONTEXT.md`, "you weave to commit") and E1 exists to test it; replacing
  it now would pre-empt the experiment. Round 1
- Trial state → dev build, not the real trial. Events on this device are not the
  trial record, so no confound amendment is needed and no `hold_cancel` history
  has to be protected. Round 1
- Timing → permanent, not a first-run coach mark. The mark must carry its own
  affordance every day. Round 1

- Touch-down response → yes: an instant visual press state (~140ms) plus a
  touch-down haptic. Today nothing answers the finger until the first pulse at
  200ms, and the weft draws too slowly to register as feedback. Round 2
- Idle motion → yes: a slow, occasional nudge (~9% of the pass, 900ms in /
  700ms out / 1500ms rest), suppressed under reduced motion. Round 2
- Form → deferred: the user asked for all four mocked up rather than chosen
  blind. Specimen sheet published (A Today / B Plate / C Shuttle / D Button /
  E Plate+shuttle), each holdable at true 1:1 size with the agreed press state
  and idle nudge applied to all. Round 2

## Facts settled from the repo (not asked)
- The gesture is `Gesture.LongPress` at `tokens.seal.holdMs` 1200ms /
  `maxDriftPx` 20, composed `Gesture.Simultaneous` with `Gesture.Native()`, with
  scroll locked for the duration.
- The only response to touch-down today is the live weft beginning to draw over
  1.2s. The wrapper `View` has no border, no fill, no radius and no pressed
  state; helper text sits 14px below the SVG.
- Fallbacks already exist: `sealMode='tap'`, screen-reader and reduced-motion all
  render a plain 96pt circular button, and a "Use two taps instead" link sits
  under the mark in the hold path.
- §11 mechanic-friction rung flips seal to tap when `hold_cancel` > 15%
  (`src/lab/steps.ts:151`) — the same annoyance signal, so a discoverability bug
  here would eventually be misread as gesture rejection.
- E1's own reversal is scheduled far out (`docs/plans/lab-trial-integrity/exec.md`),
  so this change lands well before the arm switches.

## Terms added to docs/CONTEXT.md
- (none yet)

## Decisions added to JOURNAL.md
- (none yet — nothing so far is hard to reverse)

## Superseded by /level-up-ui (same folder, level-up.md)
- The form question (B/C/D/E) is closed: all four rejected in favour of "The Fell Line" — the mark becomes the reader real bolt with today drawn as bare warp.
- The off-centre bug is absorbed: the cloth is measured from onLayout width, never a fixed 168.

## Open threads
- **Bug found while measuring, not yet decided:** the mark is off-centre on
  device. SealZone passes the loom a 168px box but `warpSett` caps the sett at
  `MAX_SETT` 16, so 7 warp threads paint only ~109px, leaving ~59px dead to the
  right while the helper text below is centred on the full box. Fixing it is a
  one-line width change; it should ride along with whichever form is chosen.
- Landing branch/worktree is `/plan`'s call. This `thread-aesthetic-loom`
  worktree holds another session's uncommitted `apple-web-pwa` work and STATUS
  says leave it alone; only this new `docs/plans/seal-affordance/` directory was
  added here.
