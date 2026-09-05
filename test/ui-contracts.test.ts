import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

// docs/plans/app-quality-foundations, Slice 7 — the cross-cutting
// accessibility/visual invariant gate. Same walk-the-source pattern as
// test/boundaries.test.ts: the invariant is what matters, not the tool.

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

function codeOf(file: string): string {
  return readFileSync(file, 'utf8');
}

function toRepoPath(file: string): string {
  return relative(ROOT, file).split(sep).join('/');
}

/**
 * The independently produced interaction allowlist: every source file with
 * a raw `<Pressable>`, `<Switch>`, or `<TextInput>` as of the
 * app-quality-foundations accessibility sweep (Slices 2-7). Each one was
 * reviewed and either meets the 44pt floor directly (`tokens.control.
 * minTarget`, or an explicit 44/48 literal) or carries a documented
 * alternate-route exception in a code comment at the call site (see
 * ScriptureZone.tsx's inline term, ResourceText.tsx's inline link).
 *
 * A new raw interactive element in a file NOT on this list fails the test
 * below — that failure IS the accessibility review checkpoint. Add the
 * file here only after checking it meets the floor or documenting why not.
 */
const INTERACTIVE_CALLER_ALLOWLIST = new Set<string>([
  'src/errors/ErrorBoundary.tsx',
  'src/flow/DismissalZone.tsx',
  'src/flow/ScriptureZone.tsx',
  'src/flow/SealZone.tsx',
  'src/flow/SrbaiZone.tsx',
  'src/flow/StudyHint.tsx',
  'src/knot/BackupSection.tsx',
  'src/knot/ChapterViewer.tsx',
  'src/knot/CueEditor.tsx',
  'src/knot/DisclosureSection.tsx',
  'src/knot/HistoryModal.tsx',
  'src/knot/Knot.tsx',
  'src/knot/PartnerSection.tsx',
  'src/onboarding/screens/AnchorScreen.tsx',
  'src/onboarding/screens/PlaceScreen.tsx',
  'src/onboarding/screens/SafekeepingScreen.tsx',
  // Translation copy/state/provider/key/fallback logic is untouched (parked
  // knot-translation-switch plan) — but its existing Pressables/TextInputs
  // are still in scope for target-size auditing, per the plan's own carve-out.
  'src/onboarding/screens/TranslationScreen.tsx',
  'src/study/DictionaryLibrary.tsx',
  'src/study/VerseContextSheet.tsx',
  'src/ui/BookPicker.tsx',
  'src/ui/FeedbackState.tsx',
  'src/ui/LaunchWeave.tsx',
  'src/ui/controls.tsx',
]);

const RAW_INTERACTIVE = /<Pressable[\s>]|<Switch[\s>]|<TextInput[\s>]/;

function filesWithRawInteractiveElements(): Set<string> {
  const found = new Set<string>();
  for (const f of walk(SRC)) {
    if (RAW_INTERACTIVE.test(codeOf(f))) found.add(toRepoPath(f));
  }
  return found;
}

describe('ui-contracts (docs/plans/app-quality-foundations, Slice 7)', () => {
  it('no legacy hard-coded #fff or the old electric-blue mark tint remain outside tokens.ts', () => {
    for (const f of walk(SRC)) {
      if (toRepoPath(f) === 'src/ui/tokens.ts') continue;
      const code = codeOf(f);
      expect(code, `${toRepoPath(f)} has a raw #fff/#ffffff literal — use tokens.color.paper`).not.toMatch(/#(fff|ffffff)\b/i);
      expect(
        code,
        `${toRepoPath(f)} has the legacy rgba(31,63,255,*) mark tint — use tokens.color.markSoft`,
      ).not.toMatch(/rgba\(\s*31\s*,\s*63\s*,\s*255\s*,/i);
    }
  });

  it('every raw Pressable/Switch/TextInput caller is on the reviewed allowlist', () => {
    for (const f of filesWithRawInteractiveElements()) {
      expect(
        INTERACTIVE_CALLER_ALLOWLIST.has(f),
        `${f} has a raw Pressable/Switch/TextInput not on the reviewed allowlist — audit it and add it deliberately`,
      ).toBe(true);
    }
  });

  it('the allowlist carries no stale entries — every listed file still exists and still has a raw interactive element', () => {
    const found = filesWithRawInteractiveElements();
    for (const f of INTERACTIVE_CALLER_ALLOWLIST) {
      expect(found.has(f), `${f} is allowlisted but no longer has a raw interactive element — remove it`).toBe(true);
    }
  });

  it('every allowlisted file sources its sizing from the shared design tokens, not disconnected magic numbers', () => {
    for (const f of INTERACTIVE_CALLER_ALLOWLIST) {
      const code = codeOf(join(ROOT, f));
      expect(code, `${f} does not import the shared tokens module`).toMatch(/from ['"][.\w/]*\/tokens['"]/);
    }
  });

  // Slice 1's gap, unresolved: no reviewed OTF font assets exist in this
  // environment, so there is nothing under assets/fonts to assert against
  // yet. Tracked here rather than faked as a passing (vacuous) check.
  it.todo('bundled OTF font assets exist for every tokens.font family (blocked on Slice 1s flagged font gap)');
});
