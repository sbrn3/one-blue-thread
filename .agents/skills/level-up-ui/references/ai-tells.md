# AI tells

Adapted from ryanthedev/design-for-ai (`ai-tells.md`) and Yu-369/VibeCurb drift constraints. AI interfaces converge on the same patterns not because they are low quality but because they encode *no decision*. Uniformity masking absent choices is the tell.

## The AI Slop Test

Would someone immediately believe an AI made this with no designer involved? If yes, name which tells are present and replace each with an intentional choice that traces to purpose and audience.

Before any visual choice, state the aesthetic direction in 2 to 3 specific words: "clinical instrument", "field notebook", "editorial ledger". Never the null direction "clean and modern".

## Catalogue

### Typography
- Inter, Roboto, Open Sans as the body face - signals no type choice was made.
- h1 barely larger than body; a single weight doing all the work.
- Every heading the same size regardless of level.

### Color
- Cyan or teal on near-black.
- Purple-to-blue (or any) gradient with no mood rationale.
- Aurora / mesh gradient backgrounds as decoration.
- Semantic state carried by hue alone.

### Layout
- Identical same-size cards in a regular grid, text centered.
- Symmetrical bento grid with no size logic.
- A hero section on a surface that has no reason for one.
- Glassmorphism (frosted blur) applied to everything.
- Centered single-column everything, max-width 640, generous vertical rhythm, nothing else.

### Motion
- Bounce / spring easing on everything.
- Fade-and-rise entrance on every element on scroll.
- Motion with no informational purpose.

### Content / copy
- Em-dash overuse (five or more).
- Buzzword stacking ("seamless", "powerful", "intuitive", "effortless").
- Placeholder lorem or "Lorem-ish" marketing filler left in.
- Emoji used as icons.

## Decay doctrine

Tells evolve. Yesterday's anti-slop pick (Space Grotesk, then; whatever is trendy now) becomes tomorrow's tell as ecosystem practice catches up. Re-audit this list when it feels stale. The framework - *does this encode a decision* - outlasts any frozen entry.

## This project's own tells

- Reaching for a font, icon set, gradient, or dependency the app does not already use, purely to feel designed. The token system and existing primitives come first.
- A "dashboard aesthetic" (KPI tiles, sparklines, streak counters, accent-color chips) imported onto a surface that is a quiet daily reading, not an analytics product. Thread has one reader and deliberately no streaks to defend.
- Values hard-coded in a `StyleSheet` instead of pulled from `src/ui/tokens.ts`.
