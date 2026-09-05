# C3-C4 planning

Read this only after `SKILL.md` assigns C3 or C4.

## C4 — Smart Review

Before slicing a C4 plan, ask the user to authorize an independent read-only
review agent if delegation is not already authorized. Give the reviewer the
approved intent draft and minimum repository evidence, not the conversation
history. Rate findings HIGH/MEDIUM/LOW and resolve HIGH/MEDIUM items before
approval. Record findings and resolutions in `plan.html`.

Tag only exceptional execution work in `exec.md`:

- **high-effort** — judgment-heavy changes to protected mechanisms or work with
  no established repository pattern; state why.
- **delegate** — mechanical or isolated work meeting the delegation threshold
  below; state the worker's exclusive ownership.

Routine work needs no tag.

## C3-C4 — slices and waves

Cut the recipe into complete slices sized for one fresh session. A slice must be
executable from `AGENTS.md`, `exec.md`'s shared protocol, its own section, and
its named source files. Copy a necessary cross-slice fact into the slice instead
of requiring another slice read.

Each slice records: task ID/title, dependencies, mode, turn/file/test budget,
exclusive ownership, exact file/symbol changes, tests, stop conditions,
verification, acceptance-story IDs, rollback, and unverifiable gaps.

Create the `Execution waves` table in `exec.md`. Tasks in one wave may run in
parallel only when:

1. at least two tasks are ready;
2. exclusive ownership does not overlap;
3. each task touches at least four similar files, needs at least eight expected
   turns, or would add at least 8,000 tool/diff tokens to coordinator context;
4. each worker can operate from the shared protocol plus one slice; and
5. the coordinator can accept a report of at most 150 tokens without rereading
   the full worker diff.

Otherwise use inline execution. Delegation for elapsed-time benefit is allowed
when authorized, but do not claim aggregate token savings without telemetry.
Follow `AGENTS.md` branch/worktree rules for concurrent agents.

Present the proposed slices, dependencies, ownership, and waves to the user as
part of approval. Detailed recipes remain only in `exec.md`; `plan.html` links
to them and keeps intent, scope, evidence, and decisions.

## Execution contract

For each ready slice, use the protocol and red-green loop in `exec.md`. Keep
full searches, diffs, and test output in the worker/slice context. Append one
bounded result to `PROGRESS.md`; never update `plan.html` during execution.

After a parallel wave joins, validate ownership, resolve conflicts inline, and
run its integration gate. C4 completion also requires an independent final diff
audit against `plan.html` + `exec.md`; fix HIGH/MEDIUM gaps, then create
`OUTCOME.md` with commits/PRs, verification, known gaps, and disposition.
