---
name: visual-surgery
description: Restyle an existing working One Blue Thread screen that looks flat, inconsistent, or under-designed while protecting React Native behavior, data flow, gestures, and the tokens.ts visual system.
---

# Visual surgery

Improve an existing surface without changing what it does. A request for visual
uplift authorizes diagnosis and a scoped visual implementation — not new
features or a product redesign.

1. Read the screen, its area's tests, `src/ui/tokens.ts`, the `StyleSheet`
   blocks it uses, the reference palette/type in `docs/index.html`, and nearby
   shipped screens. One Blue Thread has one visual register and no theme switcher —
   consistency is measured against `tokens.ts` and the existing flow screens.
2. Capture the current composition in seven layers: tokens, typography, spacing,
   color, components, atmosphere, and motion. Record concrete defects:
   hard-coded values that should be tokens, off-scale spacing, repeated
   structure without hierarchy, contrast failures, Reanimated motion that
   ignores the OS reduce-motion setting, touch targets under ~44pt.
3. Preserve component logic, gesture handlers, Zustand/state wiring, navigation
   behavior, `expo-*` calls, and user-visible copy unless the user separately
   approves behavior changes.
4. Prefer token corrections and narrow `StyleSheet` edits. Reuse existing
   primitives (`src/ui`). Do not add a UI library, icon set, font, or dependency
   just to make a surface feel designed.
5. Use a mockup (see `/plan` Phase 4 / the mockup template) when hierarchy or
   composition is still a product choice. For a small, obvious repair, edit
   directly and explain the direction.
6. Verify: the area's Vitest file, `npm test`, `npm run typecheck`, and a manual
   glance on a dev build — narrow and wide, reduced motion on, keyboard/focus
   where relevant. Synthetic data only in screenshots.
7. Report what changed visually, what behavior was intentionally preserved, and
   any manual checks still open.

For a system-wide diagnosis without implementation, use `/design-audit`.
