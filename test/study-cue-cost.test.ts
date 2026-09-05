import { describe, expect, it } from 'vitest';
import { cueTerms } from '../src/study/provider';
import type { Verse } from '../src/text/provider';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const index = require('../assets/tyndale/dictionary-index.json') as unknown;

const idx = (Array.isArray(index) ? index : (index as { entries: unknown[] }).entries) as Parameters<
  typeof cueTerms
>[1];

const TEXT =
  'Finally, my brothers and sisters, rejoice in the Lord! It is no trouble for me to write the same things to you again, and it is a safeguard for you.';
const sitting = (n: number): Verse[] =>
  Array.from({ length: n }, (_, i) => ({ book: 'philippians', chapter: 3, verse: i + 1, text: TEXT }));

/**
 * cueTerms runs synchronously inside a useMemo during Flow's render. It used
 * to re-normalise the whole verse text once per dictionary candidate (~7,900
 * of them), so a sitting that yielded fewer than `limit` cues scanned every
 * candidate for every verse: 6.2s on desktop V8, minutes on Hermes, with the
 * launch screen frozen behind it and no way out.
 *
 * The bound is deliberately loose — this guards the algorithm's shape, not a
 * machine's speed. Anything near the old cost blows straight through it.
 */
describe('cueTerms stays cheap enough to run during render', () => {
  it('scans a full 21-verse sitting without early return in well under a second', () => {
    const started = Date.now();
    const cues = cueTerms(sitting(21), idx, 9999);
    const elapsed = Date.now() - started;

    expect(cues.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1500);
  });

  it('still returns the same cues it always did', () => {
    const cues = cueTerms(sitting(21), idx, 4);
    expect(cues).toHaveLength(4);
    expect(new Set(cues.map((c) => c.articleId)).size).toBe(4);
    expect(cues.every((c) => c.end > c.start)).toBe(true);
  });
});
