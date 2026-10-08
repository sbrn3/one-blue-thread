import type { SqlDb } from '../log/db';
import { bookName } from '../text/canon';

// Headnotes (docs/plans/bibleproject-book-videos; docs/CONTEXT.md "Your
// words"): one optional line per day, in the reader's own words, about the
// passage they sealed. Mutable on purpose — these are the reader's words, not
// evidence — so they live in their own table, never in `events`, and nothing
// about them is logged. /src/lab never imports this module
// (test/boundaries.test.ts).

/** Longest headnote kept. The field enforces it too; this is the backstop. */
export const MAX_HEADNOTE = 280;

/** The seal a headnote follows: the passage it is about, by default. */
export interface SealRef {
  /** events.id of the seal — orders headnotes and groups them into readings. */
  id: number;
  /** The seal's own local_date (4 AM boundary), never a screen's mount-time "today". */
  localDate: string;
  book: string;
  chapter: number;
  /** First/last verse of the starting chapter actually read; null for an older seal without the range. */
  verseFirst: number | null;
  verseLast: number | null;
}

export interface Headnote {
  localDate: string;
  sealEventId: number;
  book: string;
  chapter: number;
  /** Last chapter when a merge-forward day spanned several; null for one chapter. */
  chapterEnd: number | null;
  /** Null means the whole of `chapter` (and through `chapterEnd`). */
  verseStart: number | null;
  verseEnd: number | null;
  text: string;
  createdAt: number;
  updatedAt: number;
}

interface HeadnoteRow {
  local_date: string;
  seal_event_id: number;
  book: string;
  chapter: number;
  chapter_end: number | null;
  verse_start: number | null;
  verse_end: number | null;
  text: string;
  created_at: number;
  updated_at: number;
}

