import type { SqlDb } from '../log/db';
import { meta } from '../log/log';
import type { Log } from '../log/log';
import { logicalDate } from '../log/time';
import type { Grade, Passage } from '../log/types';
import { DAILY_RECALL_CAP, MAX_RECALL_CAP, reschedule } from './leitner';
import { effectiveRung, nextRung } from './ladder';

/** The outcome of anything that makes or changes a learned passage; refusals are shown, never thrown. */
export type PassageResult =
  | { ok: true; id: number }
  | { ok: false; reason: 'duplicate' | 'invalid' | 'missing' };

export interface PassageRef {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number; // a RANGE — meaning rarely stops at a verse (§21)
}

// §13.3 /src/memory contract. HARD RULE (§13.6): this module imports
// nothing from /src/lab or the seal/dose stores — a recall grade
// cannot, by construction, affect the reading habit.
export class Memory {
  constructor(
    private readonly db: SqlDb,
    private readonly log: Log,
  ) {}

  /** A tap while reading. No text is stored — only the reference. */
  markCandidate(r: PassageRef, now: () => number = Date.now): void {
    const existing = this.db.get<{ id:number }>(
      `SELECT id FROM passages WHERE book = ? AND chapter = ? AND verse_start = ? AND verse_end = ? AND promoted_at IS NULL`,
      [r.book, r.chapter, r.verseStart, r.verseEnd],
    );
    if (existing) return;
    this.db.run(
      `INSERT INTO passages (book, chapter, verse_start, verse_end, marked_at, box)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [r.book, r.chapter, r.verseStart, r.verseEnd, now()],
    );
    this.log.write({ type: 'candidate_marked', book: r.book, chapter: r.chapter });
  }

  /**
   * Retracts a tap — the reader marked a verse, then changed their
   * mind before it ever became a real commitment. Only ever removes
   * an unpromoted candidate; a promoted passage represents a real
   * decision made at book-end and is never touched here.
   */
  unmarkCandidate(r: PassageRef): void {
    this.db.run(
      `DELETE FROM passages
         WHERE book = ? AND chapter = ? AND verse_start = ? AND verse_end = ? AND promoted_at IS NULL`,
      [r.book, r.chapter, r.verseStart, r.verseEnd],
    );
  }

  candidates(book: string): Passage[] {
    return this.db.all<Passage>(
      'SELECT * FROM passages WHERE book = ? AND promoted_at IS NULL ORDER BY marked_at DESC',
      [book],
    );
  }

  /** Removes exactly one unpromoted candidate, including in databases that predate de-duplication. */
  unmarkCandidateById(id: number): void {
    this.db.run('DELETE FROM passages WHERE id = ? AND promoted_at IS NULL', [id]);
  }

  candidatesForChapter(book: string, chapter: number): Passage[] {
    return this.db.all<Passage>(
      'SELECT * FROM passages WHERE book = ? AND chapter = ? AND promoted_at IS NULL ORDER BY verse_start, verse_end, marked_at',
      [book, chapter],
    );
  }

  /**
   * A mark becomes a memory passage — from the library's "Learn this" or the
   * book end. Any number per book (docs/plans/recall-settings drops §21's
   * one-per-book rule); refused only if the row is gone or that exact range
   * is already being learned.
   */
  promote(id: number, today: string, now: () => number = Date.now): PassageResult {
    const row = this.db.get<Passage>('SELECT * FROM passages WHERE id = ?', [id]);
    if (!row) return { ok: false, reason: 'missing' };
    if (row.promoted_at !== null) return { ok: true, id };
    if (this.isLearned(row, id)) return { ok: false, reason: 'duplicate' };

    this.db.run('UPDATE passages SET promoted_at = ?, due_date = ? WHERE id = ?', [now(), today, id]);
    this.log.write({ type: 'passage_promoted', book: row.book, chapter: row.chapter });
    return { ok: true, id };
  }

  /** Every learned passage, soonest due first. */
  learned(): Passage[] {
    return this.db.all<Passage>(
      'SELECT * FROM passages WHERE promoted_at IS NOT NULL ORDER BY due_date, book, chapter, verse_start, id',
    );
  }

  /** Verses marked while reading and not yet learned, newest first. */
  marked(): Passage[] {
    return this.db.all<Passage>(
      'SELECT * FROM passages WHERE promoted_at IS NULL AND source IS NULL ORDER BY marked_at DESC, id DESC',
    );
  }

  /** The memory library's picker: learn any passage, read today or not. Not an E4 mark. */
  add(r: PassageRef, today: string, now: () => number = Date.now): PassageResult {
    if (!validRange(r.verseStart, r.verseEnd)) return { ok: false, reason: 'invalid' };
    if (this.isLearned({ book: r.book, chapter: r.chapter, verse_start: r.verseStart, verse_end: r.verseEnd }, null)) {
      return { ok: false, reason: 'duplicate' };
    }
    const t = now();
    this.db.run(
      `INSERT INTO passages (book, chapter, verse_start, verse_end, marked_at, promoted_at, box, due_date, source)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'added')`,
      [r.book, r.chapter, r.verseStart, r.verseEnd, t, t, today],
    );
    const id = this.db.get<{ id: number }>('SELECT last_insert_rowid() AS id')?.id ?? 0;
    this.log.write({ type: 'passage_added', book: r.book, chapter: r.chapter });
    return { ok: true, id };
  }

  /**
   * Fix a range picked too short or too long. A learned passage keeps its
   * schedule; its cloze ladder steps back one so the new words get stubs.
   */
  editRange(id: number, verseStart: number, verseEnd: number): PassageResult {
    const row = this.db.get<Passage>('SELECT * FROM passages WHERE id = ?', [id]);
    if (!row) return { ok: false, reason: 'missing' };
    if (!validRange(verseStart, verseEnd)) return { ok: false, reason: 'invalid' };
    if (verseStart === row.verse_start && verseEnd === row.verse_end) return { ok: true, id };
    const next = { book: row.book, chapter: row.chapter, verse_start: verseStart, verse_end: verseEnd };
    if (row.promoted_at !== null && this.isLearned(next, id)) return { ok: false, reason: 'duplicate' };

    if (row.promoted_at !== null) {
      const rung = Math.max(1, effectiveRung(row.rung, row.box) - 1);
      this.db.run('UPDATE passages SET verse_start = ?, verse_end = ?, rung = ? WHERE id = ?', [verseStart, verseEnd, rung, id]);
    } else {
      this.db.run('UPDATE passages SET verse_start = ?, verse_end = ? WHERE id = ?', [verseStart, verseEnd, id]);
    }
    this.log.write({ type: 'passage_edited', book: row.book, chapter: row.chapter });
    return { ok: true, id };
  }

  /**
   * "Learn this" from the library: set a mark's range and learn it in one
   * step. Checked first and applied in one transaction, so a refusal never
   * leaves a half-edited mark or a stray passage_edited event.
   */
  learnRange(id: number, verseStart: number, verseEnd: number, today: string, now: () => number = Date.now): PassageResult {
    const row = this.db.get<Passage>('SELECT * FROM passages WHERE id = ?', [id]);
    if (!row) return { ok: false, reason: 'missing' };
    if (!validRange(verseStart, verseEnd)) return { ok: false, reason: 'invalid' };
    if (row.promoted_at !== null) return this.editRange(id, verseStart, verseEnd);
    const next = { book: row.book, chapter: row.chapter, verse_start: verseStart, verse_end: verseEnd };
    if (this.isLearned(next, id)) return { ok: false, reason: 'duplicate' };
    let result: PassageResult = { ok: false, reason: 'missing' };
    this.db.tx(() => {
      const edited = this.editRange(id, verseStart, verseEnd);
      result = edited.ok ? this.promote(id, today, now) : edited;
    });
    return result;
  }

  /** Start over: box 1, rung 1, due today. */
  reset(id: number, today: string): void {
    const row = this.db.get<Passage>('SELECT * FROM passages WHERE id = ?', [id]);
    if (!row) return;
    this.db.run(
      'UPDATE passages SET box = 1, rung = 1, due_date = ?, last_grade = NULL, held_since = NULL WHERE id = ?',
      [today, id],
    );
    this.log.write({ type: 'passage_reset', book: row.book, chapter: row.chapter });
  }

  /** Delete a passage (learned or marked). The event keeps the record. */
  remove(id: number): void {
    const row = this.db.get<Passage>('SELECT * FROM passages WHERE id = ?', [id]);
    if (!row) return;
    this.db.run('DELETE FROM passages WHERE id = ?', [id]);
    this.log.write({ type: 'passage_deleted', book: row.book, chapter: row.chapter });
  }

  /** How many due passages the reading screen shows each day. */
  recallCap(): number {
    const raw = Number(meta.get(this.db, 'recall_cap'));
    return Number.isFinite(raw) && raw > 0 ? clampCap(raw) : DAILY_RECALL_CAP;
  }

  setRecallCap(n: number): number {
    const cap = clampCap(n);
    if (cap === this.recallCap() && meta.get(this.db, 'recall_cap') !== null) return cap;
    meta.set(this.db, 'recall_cap', String(cap));
    this.log.write({ type: 'recall_cap_changed' });
    return cap;
  }

  private isLearned(
    r: Pick<Passage, 'book' | 'chapter' | 'verse_start' | 'verse_end'>,
    excludeId: number | null,
  ): boolean {
    return !!this.db.get<{ id: number }>(
      `SELECT id FROM passages
        WHERE promoted_at IS NOT NULL AND book = ? AND chapter = ? AND verse_start = ? AND verse_end = ? AND id != ?`,
      [r.book, r.chapter, r.verse_start, r.verse_end, excludeId ?? -1],
    );
  }

  /** The reading screen shows up to recallCap(); the zone does not render when nothing is due. */
  due(date: string): Passage[] {
    return this.db.all<Passage>(
      'SELECT * FROM passages WHERE promoted_at IS NOT NULL AND due_date <= ? ORDER BY due_date',
      [date],
    );
  }

  grade(id: number, g: Grade, today: string): void {
    const row = this.db.get<Passage>('SELECT * FROM passages WHERE id = ?', [id]);
    if (!row) throw new Error(`No such passage: ${id}`);
    const next = reschedule(row, g, today);
    // The cloze ladder moves with the grade but never feeds back into the box.
    const rung = nextRung(effectiveRung(row.rung, row.box), g);
    this.db.run(
      'UPDATE passages SET box = ?, last_grade = ?, due_date = ?, held_since = ?, rung = ? WHERE id = ?',
      [next.box, next.last_grade, next.due_date, next.held_since, rung, id],
    );
    this.log.write({ type: 'recall_graded', book: row.book, chapter: row.chapter });
  }

  /** §12 R6 hollowness check — passages held (box 5) for at least 60 days. */
  retention(today: string): { promoted: number; held60: number } {
    const row = this.db.get<{ promoted: number; held60: number }>(
      `SELECT
         COUNT(*) AS promoted,
         SUM(CASE WHEN held_since IS NOT NULL AND julianday(?) - julianday(held_since) >= 60
                  THEN 1 ELSE 0 END) AS held60
       FROM passages WHERE promoted_at IS NOT NULL`,
      [today],
    );
    return { promoted: row?.promoted ?? 0, held60: row?.held60 ?? 0 };
  }

  /**
   * E4 secondary metric (§10) — did a low completion bar make the
   * reading shallow? Bucketed by logical (4 AM boundary) date in JS
   * rather than SQLite's date(), which would assume UTC midnight.
   */
  marksPerChapter(from: string, to: string): number {
    const marksInRange = this.db
      // Picker adds are not marks — only verses marked while reading count.
      .all<Passage>('SELECT * FROM passages WHERE source IS NULL')
      .filter((p) => {
        const d = logicalDate(p.marked_at);
        return d >= from && d <= to;
      }).length;

    const chapters = this.db.get<{ c: number }>(
      `SELECT COUNT(DISTINCT book || '-' || chapter) as c
         FROM days WHERE local_date BETWEEN ? AND ? AND sealed = 1`,
      [from, to],
    );
    if (!chapters || chapters.c === 0) return 0;
    return marksInRange / chapters.c;
  }
}

function validRange(start: number, end: number): boolean {
  return Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start;
}

function clampCap(n: number): number {
  return Math.min(MAX_RECALL_CAP, Math.max(1, Math.round(n)));
}
