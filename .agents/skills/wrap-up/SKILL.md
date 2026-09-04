---
name: wrap-up
description: Close a Thread work session by verifying the current slice, reconciling STATUS/ROADMAP/JOURNAL, checking worktrees, and handing off remaining work without assuming commit or push permission.
---

# Wrap up

Verification and handoff. Does not by itself authorize killing processes,
committing, pushing, merging, deploying, changing providers, or discarding work.

1. Gather facts by hand (no script exists):
   - `git fetch origin`, then `git status --short`, `git log --oneline origin/main..HEAD`
     and `git log --oneline HEAD..origin/main`, `git worktree list`.
   - For each other worktree, `git -C <path> status --short` — read-only; warn
     about any dirty one.
   - Range for this session's work: `git merge-base HEAD main` unless the user
     gives a base. `git diff --stat <base>...HEAD`.
   Read `AGENTS.md` if this is a fresh session.
2. Review the session diff over that range. Identify unrelated pre-existing
   changes (usually uncommitted tracked files untouched by the range's commits)
   and preserve them.
3. Run the gate: `npm test` and `npm run typecheck`. If the change is contained,
   `npx vitest run test/<file>.test.ts` first. Report skipped checks explicitly.
4. Reconcile only the documents this change actually touched:
   - `STATUS.md` — current work, working tree, next actions. It is a snapshot:
     replace the previous "just shipped" line, don't stack.
   - `ROADMAP.md` — flip shipped items to ✅ with evidence (SHA/date); re-order
     planned items if priorities moved.
   - `JOURNAL.md` — one entry for durable completed history or a hard-to-reverse
     decision.
   - `README.md` — only if the repo shape, commands, or hard rules changed.
   - `docs/plans/README.md` and the canonical `plan.html` — plan status.
   - User-facing behavior change → `/update-wiki`.
5. Remove obsolete generated artifacts or duplicate plan snapshots only when
   their scope is known and recovery is clear. Never delete user work to tidy
   the tree.
6. Inspect final tracked + untracked state. If the user explicitly asked to
   commit, make narrow commits by concern with an agent-neutral body and the
   `Co-Authored-By` footer. Otherwise leave uncommitted and say so. Push / PR /
   merge needs separate explicit authorization and the `AGENTS.md` worktree
   rules.
7. Report outcome, files changed, tests run, known limits, branch/worktree
   state, and the safest next action.

Never create a local HTML session report unless the user asks for one.
