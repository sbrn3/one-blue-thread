# One Blue Thread rebrand — reviewed implementation draft

Status: direction approved in principle; NIV licensing and final visual QA remain gates.  
Owner/trigger: user-selected rename from Thread to One Blue Thread.  
Next action: finish independent review, integrate findings, publish `plan.html`, then request implementation approval.

## 1. Intent

Rename the public product from **Thread** to **One Blue Thread** and make its biblical source and editorial philosophy explicit without changing the reading model or risking local data. The app should create the conditions for reading Scripture and then become quiet. It must never use AI-generated devotional prose, summaries, interpretations, prayers, “takeaways,” or simulated spiritual authority.

The name comes from Numbers 15:37–41. Whenever a product or marketing surface cites Numbers 15 or explains the blue-thread origin, it must show the entire five-verse passage on that surface. There is no excerpt-only or link-only exception. Small constrained surfaces such as notifications, filenames, store cards, and social captions use the name without invoking or explaining the passage.

Target translation for the brand-origin passage: **NIV**, after permission/licensing and required attribution are documented. Offline fallback: the already-bundled public-domain **World English Bible (WEB)**. No NIV wording is committed to the repository until the licence gate is satisfied.

### Preserve

- The current Loom visual identity: linen `#F4F1E9`, indigo `#2E3A8C`, undyed warp `#8F8779`, current woven icon, cloth geometry, seal, knot, unravel, and natural book dyes.
- Existing application identity and data compatibility: `com.sngugi.thread`, Expo slug `thread`, `thread.db`, `thread_backup_passphrase`, existing backup format, `trial_seed`, deterministic fallback seed strings, event types, and historical build SHAs.
- Existing readers' onboarding state, reading history, cloth, remembered passages, experiments, scheduled decisions, and backups.
- Historical names inside old journal entries, shipped plans, git history, and explanatory source comments where “thread” describes a textile or UI-thread concept rather than the product.

### Change

- Public display name, notification title, current docs/website copy, release artifact label, newly-created backup filename/dialog copy, onboarding identity, and an accessible returning-reader origin section.
- Product voice rules and contribution guidance so future features inherit “Scripture is the voice.”
- Public positioning from “cue delivery system with a reading surface” to “a quiet place to read Scripture,” while retaining cue mechanics beneath the surface.

### Non-goals

- No repo rename, bundle/package ID change, database rename, schema migration, data rewrite, event rename, or backup-format bump.
- No new AI or network service.
- No generated devotional content, passage summary, verse-of-the-day feed, random decorative verse, doctrinal commentary, or claim that the app itself fulfils the command in Numbers.
- No global search-and-replace of “Thread/thread”; many instances are historical or technical.
- No redesign of the proven Loom mechanics or new colour palette.

## 2. Confirmed requirements and user stories

1. As a new reader, I see **One Blue Thread** as the installed app name, so the chosen brand is unambiguous.
2. As a new reader, I can read Numbers 15:37–41 in full during onboarding, so “blue thread” is grounded in Scripture rather than marketing invention.
3. As a reader, I see the translation and required copyright attribution beside the brand-origin passage.
4. As an existing reader who will not see onboarding again, I can open the App section of the knot and read the same complete passage and factual origin note.
5. As a website visitor, I encounter the complete passage on the canonical “Why this name” section before or alongside any explanation of the metaphor.
6. As a visitor on a compact campaign, store, or notification surface, I see the brand name without a Numbers reference or origin explanation, because that surface cannot hold the complete passage responsibly.
7. As a reader, I receive exact Scripture rather than an app-authored summary, devotional, prayer, spiritual diagnosis, or “takeaway.”
8. As a reader, instructional prose remains available when necessary to operate controls, give consent, understand data handling, recover from errors, and interpret behavioural reports.
9. As a reader using Tyndale resources, human-authored study material remains optional, secondary, and clearly attributed as commentary rather than Scripture.
10. As a reader using NIV, I see only licensed NIV text with the required notice; if permission for bundled brand copy is not documented, the public-domain WEB passage is used instead.
11. As an offline reader on first launch, the complete brand-origin passage is available without a network request.
12. As an upgrading reader, my database, onboarding status, reading history, bolt, memory passages, preferences, and experiment state remain untouched.
13. As an upgrading Android reader, the OS treats the renamed APK as an update to the same application rather than a second app.
14. As a reader with scheduled reminders, already-pending and newly-created notifications say “One Blue Thread” without changing their identifiers, triggers, bodies, deterministic allocation, decision rows, or one-nudge ceiling.
15. As a reader exporting after the rename, the share dialog and new filename use One Blue Thread; backups created under the old filename remain importable and removable during reset.
16. As a screen-reader or large-text user, the long origin passage is readable in order, scrollable, attributed, and does not trap the fixed onboarding CTA.
17. As a reader with reduced motion, the rebrand introduces no required animation and preserves existing fallbacks.
18. As a reader who misses a day, I see the same honest bare warp and no new guilt-oriented spiritual copy.
19. As a reader crossing the 4 AM logical boundary, all behaviour remains identical because the rebrand does not touch time derivation.
20. As a reader during year one or after day 366, experiments and adaptive behaviour remain identical because internal seeds, event semantics, and analysis copy contracts are unchanged.
21. As a maintainer, I can distinguish public brand strings from compatibility identifiers and technical textile terms.
22. As a maintainer, a written editorial test prevents future AI summaries or interpretive filler from entering product surfaces unnoticed.

