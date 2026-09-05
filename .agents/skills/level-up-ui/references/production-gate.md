# Production gate

Adapted from nextlevelbuilder/ui-ux-pro-max (`ux-guidelines.csv`, 119 rules) and design-for-ai `checklists.md`. The chosen direction must be *able* to pass this before handoff. Copy the relevant lines into `level-up.md` as build constraints. This is resilience, not idealised design: it must hold at narrow widths, zoom, text scaling, touch, and keyboard.

## Non-negotiable

- **Contrast** - body text 4.5:1 minimum against its actual background; large text 3:1.
- **Not color alone** - statuses and validation carry a second signal (text, shape, position).
- **Screen reader / focus** - every interactive element has an accessible label and role; logical order; state changes announced.
- **Icons** - `react-native-svg` from the app's existing set. Never emoji as icons.
- **Motion** - honor `prefers-reduced-motion`. Duration scales with distance and context. No infinite loops. A rapid re-trigger may cancel a transition, but the final semantic state, focus, and content must still be correct. Prefer transform/opacity (cheap) over layout-triggering properties.
- **Labels** - every input has a visible associated label; required fields marked; each invalid field has an inline error; errors are announced and linked from an error summary.

## Text and layout resilience

- Essential text reflows without clipping across common phone widths (~360–430 pt), on tablets, and at the OS's largest font-scale setting. Never rely on a specific wrap for meaning.
- Long verse references / book names stay whole or truncate deliberately; they survive a width change.
- Content that can overflow (a long chapter, the weave) scrolls inside its own `ScrollView`, not the screen frame.
- Line length and line-height tuned for sustained scripture reading.
- Respect safe-area insets; don't pin critical UI under the notch or the home indicator.
- Guard against layout shift from late-loading text (chapter fetch) and async state.
- Check `zIndex` / `overflow` and absolute positioning for clipped or unreachable elements.

## Touch

- Touch targets ~44pt minimum with adequate spacing between adjacent ones.
- Custom gestures (swipe, long-press, the seal) do not shadow system gestures (back-swipe, notification pull).
- Keyboard-obscured inputs stay visible — this has bitten the knot editor before (see JOURNAL / commit f105c58).

## Feedback and safety

- Async actions: immediate press feedback, loading state matched to expected wait, disabled re-submit, explicit success and failure messages.
- Destructive actions confirmed or undoable.
- Empty states guide the user somewhere.
- Multi-step processes show progress.

## State and content

- Dates go through the `local_date` / 4 AM-boundary helpers, never raw `Date`.
- Only synthetic data in mockups, screenshots, and fixtures — never the user's real reading history, verse notes, cue times, or partner contact.
- Where the user is in the flow is always legible; nothing dead-ends without a way forward or out.

## Project-specific (One Blue Thread)

- Values come from `src/ui/tokens.ts`, not hard-coded in a `StyleSheet`.
- Reads correctly at the OS's small and large font-scale settings; respects safe-area insets.
- Motion honors the OS reduce-motion setting; Reanimated worklets stay on the UI thread.
- Vector work is `react-native-svg` from the app's existing set — never emoji as icons.
- `npm test` and `npm run typecheck` green; the area's Vitest file passes.
- No new font, icon set, or dependency introduced just for aesthetics.
- Gesture handlers, Zustand/state wiring, navigation, and `expo-*` calls unchanged unless the user approved a behavior change.
