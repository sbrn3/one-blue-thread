# Knot translation switch — grill summary

Scratch handoff for `/plan`. Delete once `plan.html` absorbs it.

## Subject

The knot has no way to change translation. Onboarding's `TranslationScreen` is
the only place it is ever chosen, yet `DoneScreen.tsx:47` already tells the
reader they can "add a translation any time from the knot" — a promise the code
does not keep. `src/text/index.ts:31` carries the same unkept promise in a
comment.

## Target

**`main` at `efcf041`.** Not the `thread` worktree: it sits on the already-merged
`feat/account-reset` at `baddf2f`, 21 commits behind, and was hard-restored
mid-session. All facts below were re-verified against `main`.

## Repo facts established (not asked of the user)

- `thread-plan_3.html` §19 settings table classes translation alongside the cue
  sentence as **"Confound — logged, flags the phase"**. A translation control is
  anticipated by the spec, with experiment-integrity strings attached.
- Plan line 297 calls WEB "silent, automatic infrastructure, not a choice"; line
  313 says it "is never mentioned". Line 226 cuts *multi*-translation outright.
- `hasConfound()` (`src/lab/confound.ts:13`) checks only `cue_changed` and 7+ day
  gaps. Nothing would flag a translation change today.
- `chapter_cache` is keyed `(translation, book, chapter)` — switching is safe;
  each translation keeps its own rows. No migration, no invalidation needed.
- `niv_bible_id` is cached in `meta` **globally** (`src/text/apiBible.ts:82`),
  not per key. A replaced NIV key inherits a stale bible id. Must be cleared.
- `passages` stores book/chapter/verse range — **locations, not verse text**. No
  data migration on switch, but memorised wording shifts under the reader.
- Recall probes fetch verse text live (`src/flow/Flow.tsx:317,357`), so a switch
  changes the wording of an in-flight memory probe.
- `services` is `useMemo(..., [db, onboarded])` (`App.tsx:28`) — the seam to
  rebuild the text provider exists but is keyed only to onboarding completing.
- `useSession` is a **module-level Zustand singleton** (`src/state/session.ts:55`)
  holding today's `sittings`. Rebuilding services does **not** refresh it; an
  explicit `load()` is required after a switch.
- `current_sitting` is persisted in `meta` and sittings derive from verse counts,
  which differ per translation. `load()` clamps via
  `Math.min(sittingIndex, sittings.length - 1)` — can silently move the reader.
- API keys live in SQLite `meta`, not SecureStore — consistent with AGENTS.md.
  `meta` is in `BACKUP_TABLES`, so keys travel in exports.
- `src/text/esv.ts` is **unverified against a live key**; smoke-testing it is
  STATUS.md's only open next action.
- **`src/text/apiBible.ts` (NIV) is equally unverified**, despite carrying no
  warning. Every NIV test uses a fake `fetchFn` (`test/text.test.ts:141,164`);
  the only verification claim in the file is that the base host was checked
  against the *published docs* (`apiBible.ts:13`), not a live call; no real
  api.bible key is referenced anywhere in README, STATUS, or JOURNAL. An earlier
  version used the wrong host and would "fail silently into the WEB fallback
  forever" (`apiBible.ts:14`) — that bug survived because nothing exercised it
  live, and it is the same silent-fallback failure this feature exists to expose.
- `main`'s knot sections, in order: weave · chapters read · study library · cue ·
  partner · backup · adaptive policy · support · starting over.

## Resolved

- Scope → **full switch**: change provider (NIV↔ESV), paste/replace a key, or
  select the bundled text outright. Round 1.
- Spec's confound class → **log a new `translation_changed` event and wire it
  into `hasConfound()`**; days around a switch reported but excluded from
  verdicts. Round 1.
- How a change takes effect → **rebuild services in place**, extending the
  `App.tsx` useMemo seam rather than hard-reloading via `expo-updates`. Round 1.
- Key validation → **live round-trip before saving**. Round 1.
- Naming the bundled text → **"World English Bible (WEB)"**, named in full
  rather than hedged as "the offline text". Round 2. → journalled.
- Mid-day switch → **reload today's portion immediately**. Round 2.
- Key storage → **one key per provider** (additive `meta` keys), so switching
  back does not mean re-pasting. Round 2.
- Validation failure → **refuse the save, keep the current setting, show the
  error**. Round 2.