## 3. Product voice contract

Content hierarchy, strongest to weakest:

1. Scripture text, verbatim and attributed.
2. The reader's own words: cue, remembered passage, partner name.
3. Necessary system language: actions, consent, errors, recovery, accessibility, factual behavioural reporting.
4. Factual source context: one restrained sentence explaining that Numbers addresses Israel and that the app borrows its visible-reminder image.
5. Marketing claims, used sparingly and never allowed to interpret the passage.

Editorial checklist for every new string:

- Is this Scripture, the reader's language, or necessary system language?
- Could the actual passage or the reader's own words occupy this space instead?
- Does this text imply an interpretation, spiritual judgement, divine voice, or generated intimacy?
- If commentary is present, is it labelled and attributed?
- If Numbers 15 is cited or the origin is explained, is 15:37–41 present in full on this same surface? If it cannot fit, remove the citation and explanation.

## 4. Aesthetic decision

Approved direction: **Scripture holds the centre**, as revised in `mockup.html#option-a`.

| Layer | Current source | Decision |
|---|---|---|
| Tokens | `src/ui/tokens.ts` | Keep all Loom values; no rebrand palette fork. |
| Typography | Schibsted Grotesk / Newsreader / JetBrains Mono | Keep. Set the origin passage in Newsreader and attribution/reference in mono. |
| Layout | Single-column scroll, fixed footer actions, quiet accordion knot | Keep. Origin content must scroll above a fixed CTA and tolerate 200% text. |
| Colour | Indigo semantic `thread`, warp, linen, madder | Keep internal token name `thread`; it remains semantically correct and avoids churn. |
| Components | `OnboardingScreen`, `DisclosureSection`, current icon | Reuse. Add a shared, read-only `BrandOrigin` passage component. |
| Atmosphere | Material textile metaphor without decoration | Keep. No cross, dove, crown, or generic “Christian app” imagery. |
| Motion | Ritual-only motion with reduced-motion fallbacks | No new motion. The full passage earns stillness. |

The current icon already shows one indigo weft crossing neutral warp and remains the app icon. Add a text wordmark only on marketing/onboarding surfaces; do not put tiny words into icon artwork.

## 5. External and theological gates

### NIV permission gate — blocking target wording, not the whole rebrand

Biblica's current permissions guidance says mobile-app and website use requires written permission, which may be an Express License for a truly non-commercial product without AI/ML features. Before committing NIV 2011 wording:

1. Record whether One Blue Thread qualifies as truly non-commercial and non-AI.
2. Request/obtain the applicable Biblica/API.Bible permission for the exact NIV 2011 edition and every intended surface: bundled offline app code, APK/GitHub Release redistribution, public source repository, GitHub Pages, social/OG imagery, screenshots, and later marketing reuse.
3. Store a public-safe permission record and exact required notice in `docs/BRAND.md`: covered surfaces, edition, source-of-truth link, term/expiry/revocation, and licence owner. Keep confidential contracts and credentials out of git.
4. Have the final NIV text copied from an authorised source and proofread verse-for-verse.
5. If the permission is absent at implementation time, ship the exact bundled WEB passage and WEB attribution; switching later is a copy-only release.

