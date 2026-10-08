import { describe, expect, it } from 'vitest';
import { buildDump, restoreDump } from '../src/backup/dump';
import {
  MAX_HEADNOTE,
  getHeadnote,
  headnoteRange,
  headnoteReference,
  latestSeal,
  removeHeadnote,
  saveHeadnote,
} from '../src/headnote';
import type { SqlDb } from '../src/log/db';
import { migrate } from '../src/log/schema';
import { openTestDb } from './util/testDb';

// docs/plans/bibleproject-book-videos — headnotes: one optional line per day,
// keyed to the seal it follows, mutable, never in the event log.

function fresh(): SqlDb {
  const db = openTestDb();
  migrate(db);
  return db;
}

let ts = 1;
function event(db: SqlDb, e: { type: string; date: string; book?: string; chapter?: number; first?: number; last?: number }): number {
  db.run(
    `INSERT INTO events (ts, tz_offset, local_date, type, book, chapter, verse_first, verse_last, build_sha)
     VALUES (?, 0, ?, ?, ?, ?, ?, ?, 'test')`,
    [ts++, e.date, e.type, e.book ?? null, e.chapter ?? null, e.first ?? null, e.last ?? null],
  );
  return db.get<{ id: number }>('SELECT max(id) AS id FROM events')!.id;
}

const clock = (start = 1000) => {
  let t = start;
  return () => t++;
};

describe('latestSeal', () => {
  it('is null before any seal', () => {
    const db = fresh();
    event(db, { type: 'app_open', date: '2026-10-07' });
    expect(latestSeal(db)).toBeNull();
  });

  it("picks the newest seal and carries that event's own date and passage", () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-06', book: 'philippians', chapter: 3, first: 1, last: 21 });
    const id = event(db, { type: 'seal', date: '2026-10-07', book: 'philippians', chapter: 4, first: 1, last: 23 });
    event(db, { type: 'book_finish', date: '2026-10-07', book: 'philippians', chapter: 4 });
    expect(latestSeal(db)).toEqual({ id, localDate: '2026-10-07', book: 'philippians', chapter: 4, verseFirst: 1, verseLast: 23 });
  });

  it('keeps a null range for an older seal without one', () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-01-01', book: 'jude', chapter: 1 });
    expect(latestSeal(db)).toMatchObject({ verseFirst: null, verseLast: null });
  });
});

describe('saving a headnote', () => {
  it('round-trips, about the sealed passage by default', () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-07', book: 'philippians', chapter: 4, first: 1, last: 23 });
    const seal = latestSeal(db)!;
    const h = saveHeadnote(db, { seal, text: '  The peace comes after the asking.  ' }, clock())!;
    expect(h).toMatchObject({ localDate: '2026-10-07', sealEventId: seal.id, book: 'philippians', chapter: 4, chapterEnd: null, verseStart: 1, verseEnd: 23, text: 'The peace comes after the asking.' });
    expect(getHeadnote(db, '2026-10-07')).toEqual(h);
    expect(headnoteReference(h)).toBe('Philippians 4:1–23');
  });

  it('keeps one per day: saving again replaces the words, keeps created_at, bumps updated_at', () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-07', book: 'philippians', chapter: 4, first: 1, last: 23 });
    const seal = latestSeal(db)!;
    const now = clock();
    const first = saveHeadnote(db, { seal, text: 'First' }, now)!;
    const second = saveHeadnote(db, { seal, text: 'Second' }, now)!;
    expect(db.all('SELECT * FROM headnotes')).toHaveLength(1);
    expect(second.text).toBe('Second');
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).toBeGreaterThan(first.updatedAt);
  });

  it('saving blank removes it; remove removes it', () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-07', book: 'jude', chapter: 1, first: 1, last: 25 });
    const seal = latestSeal(db)!;
    saveHeadnote(db, { seal, text: 'Keep yourselves' });
    expect(saveHeadnote(db, { seal, text: '   ' })).toBeNull();
    expect(getHeadnote(db, '2026-10-07')).toBeNull();
    saveHeadnote(db, { seal, text: 'Again' });
    removeHeadnote(db, '2026-10-07');
    expect(getHeadnote(db, '2026-10-07')).toBeNull();
  });

  it(`caps the words at ${MAX_HEADNOTE} characters`, () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-07', book: 'jude', chapter: 1 });
    const h = saveHeadnote(db, { seal: latestSeal(db)!, text: 'x'.repeat(MAX_HEADNOTE + 50) })!;
    expect(h.text).toHaveLength(MAX_HEADNOTE);
  });

  it('a seal without a verse range makes a headnote about the whole chapter', () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-07', book: 'jude', chapter: 1 });
    const h = saveHeadnote(db, { seal: latestSeal(db)!, text: 'Contend' })!;
    expect(h.verseStart).toBeNull();
    expect(headnoteRange(h)).toBe('1');
  });

  it('records a merged-forward span when the sealing session knows it, and ignores one that is not a span', () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-07', book: 'psalms', chapter: 117, first: 1, last: 2 });
    const seal = latestSeal(db)!;
    expect(saveHeadnote(db, { seal, text: 'Short', chapterEnd: 118 })!.chapterEnd).toBe(118);
    expect(headnoteRange(getHeadnote(db, '2026-10-07')!)).toBe('117–118');
    removeHeadnote(db, '2026-10-07');
    expect(saveHeadnote(db, { seal, text: 'One', chapterEnd: 117 })!.chapterEnd).toBeNull();
  });

  it("editing only the words keeps the headnote's passage", () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-07', book: 'philippians', chapter: 4, first: 1, last: 23 });
    const seal = latestSeal(db)!;
    saveHeadnote(db, { seal, text: 'Narrow', narrowed: { chapter: 4, start: 6, end: 7 } });
    const edited = saveHeadnote(db, { seal, text: 'Edited' })!;
    expect([edited.verseStart, edited.verseEnd]).toEqual([6, 7]);
  });

  it('survives a backup and restore', () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-07', book: 'jude', chapter: 1, first: 1, last: 25 });
    const h = saveHeadnote(db, { seal: latestSeal(db)!, text: 'Keep yourselves in the love of God' })!;
    const restored = fresh();
    restoreDump(restored, buildDump(db));
    expect(getHeadnote(restored, '2026-10-07')).toEqual(h);
  });

  it('a backup made before headnotes existed restores to none', () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-07', book: 'jude', chapter: 1 });
    saveHeadnote(db, { seal: latestSeal(db)!, text: 'Current' });
    const old = buildDump(fresh());
    delete old.tables.headnotes;
    restoreDump(db, old);
    expect(db.all('SELECT * FROM headnotes')).toHaveLength(0);
  });
});
