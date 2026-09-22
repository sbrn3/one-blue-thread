import type { SqlDb } from '../log/db';
import { getProfile } from './profile';

/**
 * §14 E11/E12 — same shape as notifier.ts's e7ArmBActive: applies
 * permanently once a verdict is Applied (profile.<key> === '0' hides,
 * '1' shows), otherwise falls back to the currently active exp_phases
 * row for that id. Default is visible — unlike E3's streakVisible,
 * these two lines are already shown unconditionally today, so "no
 * experiment has touched this yet" must mean "show it", not hide it.
 */
function reversalVisible(db: SqlDb, expId: 'E11' | 'E12', profileKey: string, date: string): boolean {
  const applied = getProfile(db, profileKey);
  if (applied === '0') return false;
  if (applied === '1') return true;

  const phase = db.get<{ arm: string; start_date: string; end_date: string }>(
    `SELECT arm, start_date, end_date FROM exp_phases WHERE exp_id = ? AND status = 'active'`,
    [expId],
  );
  const hiddenNow = !!phase && phase.arm === 'B' && date >= phase.start_date && date <= phase.end_date;
  return !hiddenNow;
}

export function dayCountVisible(db: SqlDb, date: string): boolean {
  return reversalVisible(db, 'E11', 'dayCountVisible', date);
}

export function sittingCountVisible(db: SqlDb, date: string): boolean {
  return reversalVisible(db, 'E12', 'sittingCountVisible', date);
}
