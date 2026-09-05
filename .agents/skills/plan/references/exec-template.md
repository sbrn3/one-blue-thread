# Execute {{PLAN_TITLE}}

Grade: {{C2|C3|C4}} — {{triggering signals}}

## Protocol

Use one fresh session per slice. Read only `AGENTS.md`, this protocol, the slice,
`git status --short`, `git log --oneline -5`, and named files. Do not read
`plan.html`, other slices, project status/history, or the full product spec
unless the slice names that dependency. Append one bounded `PROGRESS.md` entry,
return at most 150 tokens, and stop.

Budgets: shared instructions <=500 estimated tokens; slice target <=1,200 and
hard limit 2,000; progress entry <=80; worker result <=150. Estimate tokens as
UTF-8 bytes divided by four until API telemetry is available.

Inspect narrowly: list paths first, search bounded symbols, read line ranges,
inspect `git diff --stat`/`--name-only` before targeted diffs, and show quiet
test output unless a failure needs expansion. Never read `../thread-plan_3.html`
whole or paste worker logs/diffs into the coordinator context.

## Standing decisions

- Branch/worktree/PR policy: {{explicitly authorized policy or unresolved gate}}
- Unverifiable steps: record a gap; never claim a pass.
- Cross-slice integration owner: {{inline task}}

## Execution waves

<!-- C2: use one serial task per wave. C3-C4: parallel tasks require disjoint ownership. -->

| Task | Wave | Depends | Mode | Exclusive ownership |
|---|---:|---|---|---|
| S01 | 1 | — | inline | {{paths}} |

Parallel tasks are allowed only for C3-C4 when at least two tasks are ready,
ownership is disjoint, and each task touches at least four similar files, needs
at least eight expected turns, or would add at least 8,000 tool/diff tokens to
the coordinator. Workers receive no full coordinator history, read only this
protocol plus their slice and named files, and return the bounded result. Keep
shared foundations, architecture, migrations, conflict resolution, and final
integration inline. Record aggregate coordinator + worker token usage.

## S01 — {{title}}

Depends: {{task IDs or none}}  
Mode: {{inline|delegate}}  
Budget: {{file count}}, {{test count}}, <=10 turns  
Owns: {{exclusive paths}}

### Files

- `{{path}}` — {{NEW|MODIFY|DELETE}} — {{stable symbol and exact change/data flow}}

### Tests

- `{{test path}}` — {{behaviours and closest existing pattern}}

### Stop inspecting when

- Named symbols, callers, and closest tests are found.
- No unexpected caller crosses the ownership boundary.

### Verify

- {{focused test command}}
- `npm test -- --reporter=dot 2>&1 | tail -5`
- `npm run typecheck`

### Done when

- Tests and types pass and changes stay inside `Owns`.
- Acceptance stories {{#N}} are satisfied.
- Unverifiable behaviour is recorded in `PROGRESS.md`.
- Rollback: {{one sentence}}.