### Cultural/theological guardrail

The short context sentence must state that the command was given to Israel to place a blue cord on garment tassels as a visible prompt to remember and obey God's commandments. It may say the app **borrows the image**. It must not call the app a digital tassel, claim the practice belongs to the app, flatten Jewish practice into branding, or assign speculative symbolism to blue. Final wording and placement require a named content review by someone competent in Jewish biblical practice; if `tzitzit` or `tekhelet` is introduced, define it accurately. The complete passage precedes the product metaphor.

### Search and ownership gate — blocks public launch

Before publishing the rename, record a dated exact-name search across the web and relevant app stores, search relevant trademark registers in intended jurisdictions (explicitly not a legal clearance opinion), secure the chosen canonical domain and key social handle, and name the renewal owner. The prior RDAP snapshot for `onebluethread.com` and `.app` is evidence only, not ownership. If the chosen domain or a material conflict cannot be cleared, stop before public launch and return to naming.

## 6. File-by-file recipe

### Slice 1 — brand contract and licensable source

- `docs/BRAND.md` — ADD. Canonical display name; descriptor “A quiet place to read Scripture”; Scripture-first voice contract; Numbers full-passage rule; approved factual context sentence; NIV gate and required attribution placeholder; WEB fallback text provenance; legacy identifier registry; examples of allowed and rejected prose.
- `src/brand/index.ts` — ADD. Export `DISPLAY_NAME = 'One Blue Thread'`, descriptor, `ORIGIN_REFERENCE = 'Numbers 15:37–41'`, translation label, attribution/provenance, and a helper that derives the five WEB rows from the bundled source rather than duplicating them. Do not add NIV wording until every intended surface is covered by the permission record.
- `test/brand.test.ts` — ADD. Assert verse numbers 37–41 are complete/in order and exactly equal to `assets/bible/web.json` Numbers chapter 15; reference, translation label, provenance, attribution, and display name are inseparable; scan current public brand surfaces to reject partial Numbers citations.

Commit: `docs(brand): define One Blue Thread identity and Scripture-first voice`

### Slice 2 — product-wide editorial audit

- Add a small source-audit fixture/script under `scripts/` plus `test/brand-voice.test.ts` that inventories user-facing literals in `src/flow/*`, `src/knot/*`, `src/onboarding/*`, `src/study/*`, `src/errors/*`, `src/lab/analysis/report.ts`, notifications, and `docs/index.html`. Classify each as Scripture, reader-owned, necessary operation/consent/error, attributed human commentary, behavioural fact, or marketing. Delete or rewrite unclassified interpretive filler.
- Preserve validated SRBAI question wording, exact Bible text, attributed Tyndale resources, error/recovery instructions, and factual experiment reports. The audit is not a simplistic ban on prose.
- Document how new or changed strings update the fixture so review remains deliberate and does not become a brittle snapshot silently refreshed by tooling.

Commit: `test(voice): enforce Scripture-first editorial boundaries`

### Slice 3 — installed identity and bounded copy

- `app.json` — MODIFY public `expo.name` to `One Blue Thread`. Preserve `slug`, Android package, icon paths, and adaptive icon configuration.
- `src/notify/notifier.ts` — MODIFY both title branches to use `DISPLAY_NAME`. Extend the injected notification boundary to list pending native requests and add an idempotent one-time brand refresh that cancels/recreates only requests whose title is `Thread`, preserving identifier, trigger, body, and data exactly; do not insert/delete/change decision rows. Record completion in `meta` only after all replacements succeed so partial failure retries safely.
- `test/notify.test.ts` — MODIFY title expectations and add old-title refresh, no-op/idempotency, exact request preservation, partial-failure retry, and unchanged-decision-row tests.
- `src/backup/index.ts` — MODIFY new export filename to `one-blue-thread-backup-YYYY-MM-DD.json`; preserve formatVersion and restore parsing.
- `src/backup/nativeIo.ts` — MODIFY share dialog title to `Export One Blue Thread backup`.
- `src/reset/nativeEnv.ts` — ADD/EXPORT a pure `isAppShareFilename()` and tighten cleanup to `^(?:thread|one-blue-thread)-backup-\d{4}-\d{2}-\d{2}\.json$`; accept both generations and reject near-misses/unrelated files.
- `src/knot/BackupSection.tsx` — MODIFY visible Thread references to One Blue Thread; keep old backup import compatibility.
- `test/backup.test.ts` and reset-adjacent tests — ADD/UPDATE assertions for new filenames and legacy cleanup/import compatibility.

