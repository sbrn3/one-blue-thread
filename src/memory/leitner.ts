import type { Grade, Passage } from '../log/types';
import { addDays } from '../log/time';

// §21 — deliberately not Anki. Five boxes, fixed intervals.
export const INTERVALS = [1, 3, 7, 21, 60] as const; // days by box

// HARD RULE (§21): reschedule/grade has NO side effects outside this
// module. It cannot touch seal, streak, weave, or dose. There is no
// import from /src/lab or the seal/dose stores — the absence of the
// import is the guarantee, and a test enforces it.
export function reschedule(p: Passage, g: Grade, today: string): Passage {
  const box = g === 'held' ? Math.min(p.box + 1, 5) : g === 'partial' ? p.box : 1; // lost → back to the start
  return {
    ...p,
    box,
    last_grade: g,
    due_date: addDays(today, INTERVALS[box - 1]),
    held_since: box === 5 && p.box < 5 ? today : p.held_since,
  };
}

/** The default daily cap on due cards the reading screen shows; the reader can set 1..MAX_RECALL_CAP in the memory library. */
export const DAILY_RECALL_CAP = 2;
export const MAX_RECALL_CAP = 10;
