import { describe, expect, it } from 'vitest';
import { splitSittings } from '../src/text/sittings';
import { datesBetween } from '../src/log/time';
import type { Verse } from '../src/text/provider';

const verses = (n: number): Verse[] =>
  Array.from({ length: n }, (_, i) => ({
    book: 'psalms',
    chapter: 119,
    verse: i + 1,
    text: `verse ${i + 1}`,
    paragraphStart: i % 10 === 0,
  }));

// Both of these used to spin the JS thread forever rather than throw or
// return, which on a device reads as "the app opens to a launch screen and
// never moves" — no crash, no error, nothing to retry.
describe('launch-hang guards', () => {
  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    'splitSittings terminates and stays sane for target %p',
    (target) => {
      const out = splitSittings(verses(176), target as number);
      expect(out.length).toBeGreaterThan(0);
      expect(out.flat()).toHaveLength(176);
    },
  );

  it('splitSittings still splits normally on a real target', () => {
    expect(splitSittings(verses(176), 40).length).toBe(5);
  });

  it.each(['Invalid Date', 'undefined', '', '1788583578366', '2026-9-5'])(
    'datesBetween rejects the malformed bound %p instead of walking forever',
    (bad) => {
      expect(() => datesBetween('2026-09-04', bad)).toThrow(/expected YYYY-MM-DD/);
      expect(() => datesBetween(bad, '2026-09-05')).toThrow(/expected YYYY-MM-DD/);
    },
  );

  it('datesBetween still walks a normal range', () => {
    expect(datesBetween('2026-09-04', '2026-09-07')).toEqual(['2026-09-05', '2026-09-06', '2026-09-07']);
  });
});
