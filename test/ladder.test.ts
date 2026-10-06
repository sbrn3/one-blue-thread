import { describe, expect, it } from 'vitest';
import { effectiveRung, hintStyle, ladderStep, nextRung } from '../src/memory/ladder';

describe('cloze ladder', () => {
  it('held steps up (cap 7), partial stays, lost steps back (floor 1)', () => {
    expect(nextRung(1, 'held')).toBe(2);
    expect(nextRung(7, 'held')).toBe(7);
    expect(nextRung(4, 'partial')).toBe(4);
    expect(nextRung(4, 'lost')).toBe(3);
    expect(nextRung(1, 'lost')).toBe(1);
  });

  it('derives the rung from the box when none is stored', () => {
    expect([1, 2, 3, 4, 5].map((b) => effectiveRung(null, b))).toEqual([1, 3, 5, 7, 7]);
    expect(effectiveRung(null, 0)).toBe(1);
    expect(effectiveRung(4, 5)).toBe(4);
    expect(effectiveRung(99, 1)).toBe(7);
    expect(effectiveRung(-3, 1)).toBe(1);
  });

  it('maps rungs to steps and hint styles', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(ladderStep)).toEqual([1, 1, 2, 2, 3, 3, 4]);
    expect([1, 2, 3, 4, 5, 6, 7].map(hintStyle)).toEqual(['stub', 'gap', 'stub', 'gap', 'stub', 'gap', 'none']);
  });
});
