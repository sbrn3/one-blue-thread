---
name: user-test
description: Run iterative manual Thread test batches, carrying pass, fail, feedback, and regression history across rounds while skipping already-verified cases unless the user asks for a full retest.
---

# User test

Thread's automated suite can't exercise the on-device flow (notifications,
haptics, gestures, SQLite, the seal). This skill drives manual rounds of that.
Use **synthetic data only** — never put the user's real reading history, verse
notes, cue times, or partner contact into a batch, its history, the HTML runner,
or a report.

1. Accept a batch name and optional intent: `--force-all`, `--new-round`, or
   `--show-history`.
2. Locate the batch definition at `.claude/test-batches/<name>.json`. If absent,
   help create a minimal JSON definition from the plan's acceptance criteria or
   the user stories — don't invent behavior.
3. Read its history file if present. A normal round includes failed, untested,
   and regressed cases; previously-passing cases are marked verified and skipped.
   `--force-all` includes everything; `--new-round` archives/resets only that
   batch after confirming the exact target.
4. Generate a self-contained interactive HTML runner under `.local/user-tests/`
   (git-ignored) with pass/fail controls, a feedback field, the expected result
   per case, and a downloadable JSON result. Never commit runs or histories.
5. Opening the runner in a browser or VS Code needs the host's approval. Give the
   user the absolute path and wait for their saved results.
6. Fold results back into the batch history, flag any pass→fail regressions, and
   summarise aggregate outcomes and synthetic feedback only. An incomplete manual
   round is not "verified".
