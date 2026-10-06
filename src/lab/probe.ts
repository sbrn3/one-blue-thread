import type { SqlDb } from '../log/db';
import { addDays } from '../log/time';
import { weightedPick } from './mrt';
import { seededUniform } from './prng';

export interface DailyProbe {
  book: string;
  chapter: number;
  verseStart: number; // the span asked about — at most MAX_SPAN verses inside the verses actually read
  verseEnd: number;
}

export type ProbeGrade = 'held' | 'partial' | 'lost' | 'skipped';

const MAX_SPAN = 3;

/**
 * §10/E9 — the next-day recall probe: "Yesterday you read Philippians
 * 3. What do you remember of verses 4–6?" Randomized daily, p=0.6 by
 * default (Phase 3 lets an applied report change the rate). Decided
 * once per day and persisted immediately — idempotent on
 * replay/re-render, so revisiting the arrival zone can never re-roll
 * it. Returns null when there's nothing to probe (yesterday wasn't
 * sealed, its read range was never recorded, or the roll came up
 * 'skip').
 *
 * The question is a seeded span of at most MAX_SPAN verses inside the
 * verses actually read (docs/plans/recall-cloze-ladder — a whole chapter
 * a day later is not something anyone can recall). It deliberately
 * ignores the reader's marks: memory work and this experiment run in
 * parallel and never steer each other (docs/plans/recall-settings).
 */
export function resolveTodaysProbe(db: SqlDb, date: string, trialSeed: string, fireRate = 0.6): DailyProbe | null {
  const existing = db.get<{
    fired: number;
    book: string | null;
    chapter: number | null;
    verse_start: number | null;
    verse_end: number | null;
  }>('SELECT fired, book, chapter, verse_start, verse_end FROM probes WHERE local_date = ?', [date]);
  if (existing) {
    // A row written before the span columns existed (fired=1, no span) has nothing to show.
    return existing.fired && existing.book && existing.chapter && existing.verse_start && existing.verse_end
      ? {
          book: existing.book,
          chapter: existing.chapter,
          verseStart: existing.verse_start,
          verseEnd: existing.verse_end,
        }
      : null;
  }

  const yesterday = addDays(date, -1);
  const priorDay = db.get<{
    sealed: number;
    book: string | null;
    chapter: number | null;
    verses_read: number | null;
    first_verse: number | null;
    last_verse: number | null;
  }>('SELECT sealed, book, chapter, verses_read, first_verse, last_verse FROM days WHERE local_date = ?', [yesterday]);

  if (!priorDay?.sealed || !priorDay.book || !priorDay.chapter) {
    db.run(
      'INSERT INTO probes (local_date, fired, book, chapter, verses_read, grade) VALUES (?, 0, NULL, NULL, NULL, NULL)',
      [date],
    );
    return null;
  }

  // The arm is rolled first and exactly as before (same key, same rate), so assignment is bit-identical.
  const arm = weightedPick(trialSeed, `E9:${date}`, { fire: fireRate, skip: 1 - fireRate });
  const first = priorDay.first_verse;
  const last = priorDay.last_verse;
  if (arm !== 'fire' || first === null || last === null || last < first) {
    // Skip arm, or a legacy day whose read range was never recorded: nothing to ask.
    db.run(
      'INSERT INTO probes (local_date, fired, book, chapter, verses_read, grade) VALUES (?, 0, ?, ?, ?, NULL)',
      [date, priorDay.book, priorDay.chapter, priorDay.verses_read],
    );
    return null;
  }

  const len = last - first + 1;
  const span = Math.min(MAX_SPAN, len);
  const verseStart = first + Math.floor(seededUniform(trialSeed, `E9span:${date}`) * (len - span + 1));
  const verseEnd = verseStart + span - 1;

  db.run(
    'INSERT INTO probes (local_date, fired, book, chapter, verses_read, verse_start, verse_end, marked, grade) VALUES (?, 1, ?, ?, ?, ?, ?, ?, NULL)',
    [date, priorDay.book, priorDay.chapter, priorDay.verses_read, verseStart, verseEnd, 0],
  );
  return { book: priorDay.book, chapter: priorDay.chapter, verseStart, verseEnd };
}

export function gradeProbe(db: SqlDb, date: string, grade: ProbeGrade): void {
  db.run('UPDATE probes SET grade = ? WHERE local_date = ?', [grade, date]);
}
