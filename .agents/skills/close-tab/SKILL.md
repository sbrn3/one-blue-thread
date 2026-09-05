---
name: close-tab
description: Close a focused One Blue Thread side task with a concise journal handoff and Git-state check, without the full verification and documentation reconciliation of wrap-up.
---

# Close tab

A lightweight handoff. It does not authorize commits, process termination,
pushes, merges, or discarding work.

1. Establish the range for this focused task: `git merge-base HEAD main` (or a
   base the user names). Run `git status --short`, `git diff --stat <base>...HEAD`,
   and `git log --oneline <base>..HEAD`. Read `AGENTS.md` if this is a fresh
   session. Review only the diff this task created.
2. If code changed and the suite has not already been run this session, run
   `npm test` and `npm run typecheck` (or `npx vitest run test/<file>.test.ts`
   when the change is contained to one area). Report failures, don't conceal
   them.
3. Add or update **one** concise `JOURNAL.md` entry only when the work or a
   decision is durable. Don't duplicate a decision `/grill` already recorded.
4. Preserve unrelated changes; list any unsaved work left in the checkout.
5. If the user explicitly asked to commit, make one narrow commit with an
   agent-neutral body and the `Co-Authored-By` footer from `AGENTS.md`.
   Otherwise leave it uncommitted and say so.
6. Report outcome, verification, branch/worktree, and the next action. Use
   `/wrap-up` when the whole session or several work packages need reconciling.
