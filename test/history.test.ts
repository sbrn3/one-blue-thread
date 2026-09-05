import { describe, expect, it } from 'vitest';
import { listHistoryPage, matchingBookIds } from '../src/knot/history';
import { migrate } from '../src/log/schema';
import { openTestDb } from './util/testDb';

const BOOKS = ['genesis', 'exodus', 'john'];

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function seedDays(db: ReturnType<typeof openTestDb>, count: number) {
  for (let i = 0; i < count; i++) {
    const date = addDays('2026-01-01', i);
    const book = BOOKS[i % BOOKS.length];
    db.run(`INSERT INTO days (local_date, sealed, book, chapter, sitting, dose) VALUES (?, 1, ?, ?, 0, 'full_chapter')`, [
      date,
      book,
      (i % 10) + 1,
    ]);
  }
}

describe('listHistoryPage (§04/§21 — searchable recorded reading history)', () => {
  it('pages through >125 sealed days with no duplicate or missing rows, strictly newest first', () => {
    const db = openTestDb();
    migrate(db);
    seedDays(db, 130);

    const seen = new Set<string>();
    let cursor: string | null | undefined;
    let hasMore = true;
    let pages = 0;

    while (hasMore) {
      const page = listHistoryPage(db, { limit: 40, cursor });
      for (const e of page.entries) {
        expect(seen.has(e.local_date)).toBe(false);
        seen.add(e.local_date);
      }
      const dates = page.entries.map((e) => e.local_date);
      expect(dates).toEqual([...dates].sort().reverse());
      hasMore = page.hasMore;
      cursor = page.nextCursor;
      pages++;
      expect(pages).toBeLessThan(20); // guards against an infinite-loop bug
    }

    expect(seen.size).toBe(130);
  });

  it('the final page reports hasMore=false and a null nextCursor', () => {
    const db = openTestDb();
    migrate(db);
    seedDays(db, 5);

    const page = listHistoryPage(db, { limit: 40 });
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
    expect(page.entries).toHaveLength(5);
  });

  it('first page + next page never overlap and together cover everything', () => {
    const db = openTestDb();
    migrate(db);
    seedDays(db, 130);

    const first = listHistoryPage(db, { limit: 100 });
    expect(first.entries).toHaveLength(100);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).not.toBeNull();

    const second = listHistoryPage(db, { limit: 100, cursor: first.nextCursor });
    expect(second.entries).toHaveLength(30);
    expect(second.hasMore).toBe(false);

    const firstDates = new Set(first.entries.map((e) => e.local_date));
    for (const e of second.entries) expect(firstDates.has(e.local_date)).toBe(false);
  });

  it('reports empty (not an error) when nothing has ever been sealed', () => {
    const db = openTestDb();
    migrate(db);
    const page = listHistoryPage(db, { limit: 40 });
    expect(page.entries).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });

  it('filters by bookIds across the full seeded history, not just the first unfiltered page', () => {
    const db = openTestDb();
    migrate(db);
    seedDays(db, 130);

    const johnIds = matchingBookIds('john');
    expect(johnIds).toContain('john');

    const page = listHistoryPage(db, { limit: 200, bookIds: johnIds });
    expect(page.entries.length).toBeGreaterThan(0);
    for (const e of page.entries) expect(e.book).toBe('john');
  });
});

describe('matchingBookIds (canonical name/id/USFM search)', () => {
  it('matches by canonical name, id, or USFM code, case-insensitively', () => {
    expect(matchingBookIds('John')).toContain('john');
    expect(matchingBookIds('genesis')).toContain('genesis');
    expect(matchingBookIds('GEN')).toContain('genesis');
  });

  it('a query matching no book returns an empty list — the caller\'s no-result state', () => {
    expect(matchingBookIds('zzz-not-a-real-book')).toEqual([]);
  });

  it('an empty query matches nothing (the caller shows the unfiltered list instead)', () => {
    expect(matchingBookIds('')).toEqual([]);
    expect(matchingBookIds('   ')).toEqual([]);
  });
});