function fromRow(r: HeadnoteRow): Headnote {
  return {
    localDate: r.local_date,
    sealEventId: r.seal_event_id,
    book: r.book,
    chapter: r.chapter,
    chapterEnd: r.chapter_end,
    verseStart: r.verse_start,
    verseEnd: r.verse_end,
    text: r.text,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * The most recent seal, read from the event log. The passage comes from the
 * seal event itself, not from `days`: a day's row records its first reading,
 * which after a mid-day book exit can be a book that was never sealed.
 */
export function latestSeal(db: SqlDb): SealRef | null {
  const r = db.get<{ id: number; local_date: string; book: string | null; chapter: number | null; verse_first: number | null; verse_last: number | null }>(
    `SELECT id, local_date, book, chapter, verse_first, verse_last FROM events WHERE type = 'seal' ORDER BY id DESC LIMIT 1`,
  );
  if (!r || !r.book || r.chapter == null) return null;
  return { id: r.id, localDate: r.local_date, book: r.book, chapter: r.chapter, verseFirst: r.verse_first, verseLast: r.verse_last };
}

/** A seal by its events id — the passage a past headnote was written after. */
export function sealById(db: SqlDb, id: number): SealRef | null {
  const r = db.get<{ id: number; local_date: string; book: string | null; chapter: number | null; verse_first: number | null; verse_last: number | null }>(
    `SELECT id, local_date, book, chapter, verse_first, verse_last FROM events WHERE id = ? AND type = 'seal'`,
    [id],
  );
  if (!r || !r.book || r.chapter == null) return null;
  return { id: r.id, localDate: r.local_date, book: r.book, chapter: r.chapter, verseFirst: r.verse_first, verseLast: r.verse_last };
}

export function getHeadnote(db: SqlDb, localDate: string): Headnote | null {
  const r = db.get<HeadnoteRow>(`SELECT * FROM headnotes WHERE local_date = ?`, [localDate]);
  return r ? fromRow(r) : null;
}

export interface SaveHeadnoteInput {
  seal: SealRef;
  text: string;
  /** The session's last merged chapter, when known (only in the sealing session). */
  chapterEnd?: number | null;
  /** A narrowed single-chapter range (docs/plans exec S05); omitted keeps the seal's range. */
  narrowed?: { chapter: number; start: number; end: number } | null;
}

/**
 * Keeps one headnote for the seal's day — inserts or replaces it. Text is
 * trimmed and capped; blank text removes the headnote instead. Returns what
 * is now stored (null after a blank save).
 */
export function saveHeadnote(db: SqlDb, input: SaveHeadnoteInput, now: () => number = Date.now): Headnote | null {
  const text = input.text.trim().slice(0, MAX_HEADNOTE);
  const { seal } = input;
  if (text.length === 0) {
    removeHeadnote(db, seal.localDate);
    return null;
  }
  const existing = getHeadnote(db, seal.localDate);
  const passage = passageFor(seal, input, existing);
  const at = now();
  db.run(
    `INSERT INTO headnotes
       (local_date, seal_event_id, book, chapter, chapter_end, verse_start, verse_end, text, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(local_date) DO UPDATE SET
       seal_event_id = excluded.seal_event_id,
       book = excluded.book,
       chapter = excluded.chapter,
       chapter_end = excluded.chapter_end,
       verse_start = excluded.verse_start,
       verse_end = excluded.verse_end,
       text = excluded.text,
       updated_at = excluded.updated_at`,
    [seal.localDate, seal.id, seal.book, passage.chapter, passage.chapterEnd, passage.verseStart, passage.verseEnd, text, existing?.createdAt ?? at, at],
  );
  return getHeadnote(db, seal.localDate);
}

type Passage = Pick<Headnote, 'chapter' | 'chapterEnd' | 'verseStart' | 'verseEnd'>;

/**
 * Which verses the headnote is about:
 * - narrowed → exactly that single-chapter range;
 * - narrowed: null → back to the whole sealed passage;
 * - omitted → an existing headnote keeps its passage (an edit of the words
 *   only); a new one takes the sealed passage.
 */
function passageFor(seal: SealRef, input: SaveHeadnoteInput, existing: Headnote | null): Passage {
  if (input.narrowed) return { chapter: input.narrowed.chapter, chapterEnd: null, verseStart: input.narrowed.start, verseEnd: input.narrowed.end };
  if (input.narrowed === undefined && existing) {
    const { chapter, chapterEnd, verseStart, verseEnd } = existing;
    return { chapter, chapterEnd, verseStart, verseEnd };
  }
  const end = input.chapterEnd ?? null;
  return {
    chapter: seal.chapter,
    chapterEnd: end != null && end > seal.chapter ? end : null,
    verseStart: seal.verseFirst,
    verseEnd: seal.verseLast,
  };
}

export function removeHeadnote(db: SqlDb, localDate: string): void {
  db.run(`DELETE FROM headnotes WHERE local_date = ?`, [localDate]);
}

/** "4:6–7", "4" (whole chapter) or "4–5" (merge-forward), without the book. */
export function headnoteRange(h: Pick<Headnote, 'chapter' | 'chapterEnd' | 'verseStart' | 'verseEnd'>): string {
  if (h.chapterEnd != null && h.chapterEnd > h.chapter) return `${h.chapter}–${h.chapterEnd}`;
  if (h.verseStart == null || h.verseEnd == null) return `${h.chapter}`;
  return h.verseStart === h.verseEnd ? `${h.chapter}:${h.verseStart}` : `${h.chapter}:${h.verseStart}–${h.verseEnd}`;
}

/** "Philippians 4:6–7" — the headnote's passage, with its book. */
export function headnoteReference(h: Pick<Headnote, 'book' | 'chapter' | 'chapterEnd' | 'verseStart' | 'verseEnd'>): string {
  return `${bookName(h.book)} ${headnoteRange(h)}`;
}

// ---- Contents: a book's headnotes read back as its contents page ----

/** One row of a contents page, in the book's own chapter order. */
export type ContentsRow =
  | { kind: 'headnote'; chapter: number; headnote: Headnote }
  /** A run of chapters with no headnote, collapsed into one row ("3–17"). */
  | { kind: 'bare'; from: number; to: number };

/** One reading of a book: from a book_start to the next start of the same book. */
export interface Reading {
  /** local_date of the book_start that began it; for headnotes older than any start, their first date. */
  startedOn: string;
  /** True once the reading reached a book_finish. */
  finished: boolean;
  rows: ContentsRow[];
  /** False when the reading has no headnotes at all. */
  hasHeadnotes: boolean;
}

interface MarkerRow {
  id: number;
  local_date: string;
  type: string;
  chapter: number | null;
}

/**
 * Every reading of `book`, newest first, each as its contents. A headnote
 * belongs to the latest `book_start` of its book whose events id is below its
 * seal's id — not to a date, because the day a book is finished also logs the
 * next reading's start, which may be the same book again. Rows run from
 * chapter 1 to the furthest chapter sealed in that reading; chapters with no
 * headnote collapse into bare runs. Readings with nothing sealed are omitted.
 */
export function contentsFor(db: SqlDb, book: string): Reading[] {
  const markers = db.all<MarkerRow>(
    `SELECT id, local_date, type, chapter FROM events
      WHERE book = ? AND type IN ('book_start', 'book_finish', 'seal')
      ORDER BY id`,
    [book],
  );
  const notes = db
    .all<HeadnoteRow>(`SELECT * FROM headnotes WHERE book = ? ORDER BY seal_event_id, local_date`, [book])
    .map(fromRow);

  interface Draft {
    startId: number;
    startedOn: string | null;
    finished: boolean;
    furthest: number;
    notes: Headnote[];
  }
  // A leading draft collects anything older than the first recorded start.
  const drafts: Draft[] = [{ startId: -Infinity, startedOn: null, finished: false, furthest: 0, notes: [] }];
  for (const m of markers) {
    const current = drafts[drafts.length - 1];
    if (m.type === 'book_start') drafts.push({ startId: m.id, startedOn: m.local_date, finished: false, furthest: 0, notes: [] });
    else if (m.type === 'book_finish') {
      // The finish names the last chapter the final day merged forward to.
      current.finished = true;
      if (m.chapter != null) current.furthest = Math.max(current.furthest, m.chapter);
    }
    else if (m.chapter != null) current.furthest = Math.max(current.furthest, m.chapter);
  }
  for (const n of notes) {
    let owner = drafts[0];
    for (const d of drafts) if (d.startId < n.sealEventId) owner = d;
    owner.notes.push(n);
    owner.furthest = Math.max(owner.furthest, n.chapterEnd ?? n.chapter);
  }

  return drafts
    .filter((d) => d.furthest > 0)
    .map((d) => ({
      startedOn: d.startedOn ?? d.notes[0]?.localDate ?? '',
      finished: d.finished,
      rows: rowsFor(d.furthest, d.notes),
      hasHeadnotes: d.notes.length > 0,
    }))
    .reverse();
}

function rowsFor(furthest: number, notes: Headnote[]): ContentsRow[] {
  const byChapter = new Map<number, Headnote[]>();
  const covered = new Set<number>();
  for (const n of notes) {
    byChapter.set(n.chapter, [...(byChapter.get(n.chapter) ?? []), n]);
    for (let c = n.chapter; c <= (n.chapterEnd ?? n.chapter); c++) covered.add(c);
  }
  const rows: ContentsRow[] = [];
  let bareFrom: number | null = null;
  const closeBare = (to: number) => {
    if (bareFrom !== null) rows.push({ kind: 'bare', from: bareFrom, to });
    bareFrom = null;
  };
  for (let c = 1; c <= furthest; c++) {
    const here = byChapter.get(c);
    if (here) {
      closeBare(c - 1);
      for (const h of here) rows.push({ kind: 'headnote', chapter: c, headnote: h });
    } else if (!covered.has(c)) {
      if (bareFrom === null) bareFrom = c;
    }
  }
  closeBare(furthest);
  return rows;
}
