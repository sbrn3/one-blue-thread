import type { SqlDb } from '../log/db';
import { CANON } from '../text/canon';

export interface HistoryEntry {
  local_date: string;
  book: string;
  chapter: number;
  sitting: number | null;
}

export interface HistoryPage {
  entries: HistoryEntry[];
  hasMore: boolean;
  /** Pass back as `cursor` to fetch the next page. Null once hasMore is false. */
  nextCursor: string | null;
}

export interface ListHistoryPageOptions {
  limit: number;
  /** local_date to page strictly before (exclusive). Omit for the first page. */
  cursor?: string | null;
  /** Restricts to these book ids — see matchingBookIds(). Omit/empty for every book. */
  bookIds?: string[];
}

/**
 * §04/§21 — a day stores its STARTING portion, and merge-forward days (§21.2)
 * can fold several short chapters into one sitting or repeat a chapter
 * across sittings. This intentionally never claims "every chapter read on
 * this day" — it only reports what the day row actually recorded.
 */
export function listHistoryPage(db: SqlDb, opts: ListHistoryPageOptions): HistoryPage {
  const conditions = ['sealed = 1', 'book IS NOT NULL'];
  const params: Array<string | number> = [];

  if (opts.cursor) {
    conditions.push('local_date < ?');
    params.push(opts.cursor);
  }
  if (opts.bookIds && opts.bookIds.length > 0) {
    conditions.push(`book IN (${opts.bookIds.map(() => '?').join(',')})`);
    params.push(...opts.bookIds);
  }

  // local_date is the primary key and ISO-formatted ('YYYY-MM-DD'), so a
  // lexicographic ORDER BY/cursor comparison is exactly chronological —
  // deterministic and stable across pages even if new days are sealed
  // between page fetches (they sort after the cursor already handed out).
  const rows = db.all<HistoryEntry>(
    `SELECT local_date, book, chapter, sitting FROM days WHERE ${conditions.join(' AND ')} ORDER BY local_date DESC LIMIT ?`,
    [...params, opts.limit + 1],
  );

  const hasMore = rows.length > opts.limit;
  const entries = hasMore ? rows.slice(0, opts.limit) : rows;
  const nextCursor = entries.length > 0 ? entries[entries.length - 1].local_date : null;

  return { entries, hasMore, nextCursor: hasMore ? nextCursor : null };
}

/**
 * Canonical book name/id/USFM-code search — "Jn", "john", and "JHN" all
 * match John. No fuzzy matching: a reader typing a book name expects exact
 * substring behavior, not surprise results from an edit-distance guess.
 */
export function matchingBookIds(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CANON.filter(
    (b) => b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || b.usfm.toLowerCase().includes(q),
  ).map((b) => b.id);
}
