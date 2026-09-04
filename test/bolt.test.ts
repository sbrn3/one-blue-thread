import { beforeEach, describe, expect, it } from 'vitest';
import { deriveBolt } from '../src/flow/bolt';
import type { SqlDb } from '../src/log/db';
import { Log, meta } from '../src/log/log';
import { migrate } from '../src/log/schema';
import { openTestDb } from './util/testDb';

// deriveBolt is the seam between the log and the weave zone. It carries two
// things that are easy to get wrong and impossible to see without a device:
// the `days` table is derived and SPARSE, and the session store is stale on a
// book-finish day.

let db: SqlDb;
let log: Log;

function sealDay(date: string, book = 'john'): void {
  db.run(
    `INSERT INTO days (local_date, sealed, book, chapter, sitting, dose)
     VALUES (?, 1, ?, 1, 0, 'full')`,
    [date, book],
  );
}

/** A row that exists but was not sealed — distinct from no row at all. */
function unsealedDay(date: string, book = 'john'): void {
  db.run(
    `INSERT INTO days (local_date, sealed, book, chapter, sitting, dose)
     VALUES (?, 0, ?, 1, 0, 'full')`,
    [date, book],
  );
}

beforeEach(() => {
  db = openTestDb();
  migrate(db);
  log = new Log({ db, buildSha: 'test' });
  meta.set(db, 'current_book', 'john');
});

describe('deriveBolt', () => {
  it('spans every calendar day from the book start to today, inclusive', () => {
    meta.set(db, 'book_started_local_date', '2026-07-01');
    const bolt = deriveBolt(db, log, '2026-07-05');
    expect(bolt.sealed).toHaveLength(5);
  });

  it('marks the days that were sealed and only those', () => {
    meta.set(db, 'book_started_local_date', '2026-07-01');
    sealDay('2026-07-01');
    sealDay('2026-07-03');
    expect(deriveBolt(db, log, '2026-07-04').sealed).toEqual([true, false, true, false]);
  });

  it('treats a day with no row at all as a gap', () => {
    // `days` is derived from events, so a day with no activity has no row.
    meta.set(db, 'book_started_local_date', '2026-07-01');
    sealDay('2026-07-01');
    sealDay('2026-07-04');
    const bolt = deriveBolt(db, log, '2026-07-04');
    expect(bolt.sealed).toEqual([true, false, false, true]);
  });

  it('treats an unsealed row and an absent row the same way', () => {
    meta.set(db, 'book_started_local_date', '2026-07-01');
    sealDay('2026-07-01');
    unsealedDay('2026-07-02'); // row exists, sealed = 0
    // 2026-07-03 has no row at all
    sealDay('2026-07-04');
    expect(deriveBolt(db, log, '2026-07-04').sealed).toEqual([true, false, false, true]);
  });

  it('reads the book from meta, not from a cached store', () => {
    meta.set(db, 'book_started_local_date', '2026-07-01');
    meta.set(db, 'current_book', 'ruth');
    expect(deriveBolt(db, log, '2026-07-02').book).toBe('ruth');
  });

  it('gives a one-row bolt for the day a new book starts', () => {
    // session.seal() writes book_started_local_date = today when a book is
    // finished but does not refresh session.book / session.daysInBook in the
    // same commit. Deriving from meta is what keeps this correct.
    meta.set(db, 'book_started_local_date', '2026-07-09');
    meta.set(db, 'current_book', 'ruth');
    const bolt = deriveBolt(db, log, '2026-07-09');
    expect(bolt.book).toBe('ruth');
    expect(bolt.sealed).toEqual([false]);
  });

  it('never returns an empty bolt, even with no meta at all', () => {
    const fresh = openTestDb();
    migrate(fresh);
    const bolt = deriveBolt(fresh, new Log({ db: fresh, buildSha: 'test' }), '2026-07-09');
    expect(bolt.sealed).toHaveLength(1);
    expect(bolt.book).toBe('');
  });

  it('ignores days before the book started', () => {
    sealDay('2026-06-28');
    meta.set(db, 'book_started_local_date', '2026-07-01');
    sealDay('2026-07-01');
    expect(deriveBolt(db, log, '2026-07-02').sealed).toEqual([true, false]);
  });
});
