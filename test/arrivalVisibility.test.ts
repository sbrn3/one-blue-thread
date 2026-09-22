import { describe, expect, it } from 'vitest';
import { migrate } from '../src/log/schema';
import { dayCountVisible, sittingCountVisible } from '../src/lab/arrivalVisibility';
import { setProfile } from '../src/lab/profile';
import { openTestDb } from './util/testDb';

function seedPhase(db: ReturnType<typeof openTestDb>, expId: string, arm: 'A' | 'B', start: string, end: string) {
  db.run(
    `INSERT INTO exp_phases (exp_id, phase, arm, start_date, end_date, status) VALUES (?, 0, ?, ?, ?, 'active')`,
    [expId, arm, start, end],
  );
}

describe.each([
  ['dayCountVisible', dayCountVisible, 'E11', 'dayCountVisible'],
  ['sittingCountVisible', sittingCountVisible, 'E12', 'sittingCountVisible'],
] as const)('%s (§14 E11/E12)', (_name, fn, expId, profileKey) => {
  it('defaults to visible with no profile row and no exp_phases row', () => {
    const db = openTestDb();
    migrate(db);
    expect(fn(db, '2026-01-10')).toBe(true);
  });

  it('applied "0" hides regardless of any live phase', () => {
    const db = openTestDb();
    migrate(db);
    setProfile(db, profileKey, '0');
    seedPhase(db, expId, 'A', '2026-01-01', '2026-01-21'); // would otherwise be visible
    expect(fn(db, '2026-01-10')).toBe(false);
  });

  it('applied "1" shows even during a live B (Hidden) phase', () => {
    const db = openTestDb();
    migrate(db);
    setProfile(db, profileKey, '1');
    seedPhase(db, expId, 'B', '2026-01-01', '2026-01-21');
    expect(fn(db, '2026-01-10')).toBe(true);
  });

  it('a live B phase within range hides it, with no applied setting yet', () => {
    const db = openTestDb();
    migrate(db);
    seedPhase(db, expId, 'B', '2026-01-01', '2026-01-21');
    expect(fn(db, '2026-01-10')).toBe(false);
  });

  it('a live A phase within range keeps it visible', () => {
    const db = openTestDb();
    migrate(db);
    seedPhase(db, expId, 'A', '2026-01-01', '2026-01-21');
    expect(fn(db, '2026-01-10')).toBe(true);
  });

  it('a date outside the active phase window falls back to visible', () => {
    const db = openTestDb();
    migrate(db);
    seedPhase(db, expId, 'B', '2026-01-01', '2026-01-21');
    expect(fn(db, '2026-02-01')).toBe(true);
  });
});