- Sitting mismatch after reload → **restart the day's portion at sitting 1**
  rather than clamping; re-reading is the safe failure, skipping is not. Round 3.
- Onboarding voice → **name WEB there too**. Round 3.
- Placement → **after "Study library", before "The cue"**. Round 3.
- Onboarding's escape → **"Skip for now — read the World English Bible"**; WEB is
  named in the skip label, not promoted to a third card. Round 4.
- ESV verification → a live ESV round-trip is an acceptance criterion. Round 4.
  **Superseded in round 5** — see below.
- Verification bar → **both NIV and ESV must pass a live round-trip before
  merge**. Round 5, after establishing that NIV is equally unverified (see
  Corrections). Requires a free api.bible key as well as an ESV key. Closes
  STATUS.md's open ESV smoke-test action.
- The misleading docs → **corrected as part of this work**, not a separate
  change: README, STATUS.md, and a missing UNVERIFIED note in `apiBible.ts`.
  Round 5.
- `niv_bible_id` must be cleared whenever the NIV key changes — obvious call,
  recorded rather than asked.

## Terms added to docs/CONTEXT.md

- **The World English Bible (WEB)** — under a new "The text" heading.

## Decisions added to JOURNAL.md

- *Decision 2026-09-05 — WEB is a translation you can choose, not silent
  infrastructure.* Covers the naming, the confound wiring, validation-before-save,
  per-provider keys, and the restart-at-sitting-1 behaviour. **Do not restate it**
  in a `/close-tab` or `/wrap-up` entry — reference it.

## Open threads

- An unencrypted backup export now carries two API keys rather than one. Backup
  encryption is opt-in and off by default (plan §19). Pre-existing exposure,
  widened slightly — not resolved here.
- Switching mid-trial changes the wording of a passage already being memorised.
  The confound flag covers the *data*; nothing addresses the reader's experience
  of meeting a memorised verse in different words. Explicitly deferred.
- Whether `translation_changed` should record from→to provider in its payload was
  treated as implementation detail, not decided here.
- Verification: AGENTS.md mandates a manual checklist only for event-log
  schema/migrations, PRNG, notifications, backup crypto, or partner hand-off.
  A new event type is additive rather than a migration, so the normal
  `npm test && npm run typecheck` gate applies — plus the two live round-trips,
  which no automated test can cover. `/plan` should treat "obtain both keys" as
  a real prerequisite, since it gates the merge.

## Corrections made during this session

- In round 4 the assistant asserted that "NIV via API.Bible is already exercised
  in real use" while arguing against gating on both providers. That was
  unfounded — the repo shows the opposite. The claim was retracted, the
  supporting facts established from source, and the question re-asked; round 5
  reversed the round-4 answer. Recorded here so `/plan` does not rediscover the
  reversal as a contradiction between rounds.

## Confirmed understanding

Confirmed by the user 2026-09-05.

The knot gains a translation section, placed after "Study library" and before
"The cue". It can change provider (NIV↔ESV), paste or replace a key, or select
the bundled text outright — named in full as "World English Bible (WEB)" in both
the knot and onboarding, where the escape becomes "Skip for now — read the World
English Bible" rather than a third card.

This knowingly contradicts the plan, which calls WEB silent infrastructure that
is never mentioned. The reasoning is that the plan's stance only holds while WEB
appears solely as an invisible catch: once translation is changeable, an unnamed
fallback plus a bad key yields a reader who believes they are in NIV and is not.
Naming WEB makes the fallback legible; validating keys closes the same hole from
the other side.

Guardrails: a key is proved by a live round-trip before saving, and a failure
refuses the save and leaves the current setting untouched. Keys are kept per
provider, and `niv_bible_id` is cleared whenever the NIV key changes. A change
logs `translation_changed`, which `hasConfound()` treats exactly as
`cue_changed`. Services rebuild in place; today's portion reloads and restarts at
sitting 1, because sittings derive from per-translation verse counts and the
existing clamp would otherwise drop a mid-read reader past unread verses.

Before merge, both NIV and ESV must pass a live round-trip, and the docs that
wrongly imply NIV is already proven are corrected in the same change. The user
accepted that this requires obtaining both an api.bible key and an api.esv.org
key, the latter requiring acceptance of Crossway's statement of faith.

Handing off to `/plan` under this slug.
