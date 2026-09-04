// Design tokens — "The Loom" (docs/plans/aesthetic-thread-textile/level-up.md).
// One dyed weft at a time, two voices, no gradients, no shadows beyond a
// hairline. Depth in the cloth comes from genuine over/under occlusion, never
// from a shadow.
//
// Contrast against `paper`: ink 15.5:1 · thread 8.9:1 · madder 4.7:1 ·
// warp 3.15:1. `warp` must clear 3:1 because bare warp carries meaning — it is
// how a missed day is shown — so it is a meaningful graphic, not decoration.
//
// `ink40` is 4.59:1. It was #9C9BA3 at 2.64:1 against the old paper, which fails
// the 4.5:1 floor for body text, and it is used for secondary TEXT at ~56 sites
// (day labels, captions, notes) — not just for rules. Darkened here rather than
// carried forward.
export const tokens = {
  color: {
    paper: '#F4F1E9', // linen ground
    ink: '#1A1A17', // text, seal core
    thread: '#2E3A8C', // the dyed weft: progress, cloth, sealed state
    warp: '#8F8779', // the undyed warp; bare warp is a gap
    madder: '#B5482F', // a mark *you* made: focus, destructive confirm, kept verse
    dyeSoft: '#E7E9F4', // the weft's tint — selected rows, soft fills
    ink60: '#5B584F',
    ink40: '#726D5C', // secondary text — 4.59:1, see note below
    ink15: '#E0DACB', // rules and gaps
  },
  // One natural dye per book, assigned by canonical index (see src/ui/dye.ts).
  // Only ever one on screen at a time; a year of reading is a polychrome shelf.
  dye: [
    '#2E3A8C', // indigo
    '#B5482F', // madder root
    '#6B4E37', // walnut hull
    '#A8761E', // weld
    '#3E6B5A', // woad
    '#8E2F4A', // cochineal
  ],
  font: {
    display: 'Schibsted Grotesk', // the app's voice (400–900)
    scripture: 'Newsreader', // the text's voice — a different register
    mono: 'JetBrains Mono', // data, timestamps, reports
  },
  seal: {
    holdMs: 1200, // ~1.2s hold — E1 arm B replaces this with a tap
    maxDriftPx: 20, // below this the hold cancels constantly (§05 risk)
  },
} as const;
