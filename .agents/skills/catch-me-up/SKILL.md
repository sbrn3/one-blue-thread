---
name: catch-me-up
description: Orient a new One Blue Thread session by inspecting Git state, STATUS.md, ROADMAP.md, open bugs, and recent history. Reclassifies mislabelled bugs, re-triages the roadmap, batches real bugs, and hands back a short brief.
---

# Catch me up

Gather facts, fix stale docs, split feature requests out of the bug list and onto
the roadmap, re-triage the roadmap, batch the real bugs, hand back a short brief.

## 1. Gather facts

There is no facts script. Run, from the repo root:

```
git fetch origin
git status --short
git log --oneline -10
git log --oneline main..origin/main      # local behind — flag prominently, offer git pull --ff-only
git log --oneline origin/main..main      # local ahead — unpushed work
git worktree list
```

For every worktree other than the main checkout: `git -C <path> status --short` —
flag any dirty one prominently (forgotten work).

Then check concurrent live work: run `ListAgents`. For each peer that is
`interactive` and whose name starts with `thread`, `SendMessage` one line:
`/catch-me-up orienting — one line: what are you working on, and any file/branch/doc I should not touch?`
Give them a moment; fold replies into the brief. Skip if there are no interactive
peers.

Then read `STATUS.md` fully, and `AGENTS.md` if this is a fresh session. Read the
last 2–3 entries of `JOURNAL.md` (newest first) — only entries directly relevant.
`ROADMAP.md` gets a full read in step 4.

Open issues:
`gh issue list --state open --repo sbrn3/one-blue-thread --limit 30` (via
`"C:\Program Files\GitHub CLI\gh.exe"` if `gh` is not on PATH).

## 2. Reconcile stale docs (writes allowed)

Fix any contradiction between `STATUS.md` and reality: wrong branch/ahead-behind,
a merged item still "in progress", wrong test count (`npm test` prints it),
a shipped plan still in the Active Plans table. Keep the STATUS Active Plans
table and `docs/plans/README.md` (if it exists) in sync. Bump the "Last updated"
date. Don't touch code, branches, issues, or the §13.6 invariants. Flag genuinely
ambiguous contradictions in the brief instead of guessing.

## 3. Split feature requests out of the bug list

Read every open `bug` issue. Classify each:
- **Real defect** — documented or clearly-intended behavior is broken. Stays an
  issue; flows into step 5.
- **Feature request** — a new capability or enhancement with no broken behavior
  behind it.

Reclassify feature requests automatically. For each: add one lean line to the
right section of `ROADMAP.md` (📋 planned) — a sentence of what it is plus a
pointer to where the full intent lives (the closed issue `#n` is a fine detail
home). Then
`gh issue close <n> --comment "Reclassified as a feature request during /catch-me-up triage — tracked in ROADMAP.md. No broken behaviour behind this; reopen if that's wrong."`
List what was reclassified in the brief. Only genuinely borderline cases get
flagged for the user instead of closed.

## 4. Re-triage the roadmap

Read `ROADMAP.md` end to end, every run. Then:
- **Staleness cross-check first.** For every 🔨 / 📋 line naming an issue, PR,
  branch, or SHA: check its real state (`gh issue view`, `gh pr view`, JOURNAL
  headings, `git log`). Anything actually merged/shipped flips to ✅ with
  evidence inline. List each flip in the brief's "Docs fixed".
- Drop or merge items already shipped or duplicated.
- Re-order 📋 items by leverage and dependency — unblockers and cheap high-pain
  wins first, big speculative items last.
- Group related items into coherent batches that could each ship as one plan.
- Mark what is 🔨 active now vs 📋 next vs 📋 later.

Write the re-sorted `ROADMAP.md` back. Keep the Shipped history intact — this is
a re-sort of what's planned, not a rewrite of what shipped.

## 5. Triage and batch the remaining bugs

Group the surviving open bugs into 2–4 batches by shared surface / root cause /
owning area of `/src`. For each: issue numbers, one-line theme, size (S/M/L), and
whether it fits an active plan or needs its own. Order batches cheap-high-pain
first. This is default output, not something to wait to be asked for.

## 6. Brief (hard cap ~180 words)

Only these sections. No preamble. One clause per bullet. Empty section → "none".

- **State** — up to 3 bullets: branch, what shipped last, anything dirty or
  divergent.
- **Other sessions** — one line per concurrent session that is not this one, with
  any "don't touch" it flagged. "none" otherwise.
- **Docs fixed** — one line per file, or "none".
- **Reclassified** — `#n → ROADMAP section`, one per line, or "none".
- **Bugs** — one line per open bug: `#n title — <=10-word read`.
- **Roadmap** — top 3 planned items, one line each; then one line for what's
  active now.
- **Blockers** — hard blockers only, or "none".
- **Next** — one recommended action. At most one alternative.

Never expose the user's real reading data in the brief or in any command.
