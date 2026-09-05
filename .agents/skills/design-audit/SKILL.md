---
name: design-audit
description: Audit One Blue Thread's shipped UI for evidence-backed design-system drift across tokens, typography, spacing, color, components, atmosphere, and motion.
---

# Design audit

Read-only diagnosis. Findings do not authorize restyling or fixes.

1. Read `src/ui/tokens.ts`, every screen's `StyleSheet`, representative screens
   in `src/flow` / `src/knot` / `src/onboarding`, relevant tests, and the
   reference palette/type in `docs/index.html`. Note recent visual decisions in
   `JOURNAL.md`.
2. Sweep seven layers: tokens, typography, spacing, color, components,
   atmosphere, motion. Check: values hard-coded instead of pulled from
   `tokens.ts`, near-duplicate colors/spacing, inconsistent hierarchy across
   screens, bespoke re-implementations of a control that already exists in
   `src/ui`, contrast and focus/pressed states, Reanimated motion that ignores
   OS reduce-motion, touch targets under ~44pt, small/large font-scale behavior.
3. Verify every finding against source. Exact paths and symbols. Separate a
   defect from a preference and note confidence.
4. Prioritize by propagation and user impact:
   - critical: a broken/missing token, an unreadable state, a lost interaction;
   - high: repeated drift or weak hierarchy on a primary flow screen;
   - medium: local inconsistency with a clear existing pattern;
   - low: preference or speculative polish.
5. Recommend the smallest leverage point: token fix, a shared `src/ui`
   primitive, narrow screen-level surgery, or a separate plan. Don't propose a
   broad redesign where a token repair resolves it.
6. Report: executive summary, findings table, verified evidence, recommended
   order, explicit non-findings/limits. Keep screenshots outside the repo,
   synthetic data only.

If the user approves a scoped fix, continue through `/visual-surgery` or create
a plan for larger work.
