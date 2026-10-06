import type { Grade } from '../log/types';

// The cloze ladder (docs/plans/recall-cloze-ladder): how much of a
// recall card is hidden. Rung 1–7; 7 hides the whole passage. This is
// presentation only — Leitner box/due_date (leitner.ts) is untouched.
export const MAX_RUNG = 7;

export type LadderStep = 1 | 2 | 3 | 4;
export type HintStyle = 'stub' | 'gap' | 'none';

function clampRung(rung: number): number {
  if (!Number.isFinite(rung)) return 1;
  return Math.min(MAX_RUNG, Math.max(1, Math.round(rung)));
}

/** Held steps up, partial stays, lost steps back one (never below 1). */
export function nextRung(rung: number, g: Grade): number {
  const r = clampRung(rung);
  return g === 'held' ? Math.min(MAX_RUNG, r + 1) : g === 'partial' ? r : Math.max(1, r - 1);
}

// Existing promoted passages have no rung yet; derive it from the box so
// a restored backup and an in-place upgrade behave identically.
const FROM_BOX = [1, 1, 3, 5, 7, 7] as const; // index = box (0 unused)

export function effectiveRung(rung: number | null, box: number): number {
  if (rung !== null && rung !== undefined) return clampRung(rung);
  const b = Math.min(5, Math.max(1, Math.round(box || 1)));
  return FROM_BOX[b];
}

/** 1–3 hide key words in growing amounts; 4 is the whole passage. */
export function ladderStep(rung: number): LadderStep {
  const r = clampRung(rung);
  return (r >= 7 ? 4 : Math.ceil(r / 2)) as LadderStep;
}

/** Odd rungs show letter stubs, even rungs plain gaps; 7 shows nothing. */
export function hintStyle(rung: number): HintStyle {
  const r = clampRung(rung);
  return r >= MAX_RUNG ? 'none' : r % 2 === 1 ? 'stub' : 'gap';
}
