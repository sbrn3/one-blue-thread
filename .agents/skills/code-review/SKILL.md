---
name: code-review
description: Review a One Blue Thread diff against the repository standards and its originating plan or user stories, prioritizing concrete regressions, the §13.6 invariants, missing tests, and specification drift.
---

# Code review

Read-only unless the user also asks for fixes.

1. Establish the fixed point: the user-supplied commit/branch, the start of the
   current ticket, or `git merge-base HEAD main`. State the range before
   reviewing.
2. Read `AGENTS.md`, the affected source/tests, approved intent from the
   originating `plan.html`, and only the assigned slice from `exec.md` when it
   exists. Legacy plans may keep recipes in `plan.html`; use explicit user
   stories when no durable plan exists.
3. Review two axes:
   - **Standards:** correctness; the §13.6 hard rules (append-only events,
     additive-only migrations, no `Math.random()`, writer-stamped fields, the
     `/src/lab` `/src/memory` `/src/partner` import boundaries); determinism from
     `trial_seed`; `reconcile()` replay idempotency; React Native behavior and
     gesture/animation correctness; reduce-motion; test quality; repo hygiene;
     avoidable complexity.
   - **Specification:** each acceptance criterion, non-goal, visual direction,
     and verification gate from the plan.
4. Do both axes locally. Sub-agents only on explicit request, and never let
   another agent edit this checkout.
5. For every finding: severity, path + symbol/line, observed behavior, why it
   matters, and the smallest credible fix. Don't report preferences as defects.
6. Check tests for false confidence: missing assertions, wrong fakes, skipped
   edge cases, behavior asserted below the public seam, invariants not actually
   exercised.
7. Lead with findings by severity, then open questions, then a short coverage
   summary. Say explicitly when nothing remains and name residual verification
   limits.

If asked to apply findings, fix confirmed issues narrowly and run `npm test` +
`npm run typecheck`; do not silently expand the review into implementation.
