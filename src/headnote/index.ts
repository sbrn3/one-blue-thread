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
