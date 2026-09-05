---
name: write-tests
description: Add or update focused One Blue Thread tests for a module, algorithm, or planned ticket using the existing Vitest simulation/invariant patterns and verifying behavior through the public seam.
---

# Write tests

One Blue Thread's suite is pure-logic Vitest in a `node` environment — no component
rendering. Tests exercise algorithms, the event log, the lab engine, schedulers,
and the §13.6 invariants. `better-sqlite3` stands in for `expo-sqlite`.

1. Read `AGENTS.md`, the implementation, the adjacent `test/*.test.ts` file for
   that area, any shared helpers under `test/util/`, and the relevant plan
   acceptance criteria. Identify the public seam and the failure behavior before
   editing.
2. Reuse existing patterns: the seeded PRNG (`trial_seed`), the fake-clock /
   `local_date` helpers, the in-memory `better-sqlite3` log driver, and
   reconcile-replay harnesses. Never put the user's real reading data in a
   fixture — synthesise it.
3. In a TDD ticket, write one smallest failing behavioral test, run it to confirm
   the expected red, and stop for implementation unless the user asked for the
   whole red-green slice. For already-implemented behavior, add the smallest
   coherent coverage set.
4. Prefer observable behavior and exported functions over internal state or
   snapshots. Cover the invariant boundaries when material: append-only-ness,
   additive-only migrations, determinism from `trial_seed`, replay idempotency in
   `reconcile()`, and the import boundaries in `test/boundaries.test.ts`.
5. Do the work locally. Delegate only if the user explicitly asks for sub-agents.
6. Run the specific file (`npx vitest run test/<file>.test.ts`), then `npm test`
   and `npm run typecheck` in proportion to the change. Report failures, never
   conceal them.
7. Review the diff for brittle timing assumptions, weak assertions, uncleaned
   fake timers, and mocks that make a test pass without exercising behavior.
   Report tests added and residual risk.
