# Implement token-efficient plans

**Status:** implemented 2026-09-05

## Goal

Keep the complete user-facing plan while ensuring each execution agent reads
only its assigned work. Measure total coordinator + worker tokens.

Measured reference: the last plan was ~18,040 tokens; its seven recipes were
~6,174 tokens. Recipe partitioning plus fresh slice sessions is estimated to
remove **~88% of avoidable retained execution context**. This is not a claim
about the entire agent bill.

## Required changes

Update `.agents/skills/plan/SKILL.md` and add an `exec.md` template under
`.agents/skills/plan/references/`. Replace the current binary complexity gate
with the graded system below.

## Complexity grades

Choose the highest matching grade. File counts are guides; risk overrides size.

| Grade | Typical signals | Planning strategy |
|---|---|---|
| C0 — Patch | 1–2 files; one obvious behaviour; no product decision or protected mechanism | No durable plan. Inspect, change, focused test, gate. |
| C1 — Scoped | 3–4 files; one layer; one session; known pattern | Brief in-chat plan. One implementation session; no delegation or progress ledger. |
| C2 — Structured | 5–9 files, two layers, UI decision, or 2–3 shippable slices | `plan.html` + `exec.md`; fresh session per slice; compact `PROGRESS.md`. No delegation by default. |
| C3 — Parallel | 10–24 files, 3+ layers, or 3–6 slices with disjoint ownership | C2 artifacts plus execution waves, worktrees/branches, bounded delegation, and integration gate. |
| C4 — Programme | 25+ files, 7+ slices, high uncertainty, or protected mechanism change | Full C3 strategy plus Smart Review, independent final audit, rollback gates, and `OUTCOME.md`. |

Automatic minimum grades:

- Event-log migration, PRNG determinism, notification scheduling, backup crypto,
  partner hand-off, destructive reset, or dependency migration: **C4**.
- New cross-layer state flow or new persistent data without the mechanisms above:
  **C3**.
- A visible UI direction requiring comparison/mockups: **C2**.
- If uncertainty raises expected scope by one grade, use the higher grade.

Record the selected grade and the signals that triggered it in the plan. If
implementation crosses a grade boundary, stop and re-slice before continuing.

### When delegation is worth it

Use delegation only at C3–C4 and only when all are true:

1. At least two tasks are ready at the same time.
2. Their owned files do not overlap.
3. Each task touches at least four similar files, is expected to need at least
   eight agent turns, or would otherwise add at least 8,000 tool/diff tokens to
   the coordinator context.
4. Each worker can operate from the protocol plus one slice.
5. The coordinator can accept a ≤150-token report without rereading the full
   worker diff.

If these conditions fail, execute inline. Delegation may still be chosen for
elapsed-time savings, but record that it is not expected to save aggregate tokens.

Plans at C2 or above produce the applicable subset of:

```text
docs/plans/<slug>/
  plan.html     # approved intent; never read or edited during execution
  exec.md       # all execution instructions, including parallel strategy
  PROGRESS.md   # append-only, one short result per slice
  OUTCOME.md    # written once after every slice finishes
```

Ownership:

- `plan.html`: rationale, scope, evidence, stories, mockups, approval.
- `exec.md`: file recipes, dependencies, commands, budgets, delegation.
- `PROGRESS.md`: live status only.
- `OUTCOME.md`: final commits/PRs, verification, gaps, disposition.
- Do not duplicate content between these files.

Replace “Keep one authoritative plan. No parallel Markdown snapshot” with the
ownership rules above.

## Token limits

- Shared `exec.md` instructions: ≤500 estimated tokens.
- Each slice: target ≤1,200; hard limit 2,000 tokens.
- Progress entry: ≤80 tokens.
- Worker report: ≤150 tokens.
- Use signatures and data flow, not complete code bodies.
- Estimate tokens as UTF-8 bytes ÷ 4 until API telemetry is available.

## Required `exec.md` format

```markdown
# Execute <plan name>

## Protocol
Use one fresh session per slice. Read only `AGENTS.md`, this protocol, the
assigned slice, `git status --short`, `git log --oneline -5`, and files named by
the slice. Do not read `plan.html`, other slices, STATUS, ROADMAP, JOURNAL, the
full README, or the full product specification unless the slice requires it.
On completion, append one PROGRESS line, return a bounded summary, and stop.

## Execution waves
| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S01 | 1 | — | inline | foundation files |
| S02A | 2 | S01 | delegate | `src/flow/**` |
| S02B | 2 | S01 | delegate | `src/knot/**` |
| S03 | 3 | S02A,S02B | inline | integration files |

## S01 — <name>
Depends: none
Mode: inline | delegate
Budget: <files>, <tests>, ≤10 turns
Owns: <exclusive paths>

### Files
- `<path>` — NEW|MODIFY|DELETE — exact symbol and change.

### Tests
- `<test>` — named behaviours.

### Stop inspecting when
- named symbols, callers, and closest tests are found;
- no unexpected caller crosses the ownership boundary.

### Verify
- focused test
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when
- checks pass;
- changes stay inside `Owns`;
- unverifiable behaviour is recorded as a gap, never claimed as passed.
```

Split a slice during planning if it exceeds a file, token, or turn budget.

## Parallel rules

1. Run only the earliest incomplete wave.
2. Parallel tasks must have disjoint ownership.
3. Use separate branches/worktrees when repository rules require them.
4. Workers must not inherit the coordinator’s full conversation history.
5. Workers read only `AGENTS.md`, the protocol, their slice, and named files.
6. Full searches, diffs, and test logs remain in worker contexts.
7. Worker response: files changed, checks, exceptions, blocker; ≤150 tokens.
8. Coordinator checks ownership and results, not every successful bulk diff.
9. Run integration and the full gate after the wave joins.
10. Record aggregate tokens. Delegation is not a saving until data proves it.

Delegate mechanical, disjoint transformations. Keep shared foundations,
architecture, migrations, conflict resolution, and integration inline.

## Output rules

- List filenames before reading contents.
- Use bounded symbol searches and narrow line ranges.
- Inspect `git diff --stat`/`--name-only` before targeted diffs.
- Show quiet test output; expand only on failure.
- Never read `../thread-plan_3.html` whole.
- Never paste worker diffs or logs into the coordinator context.

## Progress format

```text
S03 done | files 3 | focused green | suite green | types green | gap device SR order
```

Never update `plan.html` during execution.

## Acceptance checks

- A synthetic three-slice plan generates all four artifacts.
- `plan.html` contains no detailed execution recipes.
- One `exec.md` contains the protocol, waves, and self-contained slices.
- Overlapping ownership cannot be scheduled in parallel.
- A worker can execute without reading the plan or another slice.
- Progress updates leave `plan.html` unchanged.
- Token reporting separates coordinator, each worker, and aggregate usage.
