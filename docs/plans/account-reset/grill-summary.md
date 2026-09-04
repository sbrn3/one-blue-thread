# Account reset — grill summary

_Design record. `/plan` was skipped at the user's request and this was implemented directly, so there is no `plan.html` for this to fold into — kept as the reasoning behind the decision entry in `JOURNAL.md`._

## Facts resolved from the repo (not asked)
- `expo-updates`, `expo-secure-store`, `expo-notifications` are all dependencies on `main` — the hard-reload path is viable in a dev build.
- Onboarding is gated on `meta['onboarded']`; the wipe clears `meta`, so it genuinely returns to first run.
- The built code passes its 5 tests and uses only design tokens, so it inherits the new "Loom" palette without change.
- What survives a reset was settled before this session: nothing. The API key and translation choice are re-collected by onboarding.
- `days` carries a `book` column, so "every book ever read, with its per-day sealed history" is derivable without new storage.
- The work is **uncommitted** on `feat/account-reset`, which is **25 commits behind `main`**. A rebase is required before it can merge.

## Resolved
- Confirm gesture → **press-and-hold**, not two taps. Round 1. A second tap is too easy to fire through by reflex; the hold is the app's own commit idiom.
- Backup before wipe → **nothing; wipe means wipe**. Round 1. Backup lives in the same sheet already; offering or forcing it is friction aimed at the one person who wants everything gone.
- "Danger zone" heading → **replaced**. Round 1. Borrowed from GitHub settings, out of register for an app that avoids alarm language everywhere else.
- Hold duration → **~2.5s, longer than the seal's 1200ms**. Round 2. Stops muscle memory from a daily gesture carrying into an irreversible one.
- Hold visual → **the cloth unravels**, re-weaving if released early. Round 2. The literal inverse of the seal; reuses loom geometry that already exists.
- Heading text → **"Starting over"**. Round 2. Clarity beats charm at the one place ambiguity is most costly ("Unpick" was considered and rejected as obscure).
- Reload-failure path → **block with a "close and reopen" message**. Round 2. The data is already gone; continuing risks stores resurrecting deleted rows.
- What unravels → **the current book's bolt only**. Round 3, revised by the user after the scope consequence was made explicit. "Everything ever woven" was chosen first, then dropped: it needed a per-book sealed history that does not exist and a multi-bolt render, for a screen seen once.
- Accessible fallback (screen reader / reduced motion) → **the existing two-tap confirm**, not a single tap. Round 3. Nobody gets a weaker guard than the default path.
- Near-empty case → **show the scrap honestly**; no threshold, no substitute swatch. Round 4. Four rows coming apart is the correct signal for someone who should start over.

## Terms added to docs/CONTEXT.md
- Bolt, Warp, Weft, Bare warp, Fell line, Set mark, The seal, **The unravel**, The knot, The cue
- (`docs/CONTEXT.md` created this session; `AGENTS.md` already listed it as "created on first use by /grill".)

## Decisions added to JOURNAL.md
- **Decision 2026-09-05 — Erasing the account is an unravel, not a danger zone.** Covers the gesture, duration, visual, heading, no-backup stance, accessible fallback, and reload-failure path. Do not restate it elsewhere; reference it.

## Open threads
- **No new derivation needed.** The current book's bolt already renders via `WeaveZone`/`Cloth`, so the unravel is an animation over existing geometry and stays inside the existing path budget.
- **Rebase required** onto current `main` before merge. Branch/PR strategy is `/plan`'s call, not this session's.
- **Not revisited:** what survives a reset (nothing), and where the section lives (foot of the knot). Both settled before this session.
