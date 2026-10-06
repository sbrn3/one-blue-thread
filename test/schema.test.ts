import { describe, expect, it } from 'vitest';
import { MIGRATIONS, migrate, schemaVersion } from '../src/log/schema';
import { openTestDb } from './util/testDb';

describe('schema + migration harness (W1)', () => {
  it('migrates empty → latest clean', () => {
    const db = openTestDb();
    expect(schemaVersion(db)).toBe(0);
    migrate(db);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);

    const tables = db
      .all<{ name: string }>(`SELECT name FROM sqlite_master WHERE type = 'table'`)
      .map((r) => r.name);
    for (const t of [
      'events',
      'days',
      'exp_phases',
      'decisions',
      'bandit',
      'cue',
      'passages',
      'partner',
      'srbai',
      'reports',
      'meta',
    ]) {
      expect(tables).toContain(t);
    }
  });

  it('is idempotent — running migrate twice is a no-op', () => {
    const db = openTestDb();
    migrate(db);
    migrate(db);
    expect(schemaVersion(db)).toBe(MIGRATIONS.length);
  });

  it('v12 adds the cloze ladder + probe span columns without touching old rows', () => {
    const db = openTestDb();
    for (const stmt of MIGRATIONS.slice(0, 11).flat()) db.run(stmt);
    db.run('PRAGMA user_version = 11');
    db.run(
      `INSERT INTO passages (book, chapter, verse_start, verse_end, marked_at, promoted_at, box)
       VALUES ('John', 3, 16, 17, 1, 2, 3)`,
    );
    migrate(db);
    expect(schemaVersion(db)).toBe(12);
    expect(db.get<{ rung: number | null }>('SELECT rung FROM passages')?.rung).toBeNull();
    for (const [t, cols] of [
      ['probes', ['verse_start', 'verse_end', 'marked']],
      ['days', ['first_verse', 'last_verse']],
      ['events', ['verse_first', 'verse_last']],
    ] as const) {
      const names = db.all<{ name: string }>(`PRAGMA table_info(${t})`).map((c) => c.name);
      for (const c of cols) expect(names).toContain(c);
    }
    migrate(db);
    expect(schemaVersion(db)).toBe(12);
  });

  it('partner table admits exactly one row (a dyad, not a group)', () => {
    const db = openTestDb();
    migrate(db);
    db.run(`INSERT INTO partner (id, name) VALUES (1, 'A')`);
    expect(() => db.run(`INSERT INTO partner (id, name) VALUES (2, 'B')`)).toThrow();
  });

  it('v3 adds cue.validated (§05 onboarding anchor-recency check)', () => {
    const db = openTestDb();
    migrate(db);
    db.run(`INSERT INTO cue (anchor, place, nudge_hour, validated, set_at, active) VALUES ('c', 'p', 21, 1, 0, 1)`);
    const row = db.get<{ validated: number }>('SELECT validated FROM cue');
    expect(row?.validated).toBe(1);
  });
});
