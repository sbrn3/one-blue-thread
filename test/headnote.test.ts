import { describe, expect, it } from 'vitest';
import { buildDump, restoreDump } from '../src/backup/dump';
import {
  MAX_HEADNOTE,
  getHeadnote,
  headnoteRange,
  headnoteReference,
  contentsFor,
  latestSeal,
  removeHeadnote,
  saveHeadnote,
  sealById,
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

describe('contents (a book read back through its headnotes)', () => {
  // Seal a chapter on a date, optionally keeping a headnote for it.
  function day(db: SqlDb, date: string, book: string, chapter: number, words?: string) {
    event(db, { type: 'seal', date, book, chapter, first: 1, last: 10 });
    if (words) saveHeadnote(db, { seal: latestSeal(db)!, text: words });
  }

  it('runs in book order, with chapters that have no headnote collapsed into bare runs', () => {
    const db = fresh();
    event(db, { type: 'book_start', date: '2026-10-01', book: 'philippians', chapter: 1 });
    day(db, '2026-10-01', 'philippians', 1, 'Both outcomes');
    day(db, '2026-10-02', 'philippians', 2);
    day(db, '2026-10-03', 'philippians', 3);
    day(db, '2026-10-04', 'philippians', 4, 'After the asking');
    const [reading] = contentsFor(db, 'philippians');
    expect(reading.startedOn).toBe('2026-10-01');
    expect(reading.rows.map((r) => (r.kind === 'bare' ? `bare ${r.from}-${r.to}` : `${r.chapter} ${r.headnote.text}`))).toEqual([
      '1 Both outcomes',
      'bare 2-3',
      '4 After the asking',
    ]);
  });

  it('a reading in progress stops at its furthest sealed chapter', () => {
    const db = fresh();
    event(db, { type: 'book_start', date: '2026-10-01', book: 'psalms', chapter: 1 });
    day(db, '2026-10-01', 'psalms', 1, 'Two ways');
    day(db, '2026-10-02', 'psalms', 2);
    const [reading] = contentsFor(db, 'psalms');
    expect(reading.finished).toBe(false);
    expect(reading.rows.at(-1)).toEqual({ kind: 'bare', from: 2, to: 2 });
  });

  it('keeps each reading apart, newest first', () => {
    const db = fresh();
    event(db, { type: 'book_start', date: '2025-03-01', book: 'jude', chapter: 1 });
    day(db, '2025-03-01', 'jude', 1, 'First time');
    event(db, { type: 'book_finish', date: '2025-03-01', book: 'jude', chapter: 1 });
    event(db, { type: 'book_start', date: '2026-10-01', book: 'jude', chapter: 1 });
    day(db, '2026-10-01', 'jude', 1, 'Second time');
    const readings = contentsFor(db, 'jude');
    expect(readings.map((r) => r.startedOn)).toEqual(['2026-10-01', '2025-03-01']);
    expect(readings[1].finished).toBe(true);
    expect(readings.map((r) => (r.rows[0].kind === 'headnote' ? r.rows[0].headnote.text : ''))).toEqual(['Second time', 'First time']);
  });

  it("a finish-day re-read of the same book keeps that day's headnote in the finished reading", () => {
    const db = fresh();
    event(db, { type: 'book_start', date: '2026-10-01', book: 'jude', chapter: 1 });
    // Sealing the last chapter logs seal, book_finish, then the next reading's book_start — same book, same date.
    event(db, { type: 'seal', date: '2026-10-01', book: 'jude', chapter: 1, first: 1, last: 25 });
    const seal = latestSeal(db)!;
    event(db, { type: 'book_finish', date: '2026-10-01', book: 'jude', chapter: 1 });
    event(db, { type: 'book_start', date: '2026-10-01', book: 'jude', chapter: 1 });
    saveHeadnote(db, { seal, text: 'Kept on the finishing day' });
    const readings = contentsFor(db, 'jude');
    expect(readings).toHaveLength(1); // the new reading has sealed nothing yet
    expect(readings[0].finished).toBe(true);
    expect(readings[0].rows).toEqual([{ kind: 'headnote', chapter: 1, headnote: getHeadnote(db, '2026-10-01') }]);
  });

  it('a merged-forward headnote covers its whole span, so nothing inside it shows as bare', () => {
    const db = fresh();
    event(db, { type: 'book_start', date: '2026-10-01', book: 'psalms', chapter: 117 });
    event(db, { type: 'seal', date: '2026-10-01', book: 'psalms', chapter: 117, first: 1, last: 2 });
    saveHeadnote(db, { seal: latestSeal(db)!, text: 'Short psalms', chapterEnd: 118 });
    const rows = contentsFor(db, 'psalms')[0].rows;
    expect(rows.filter((r) => r.kind === 'bare')).toEqual([{ kind: 'bare', from: 1, to: 116 }]);
  });

  it('a restored backup gives the same contents (event ids survive the dump)', () => {
    const db = fresh();
    event(db, { type: 'book_start', date: '2026-10-01', book: 'jude', chapter: 1 });
    day(db, '2026-10-01', 'jude', 1, 'Contend');
    const restored = fresh();
    restoreDump(restored, buildDump(db));
    expect(contentsFor(restored, 'jude')).toEqual(contentsFor(db, 'jude'));
  });
});

describe('narrowing a headnote to verses', () => {
  it('stores the single-chapter range, clears a merged span, and the contents show it', () => {
    const db = fresh();
    event(db, { type: 'book_start', date: '2026-10-01', book: 'psalms', chapter: 117 });
    event(db, { type: 'seal', date: '2026-10-01', book: 'psalms', chapter: 117, first: 1, last: 2 });
    const seal = latestSeal(db)!;
    saveHeadnote(db, { seal, text: 'Short psalms', chapterEnd: 118 });
    const h = saveHeadnote(db, { seal, text: 'Short psalms', narrowed: { chapter: 117, start: 2, end: 2 } })!;
    expect(h).toMatchObject({ chapter: 117, chapterEnd: null, verseStart: 2, verseEnd: 2 });
    const row = contentsFor(db, 'psalms')[0].rows.find((r) => r.kind === 'headnote')!;
    expect(row.kind === 'headnote' && headnoteRange(row.headnote)).toBe('117:2');
  });

  it('narrowed: null returns the headnote to the whole sealed passage', () => {
    const db = fresh();
    event(db, { type: 'seal', date: '2026-10-07', book: 'philippians', chapter: 4, first: 1, last: 23 });
    const seal = latestSeal(db)!;
    saveHeadnote(db, { seal, text: 'x', narrowed: { chapter: 4, start: 6, end: 7 } });
    const h = saveHeadnote(db, { seal, text: 'x', narrowed: null })!;
    expect([h.verseStart, h.verseEnd]).toEqual([1, 23]);
  });
});

describe('audit fixes', () => {
  it("a finish that merged forward extends the reading's contents to its last chapter", () => {
    const db = fresh();
    event(db, { type: 'book_start', date: '2026-10-01', book: 'psalms', chapter: 148 });
    event(db, { type: 'seal', date: '2026-10-01', book: 'psalms', chapter: 148, first: 1, last: 14 });
    saveHeadnote(db, { seal: latestSeal(db)!, text: 'Everything that has breath' });
    // The last day folded 149–150 in; the finish names 150.
    event(db, { type: 'book_finish', date: '2026-10-01', book: 'psalms', chapter: 150 });
    const rows = contentsFor(db, 'psalms')[0].rows;
    expect(rows.at(-1)).toEqual({ kind: 'bare', from: 149, to: 150 });
  });

  it('sealById finds the seal a past headnote followed, and nothing else', () => {
    const db = fresh();
    const id = event(db, { type: 'seal', date: '2026-10-07', book: 'philippians', chapter: 4, first: 1, last: 23 });
    const other = event(db, { type: 'book_finish', date: '2026-10-07', book: 'philippians', chapter: 4 });
    expect(sealById(db, id)).toEqual({ id, localDate: '2026-10-07', book: 'philippians', chapter: 4, verseFirst: 1, verseLast: 23 });
    expect(sealById(db, other)).toBeNull();
  });
});