Commit: `feat(brand): rename installed and system-facing surfaces`

### Slice 4 — Scripture-first origin inside the app

- `src/brand/BrandOrigin.tsx` — ADD a reusable component rendering a heading/reference plus five separate accessible verse Text nodes in DOM order, attribution, and one reviewed factual context sentence. Do not mark the long passage container as one accessible element.
- `src/onboarding/screens/PremiseScreen.tsx` — MODIFY `step` to `One Blue Thread`; replace marketing-heavy premise with the shared full-passage origin, the factual context sentence, and one short operational sentence. Keep Begin and the current scroll/fixed-footer structure.
- `src/knot/Knot.tsx` — MODIFY App disclosure to render a “Why this name” label plus `BrandOrigin` before adaptive policy/reset, so upgraded readers can reach it without resetting.
- `src/onboarding/OnboardingScreen.tsx` — MODIFY explicitly for safe-area bottom insets and enough scroll padding/indicator affordance for the long first screen, following `DoneScreen`; verify small viewport, landscape, and 200% text rather than assuming footer overlap.
- Do not install a component renderer for this rebrand. Use pure data tests, source-level invariants, and mandatory device accessibility checks.

Commit: `feat(onboarding): centre the full Numbers origin passage`

### Slice 5 — public story and distribution surfaces

- `docs/index.html` — MODIFY title, description, canonical URL, OG/Twitter metadata and image, `SoftwareApplication` structured data, hero, thesis, app references, CTA artifact name, and a `#why-one-blue-thread` section. Keep the Loom rail and interactive flow. Add Numbers 15:37–41 in full plus attribution and reviewed context. Reduce prose that interprets Scripture; keep factual mechanics and privacy claims.
- `README.md` — MODIFY current product heading, descriptor, demo/download names, artifact name, and current-tense product references. Add a short link to `docs/BRAND.md`; do not paste the full passage unless README cites Numbers 15.
- `.github/workflows/android-apk.yml` — MODIFY generated release filename and artifact label to `one-blue-thread.apk` / `one-blue-thread-apk`. This is a distribution rename only.
- `AGENTS.md` — MODIFY current product identity and release artifact guidance; add `docs/BRAND.md` as the string/voice source. Preserve all technical rules.
- `THIRD_PARTY_NOTICES.md` — MODIFY only if the selected NIV permission requires a notice there; otherwise keep NIV notice adjacent to each rendered quote and record it in BRAND.
- `docs/CONTEXT.md` — ADD canonical brand definitions: One Blue Thread, Scripture-first voice, and brand-origin passage. Preserve existing textile terms.
- `STATUS.md`, `ROADMAP.md`, `JOURNAL.md`, `docs/plans/README.md` — ADD current plan/status/decision entries. Do not rewrite historical shipped entries.

Commit: `docs(site): publish the One Blue Thread story and distribution name`

Store pipeline assets are out of scope for the current GitHub-APK release because none exists. Future store/screenshots may use the brand without explaining the Numbers origin; if they introduce it, the full-passage rule and NIV surface licence apply.

### Slice 6 — repository-wide semantic rename audit

- Review every remaining exact product-name occurrence returned by the scoped `rg` query. Update current visible product references in `src/onboarding/screens/SafekeepingScreen.tsx`, error/support copy, and any present-tense docs. Preserve technical textile references (`ThreadRail`, `tokens.color.thread`), UI-thread comments, historical artifacts, package ID, DB filename, passphrase key, old backup support, and deterministic seed defaults.
- Create no aliases or mass-renamed modules merely for cosmetic consistency.
- Rerun the search and classify every remaining hit in the PR description as technical, compatibility, historical, or defect.

