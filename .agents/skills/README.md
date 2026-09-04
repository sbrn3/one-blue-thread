# Repository skills

Canonical workflow instructions shared by Claude Code and Codex. The host-local
skills (`~/.claude/skills/`, Codex wrappers) are discovery shims that redirect
here whenever `.agents/skills/<name>/SKILL.md` exists — so editing a `SKILL.md`
in this folder changes the behavior every tool gets. `AGENTS.md` at the repo root
outranks any skill on conflict.

These were adapted from the Surgery Logbook set for Thread's stack (Expo / React
Native, Vitest logic suite, `src/ui/tokens.ts`, the §13.6 hard rules, offline /
single-user). If a step still reads like a different project, fix it here.

| Skill | Use |
|---|---|
| `catch-me-up` | Orient a new session; reconcile stale docs; triage bugs and the roadmap |
| `grill` | Interview to sharpen an unresolved design before planning |
| `plan` | Evidence-backed interactive plan before implementation |
| `save-plan` | Retain an approved-but-deferred plan and sync the ledgers |
| `improve-codebase-architecture` | Find high-leverage module-deepening work (analysis only) |
| `level-up-ui` | Force a dull surface toward a distinctive committed direction |
| `design-audit` | Read-only sweep for design-system drift |
| `visual-surgery` | Scoped restyle of a working screen, behavior protected |
| `write-tests` | Focused Vitest coverage at the public seam |
| `code-review` | Review a diff against standards + the originating plan |
| `user-test` | Iterative manual on-device test batches with history |
| `dev` | Start/reuse the Expo/Metro dev server |
| `kill-node` | Stop scoped Node/Metro/Vitest processes (explicit request only) |
| `update-wiki` | Reconcile README + the demo page after a user-facing change |
| `close-tab` | Lightweight focused-task handoff |
| `wrap-up` | End-of-session verify + doc reconciliation + handoff |
