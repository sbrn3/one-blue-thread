import type { Passage } from '../log/types';
import { logicalDate } from '../log/time';
import { CANON } from '../text/canon';

// fix/marked-list — the memory library's Marked list, grouped by book in
// Bible order and verse order within each book, so a long backlog of marks
// reads like the Bible rather than in the order they happened to be tapped.

export interface MarkGroup {
  book: string;
  marks: Passage[];
}

const ORDER = new Map(CANON.map((b, i) => [b.id, i]));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function groupMarks(marks: Passage[]): MarkGroup[] {
  const byBook = new Map<string, Passage[]>();
  for (const p of marks) {
    const list = byBook.get(p.book) ?? [];
    list.push(p);
    byBook.set(p.book, list);
  }
  return [...byBook.entries()]
    .sort(([a], [b]) => (ORDER.get(a) ?? 999) - (ORDER.get(b) ?? 999) || a.localeCompare(b))
    .map(([book, list]) => ({
      book,
      marks: list.sort((x, y) => x.chapter - y.chapter || x.verse_start - y.verse_start || x.verse_end - y.verse_end || x.id - y.id),
    }));
}

/** "marked 14 Jul" — the reader's logical (4 AM boundary) date. */
export function markedLabel(markedAt: number): string {
  const [, m, d] = logicalDate(markedAt).split('-');
  return `marked ${Number(d)} ${MONTHS[Number(m) - 1] ?? ''}`.trim();
}
