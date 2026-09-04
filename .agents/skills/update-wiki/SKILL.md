---
name: update-wiki
description: Update Thread's user-facing documentation (README and the public demo page) after a verified user-facing behavior change, preserving unrelated prose.
---

# Update wiki

Thread has no in-app help system. Its user-facing surfaces are `README.md` (pitch
+ how it works + how to build) and `docs/index.html` (the public demo / walkthrough
of the daily flow). Run this after implementation is verified.

1. Inspect changed and staged paths plus the actual behavior diff. Skip
   test-only, internal-refactor, doc-only, and purely visual changes that don't
   alter what the user does or sees.
2. Map the change:

   | Change touches | Update |
   |---|---|
   | Onboarding steps, translation choice, book selection | `README.md` (repo-shape line for `/onboarding`) + demo if a shown step changed |
   | Daily flow: arrival, recall, scripture, seal, weave, dismissal | `docs/index.html` walkthrough copy for that zone |
   | Notifications / cue behavior | `README.md` if the described model changed |
   | Backup / export / restore, partner hand-off | `README.md` "Building it" / feature notes |
   | Bible text providers (WEB/NIV/ESV), API keys | `README.md` "Bible text" section |
   | The §13.6 hard rules or repo layout | `README.md` "Hard rules" / "Repository shape" |

3. Read each affected section and make the smallest correction that matches
   shipped behavior and labels. Omit implementation detail and any real user
   data.
4. Review the diff; report what changed or was skipped and why.
5. `docs/index.html` is published to GitHub Pages on push to `main` — note that
   the change goes live on merge; don't publish anything separately.
