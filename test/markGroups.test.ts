import { describe, expect, it } from 'vitest';
import type { Passage } from '../src/log/types';
import { groupMarks, markedLabel } from '../src/knot/markGroups';

const mark = (id: number, book: string, chapter: number, a: number, b = a): Passage => ({
  id,
  book,
  chapter,
  verse_start: a,
  verse_end: b,
  marked_at: id,
  promoted_at: null,
  box: 1,
  due_date: null,
  last_grade: null,
  held_since: null,
  rung: null,
  source: null,
});

describe('marked list grouping (fix/marked-list)', () => {
  it('groups by book in Bible order, verses in order within each book', () => {
    const groups = groupMarks([
      mark(1, 'john', 3, 16),
      mark(2, 'genesis', 1, 1),
      mark(3, 'john', 1, 14),
      mark(4, 'john', 3, 5, 6),
      mark(5, 'psalms', 23, 1),
    ]);
    expect(groups.map((g) => g.book)).toEqual(['genesis', 'psalms', 'john']);
    expect(groups[2].marks.map((p) => `${p.chapter}:${p.verse_start}`)).toEqual(['1:14', '3:5', '3:16']);
  });

  it('labels the day a verse was marked', () => {
    expect(markedLabel(Date.parse('2026-07-14T02:00:00Z'))).toMatch(/^marked \d{1,2} (Jul)$/);
  });
});