Commit: `chore(brand): close the semantic rename audit`

## 7. Verification

Automated:

- `npm test`
- `npm run typecheck`
- `rg -n "\\bThread\\b|thread-backup|thread\\.apk|thread-apk"` across current surfaces, with every remaining hit classified.
- Brand tests prove exact equality with bundled WEB 37–41, display name, provenance/attribution, and no partial citation on public surfaces.
- Voice audit inventories all user-facing prose and fails on an unclassified addition.
- Notification tests prove pending and new titles changed while identifiers, triggers, bodies, data, decisions, 4 AM behaviour, silence arms, and post-day-366 buckets remain unchanged.
- Backup/reset tests prove new filename generation, legacy import, strict dual filename matching, and unrelated-file preservation.
- `git diff -- app.json` proves slug and Android package are unchanged.
- `git diff` contains no schema, event type, PRNG, time-boundary, or stored-key changes except the intentional dual cleanup matcher.

Manual/device:

- Upgrade the existing APK in place and confirm all local state survives.
- Confirm launcher and notification shade show “One Blue Thread,” including truncation behaviour.
- First run: read Numbers 15:37–41 in order at normal and 200% font; reach Begin; test TalkBack/VoiceOver verse-by-verse navigation, focus order, attribution, switch control, small screens, and landscape.
- Existing-user path: open Knot → App → Why this name and read the same full passage.
- Offline first run works with no fetch.
- Verify NIV wording and notice against the authorised source if licensed; otherwise verify exact WEB rows against the bundled asset.
- Marketing page: keyboard navigation, mobile layout, reduced motion, passage attribution, metadata, social preview, and direct link to origin section.
- Export a new backup; import both a pre-rebrand `thread-backup-*` file and a new file; confirm reset removes either temporary share filename.
- Missed-day, 4 AM boundary, year-one, and day-366+ smoke scenarios show no behavioural change.

## 8. Rollout and rollback

Use a sibling worktree and `feat/one-blue-thread-rebrand` branch. Land six tracer-bullet PRs in order. Do not rename the repository or package IDs during this release. Public launch is blocked by search/domain ownership; NIV wording is separately blocked by surface-complete permission, with WEB as the release-safe fallback. Tag a minor release after all checks and the outstanding device-quality pass are complete.

Rollback is a display/copy rollback using the same application identity. Never roll back by changing package ID or restoring a database. New backup filenames are reversible because readers accept both generations.

## 9. Ticket graph

0. **Ownership and licence record** — can start immediately; search/domain gate blocks public launch, while NIV permission selects NIV or WEB source for 1.
1. **Brand contract and passage source** — blocked by translation source decision from 0; satisfies stories 2, 3, 7–11, 21–22.
2. **Product-wide editorial audit** — blocked by 1; satisfies 7–9, 18, 20–22.
3. **Installed identity, pending notifications, and backups** — blocked by 1; satisfies 1, 12–15, 19–20. High-effort because native notification replacement must preserve experiment semantics.
4. **Full origin in onboarding and knot** — blocked by 1 and 2; satisfies 2–4, 7–11, 16–18.
5. **Website, docs, and release distribution** — blocked by 0, 2, and 3; satisfies 5–6, 9–10, 21–22.
6. **Semantic rename audit and release verification** — blocked by 3, 4, and 5; satisfies all stories and closes residual risk.

Proposed granularity: each slice is independently reviewable and fits one fresh context window. Slices 3 and 4 can proceed in parallel after their blockers; public publication waits for 0 and all implementation slices.

## 10. Smart review

Independent read-only review completed. Integrated HIGH findings: removed the link-only passage loophole; added a product-wide editorial inventory; added pending-notification refresh; expanded NIV licensing surfaces; added search/trademark/domain ownership. Integrated MEDIUM findings: verse-by-verse accessibility; unconditional safe-area work; bundled-WEB single source of truth; pure/source tests instead of a new renderer; strict dual backup matcher; corrected dependency graph; Android-only update guarantee; named cultural review. LOW findings fixed: unambiguous `src/brand/` module layout and explicit web metadata/store scope.
