import { describe, expect, it } from 'vitest';
import { resolveTodaysProbe } from '../src/lab/probe';
import { weightedPick } from '../src/lab/mrt';
import { migrate } from '../src/log/schema';
import { openTestDb } from './util/testDb';

function seed(first: number | null, last: number | null) {
  const db = openTestDb();
  migrate(db);
  db.run(
    `INSERT INTO days (local_date, sealed, dose, book, chapter, verses_read, first_verse, last_verse)
     VALUES ('2026-07-13', 1, 'full_chapter', 'john', 3, 36, ?, ?)`,
    [first, last],
  );
  return db;
}

const mark = (db: ReturnType<typeof openTestDb>, start: number, end: number, at: number) =>
  db.run(
    `INSERT INTO passages (book, chapter, verse_start, verse_end, marked_at) VALUES ('john', 3, ?, ?, ?)`,
    [start, end, at],
  );

describe('resolveTodaysProbe — the span (recall-cloze-ladder)', () => {
  it('asks about at most 3 verses, inside the verses actually read', () => {
    for (const d of ['2026-07-14', '2026-07-20', '2026-08-01']) {
      const db = seed(18, 36);
      db.run(`UPDATE days SET local_date = date(?, '-1 day')`, [d]);
      const p = resolveTodaysProbe(db, d, 'fixed-seed', 1)!;
      expect(p.verseStart).toBeGreaterThanOrEqual(18);
      expect(p.verseEnd).toBeLessThanOrEqual(36);
      expect(p.verseEnd - p.verseStart).toBeLessThanOrEqual(2);
    }
  });

  it('is deterministic for the same seed and date', () => {
    const a = resolveTodaysProbe(seed(1, 36), '2026-07-14', 'fixed-seed', 1);
    const b = resolveTodaysProbe(seed(1, 36), '2026-07-14', 'fixed-seed', 1);
    expect(a).toEqual(b);
  });

  it('ignores marks: a marked verse in the read range does not change the span', () => {
    const plain = resolveTodaysProbe(seed(1, 36), '2026-07-14', 'fixed-seed', 1);
    const db = seed(1, 36);
    mark(db, 16, 16, 100);
    mark(db, 5, 14, 1);
    expect(resolveTodaysProbe(db, '2026-07-14', 'fixed-seed', 1)).toEqual(plain);
    expect(db.get('SELECT marked FROM probes')).toEqual({ marked: 0 });
  });

  it('a range shorter than 3 verses clamps to its length', () => {
    expect(resolveTodaysProbe(seed(8, 9), '2026-07-14', 'fixed-seed', 1)).toMatchObject({ verseStart: 8, verseEnd: 9 });
    expect(resolveTodaysProbe(seed(8, 8), '2026-07-14', 'fixed-seed', 1)).toMatchObject({ verseStart: 8, verseEnd: 8 });
  });

  it('a legacy day with no recorded range: arm still rolled, one row, nothing fired', () => {
    const db = seed(null, null);
    expect(resolveTodaysProbe(db, '2026-07-14', 'fixed-seed', 1)).toBeNull();
    expect(db.all('SELECT fired, verse_start FROM probes')).toEqual([{ fired: 0, verse_start: null }]);
  });

  it('a pre-upgrade fired row with no span returns null', () => {
    const db = seed(1, 36);
    db.run(`INSERT INTO probes (local_date, fired, book, chapter, verses_read) VALUES ('2026-07-14', 1, 'john', 3, 36)`);
    expect(resolveTodaysProbe(db, '2026-07-14', 'fixed-seed', 1)).toBeNull();
  });

  it('arm assignment is unchanged by the span work (golden)', () => {
    const days = ['2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19'];
    const arms = days.map((d) => weightedPick('fixed-seed', `E9:${d}`, { fire: 0.6, skip: 0.4 }));
    expect(arms.join(',')).toBe('fire,fire,skip,fire,fire,fire');
    const fired = days.map((d) => {
      const db = seed(1, 36);
      db.run(`UPDATE days SET local_date = date(?, '-1 day')`, [d]);
      return resolveTodaysProbe(db, d, 'fixed-seed') !== null ? 'fire' : 'skip';
    });
    expect(fired).toEqual(arms);
  });
});
