# Knot opener + settings IA — grill summary

## Framing

The word "Knot" isn't intuitive as a settings-opener label — a plain settings
icon would have been enough (issue #30's original ask). But the user's
complaint goes further than the opener: the *order and hierarchy inside the
knot sheet itself* doesn't match how they look for things — they couldn't
naturally find what they wanted. Their proposed process: write out all the
user stories for the settings surface first, then re-derive the order/
hierarchy from those stories, rather than patching the current grouping.

This broadens the work beyond ROADMAP's "small design pass" framing for #30
alone — it now covers the opener AND a re-architecture of the knot's
already-once-redesigned IA (`docs/plans/knot-declutter`, shipped, which built
today's everyday-tier / "More" rare-tier / Your data·Practice·About grouping).

## Resolved
- Scope is opener icon (#30) *and* full knot-sheet IA redesign, driven by
  user stories written first — round 0 (user's own framing).
- 14 user stories written and confirmed ("this looks good"), including the
  user-added night-mode story. (Story text lives in the conversation; restate
  at handoff.)
- Night mode (not in the app or `src/ui/tokens.ts`, a single flat light
  palette) gets a story and a toggle slot in the new hierarchy; its dark-palette
  design (contrast per token, per-book dye legibility, toggle vs system-follow)
  is deferred to its own later grill.
- Grouping axis stays Your data / Practice / About (task/mental model). The
  real complaint was the promotion/auto-expand mechanic, not the axis.
- Support/diagnostics stays hidden until needed (not a permanent visible spot).
- Opener becomes icon-only (settings/gear style); the word "Knot" and the
  pill+label go away.
- Attention behavior: Safekeeping and Support both stay in place within their
  group, collapsed, with a visible "needs attention" marker — no promotion, no
  auto-expand. (JOURNAL entry written.)
- Two-level structure survives: everyday tier (paused banner, weave, cue,
  history) over "More" with Your data / Practice / About.
- Night-mode toggle lives in a new "Appearance" row in the Practice group
  (room to grow later); design of the dark palette still deferred.
- Opener: standard gear icon, with a small dot badge on the gear when
  Safekeeping or Support needs attention.
- Translation switch (parked plan `knot-translation-switch`, confirmed 2026-09-05,
  not built; its "after Study library, before The cue" placement predates this
  redesign) needs a slot in the new layout. Proposed: first row of Practice,
  above Appearance. Awaiting user confirmation.
- Backup demoted (owner, post-handoff): Safekeeping never raises the gear dot or
  a "Needs attention" marker; only Support does. Row stays above Starting over.
- Current inventory (from `Knot.tsx`, `MoreSection.tsx`):
  - Everyday tier: paused-notifications banner (conditional), [promoted
    attention section — being removed], compact weave/bolt, Practice (the cue),
    reading history.
  - Rare tier ("More"): Your data (Safekeeping, Starting over); Practice
    (Partner, Sealing, Adaptive policy); About (Origin story, Study library,
    Support).

## User stories (confirmed; 15 with translation)
Daily: 1 see current book's progress at a glance; 2 edit the if-then cue; 3 revisit a sealed chapter.
Occasional: 4 resume paused notifications; 5 switch tap/hold sealing; 6 set up/check accountability partner + check-in; 7 freeze adaptive notification timing; 8 browse study/dictionary material; 14 night mode; 15 choose translation (added at handoff, parked plan `knot-translation-switch`).
Rare: 9 confirm history is backed up; 10 erase and start over; 11 learn why it's called One Blue Thread.
Trouble: 12 see what's wrong / diagnostics without hunting; 13 find the settings sheet without knowing what "Knot" means.

## Scope addition: translation switch (user request, post-handoff)
The parked `knot-translation-switch` plan (grill-summary + plan.html in
`docs/plans/knot-translation-switch/`, confirmed 2026-09-05, journalled as
"Decision 2026-09-05 — WEB is a translation you can choose") is folded into
this work, absorbed by reference — not re-grilled. Its placement is superseded:
first row of Practice. Proposed delivery: two slices / separate PRs — (1) icon
+ reorganized knot, no key dependency; (2) translation switch, merge still
gated on live NIV + ESV round-trips (needs api.bible + ESV keys). `/plan`
should retire the knot-translation-switch plan dir once absorbed.

### Translation delivery (user-confirmed)
Paste-once: keys entered once in the knot's Translation row, stored in local
`meta` as the original plan specified; no build-time/baked keys (public repo).
App is personal-use for now, so slice 2 is trimmed: drop the onboarding changes
(TranslationScreen/DoneScreen wording, "Skip for now" label). Keep the live key
check, WEB fallback handling, and `translation_changed` confound logging.
Prerequisite stays: obtain free api.bible + api.esv.org keys. NIV permission
gate matters only if the app is ever shared.

## Final layout (confirmed)
Opener: gear + attention dot. Everyday: paused banner, weave, cue, history.
More: Practice (Translation, Appearance, Sealing, Partner, Adaptive policy);
Your data (Safekeeping, Starting over); About (Study library, Origin story, Support).

## Terms added to CONTEXT.md
- (none yet)

## Decisions added to JOURNAL.md
- 2026-10-01 — the knot stops promoting Safekeeping and Support.

## Open threads
- Ordering within each group, reflecting story frequency (proposed in
  conversation, awaiting confirmation).
- Visual form of the "needs attention" marker on rows (existing
  `DisclosureSection` `status`/`attention` styling is the default candidate).
- Night mode's dark-palette design: separate future grill.
