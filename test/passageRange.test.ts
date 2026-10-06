import { describe, expect, it } from 'vitest';
import { EMPTY_SEL, filterBooks, isSelected, rangeLabel, selectedRange, tapVerse } from '../src/knot/passageRange';

describe('passage picker range selection (recall-settings)', () => {
  it('first tap starts, second completes in order, third starts over', () => {
    let s = tapVerse(EMPTY_SEL, 16);
    expect(selectedRange(s)).toBeNull();
    expect(isSelected(s, 16)).toBe(true);
    s = tapVerse(s, 18);
    expect(selectedRange(s)).toEqual({ start: 16, end: 18 });
    s = tapVerse(s, 4);
    expect(s).toEqual({ start: 4, end: null });
  });

  it('a backward second tap is ordered; tapping the same verse twice selects one verse', () => {
    expect(selectedRange(tapVerse(tapVerse(EMPTY_SEL, 9), 3))).toEqual({ start: 3, end: 9 });
    expect(selectedRange(tapVerse(tapVerse(EMPTY_SEL, 5), 5))).toEqual({ start: 5, end: 5 });
  });

  it('labels one and many verses', () => {
    expect(rangeLabel('John', 3, { start: 16, end: 17 })).toBe('John 3:16–17 · 2 verses');
    expect(rangeLabel('John', 11, { start: 35, end: 35 })).toBe('John 11:35 · 1 verse');
    expect(rangeLabel('John', 3, { start: 16, end: null })).toBe('John 3');
  });

  it('filters books by name, canon order; empty query returns all 66', () => {
    const names = filterBooks('jo').map((b) => b.name);
    for (const n of ['Joshua', 'Job', 'Joel', 'Jonah', 'John']) expect(names).toContain(n);
    expect(filterBooks('  ')).toHaveLength(66);
    expect(filterBooks('PSALM').map((b) => b.id)).toContain('psalms');
  });
});
