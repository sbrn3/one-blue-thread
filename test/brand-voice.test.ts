import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..');
const COPY_MARKERS = /<Text\b|\btitle=|\bsub=|\bprimaryLabel=|\bskipLabel=|Alert\.alert/;
const CATEGORIES = new Set([
  'scripture',
  'reader-owned',
  'operation-consent-error',
  'attributed-human-commentary',
  'behavioural-fact',
  'marketing',
]);
const COPY_ROOTS = ['src/brand', 'src/flow', 'src/knot', 'src/onboarding', 'src/study', 'src/errors', 'src/ui'];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith('.tsx') ? [path] : [];
  });
}

function repoPath(path: string): string {
  return relative(ROOT, path).replaceAll('\\', '/');
}

describe('Scripture-first voice inventory', () => {
  it('requires every copy-bearing product surface to be deliberately classified', () => {
    const discovered = COPY_ROOTS
      .flatMap((dir) => sourceFiles(join(ROOT, dir)))
      .filter((path) => COPY_MARKERS.test(readFileSync(path, 'utf8')))
      .map(repoPath)
      .concat(['src/lab/analysis/report.ts', 'src/notify/notifier.ts', 'docs/index.html'])
      .sort();
    const inventory = JSON.parse(
      readFileSync(join(ROOT, 'docs', 'brand-voice-inventory.json'), 'utf8'),
    ) as Record<string, string[]>;

    expect(Object.keys(inventory).sort()).toEqual(discovered);
    for (const [path, categories] of Object.entries(inventory)) {
      expect(categories.length, `${path} needs at least one content class`).toBeGreaterThan(0);
      for (const category of categories) {
        expect(CATEGORIES.has(category), `${path} has unknown class ${category}`).toBe(true);
      }
    }
  });

  it('rejects common generated-spiritual-prose patterns in product source', () => {
    const paths = COPY_ROOTS
      .flatMap((dir) => sourceFiles(join(ROOT, dir)))
      .concat([join(ROOT, 'src/lab/analysis/report.ts'), join(ROOT, 'src/notify/notifier.ts')]);
    const forbidden = /\b(?:AI[- ]generated devotional|daily takeaway|what God is telling you|God wants you to know today)\b/i;

    for (const path of paths) expect(readFileSync(path, 'utf8'), repoPath(path)).not.toMatch(forbidden);
  });
});
