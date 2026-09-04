import type { Log } from '../log/log';
import { meta } from '../log/log';
import { addDays, daysBetweenInclusive } from '../log/time';
import type { SqlDb } from '../log/db';

export interface Bolt {
  /** The book being woven — read from meta, never from a cached store. */
  book: string;
  /** One entry per calendar day since the book started; true = a day read. */
  sealed: boolean[];
}

/**
 * The current book as a bolt of cloth.
 *
 * Shared by the flow and the knot, which both used to derive a calendar month
 * the same way and are now the two callers of WeaveZone.
 *
 * Both `book` and the row count come from `meta`/the log rather than from the
 * session store. `session.seal()` writes `book_started_local_date = today` when
 * a book is finished but does not update `session.book` or `session.daysInBook`
 * in the same commit, so reading either from the store on a book-finish day
 * renders a bolt of the previous book's length labelled with the previous book.
 *
 * `days` is derived and sparse — a day with no activity at all has no row — so
 * membership is tested against dates generated from the calendar, not against
 * the rows that came back. An absent row and a `sealed = 0` row both fall
 * through to `false`, which is exactly the gap that should be shown.
 */
export function deriveBolt(db: SqlDb, log: Log, today: string): Bolt {
  const book = meta.get(db, 'current_book') ?? '';
  const bookStart = meta.get(db, 'book_started_local_date') ?? today;
  const rows = Math.max(1, daysBetweenInclusive(bookStart, today));
  const sealedDates = new Set(
    log
      .daysBetween(bookStart, today)
      .filter((d) => d.sealed === 1)
      .map((d) => d.local_date),
  );
  return {
    book,
    sealed: Array.from({ length: rows }, (_, i) => sealedDates.has(addDays(bookStart, i))),
  };
}
