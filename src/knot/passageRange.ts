import { CANON, type Book } from '../text/canon';

// docs/plans/recall-settings — the memory library's passage picker: pure
// selection logic, kept out of the component so it can be unit-tested.

export interface RangeSel {
  start: number | null;
  end: number | null;
}

export const EMPTY_SEL: RangeSel = { start: null, end: null };

/** First tap sets the start; the second sets the other end (ordered); a third starts over. */
export function tapVerse(sel: RangeSel, verse: number): RangeSel {
  if (sel.start === null || sel.end !== null) return { start: verse, end: null };
  return { start: Math.min(sel.start, verse), end: Math.max(sel.start, verse) };
}

/** A complete range, or null while only one end is chosen. A single verse needs both taps on it. */
export function selectedRange(sel: RangeSel): { start: number; end: number } | null {
  return sel.start !== null && sel.end !== null ? { start: sel.start, end: sel.end } : null;
}

export function isSelected(sel: RangeSel, verse: number): boolean {
  if (sel.start === null) return false;
  if (sel.end === null) return verse === sel.start;
  return verse >= sel.start && verse <= sel.end;
}

/** "John 3:16–17 · 2 verses" — or the chapter alone while nothing is complete. */
export function rangeLabel(book: string, chapter: number, sel: RangeSel): string {
  const r = selectedRange(sel);
  if (!r) return `${book} ${chapter}`;
  const n = r.end - r.start + 1;
  const verses = r.start === r.end ? `${r.start}` : `${r.start}–${r.end}`;
  return `${book} ${chapter}:${verses} · ${n} ${n === 1 ? 'verse' : 'verses'}`;
}

/** Books whose name contains the query (case-insensitive), canon order. */
export function filterBooks(query: string, books: Book[] = CANON): Book[] {
  const q = query.trim().toLowerCase();
  if (!q) return books;
  return books.filter((b) => b.name.toLowerCase().includes(q));
}
