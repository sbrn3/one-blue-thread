import { describe, expect, it, vi } from 'vitest';
import { BACKUP_TABLES } from '../src/backup/dump';
import { Log, meta } from '../src/log/log';
import { migrate, schemaVersion } from '../src/log/schema';
import type { ResetEnv } from '../src/reset/perform';
import { performReset } from '../src/reset/perform';
import { RESET_TABLES, resetToFirstRun } from '../src/reset/index';
import { openTestDb } from './util/testDb';

function seed(db: ReturnType<typeof openTestDb>) {
  const log = new Log({ db, buildSha: 'test-sha', now: () => 1_700_000_000_000 });
  log.write({ type: 'seal', book: 'JHN', chapter: 3 });
  log.rebuildDays('2000-01-01');
  meta.set(db, 'onboarded', '1');
  meta.set(db, 'trial_seed', '42');
  db.run(`INSERT INTO cue (anchor, place, nudge_hour, set_at, active) VALUES ('coffee', 'kitchen', 7, 1, 1)`);
  db.run(`INSERT INTO passages (book, chapter, verse_start, verse_end, marked_at) VALUES ('JHN', 3, 16, 16, 1)`);
  db.run(`INSERT INTO partner (id, name, contact_ref, convo_anchor, convo_day) VALUES (1, 'Sam', '+1', 'Sunday', 0)`);
  db.run(`INSERT INTO profile (key, value) VALUES ('streakVisible', '1')`);
  db.run(
    `INSERT INTO chapter_cache (translation, book, chapter, verses_json, fetched_at) VALUES ('niv', 'JHN', 3, '[]', 1)`,
  );
  db.run(`INSERT INTO error_log (ts, message) VALUES (1, 'boom')`);
}

describe('resetToFirstRun', () => {
  it('deletes every row in every table', () => {
    const db = openTestDb();
    migrate(db);
    seed(db);

    resetToFirstRun(db);

    for (const table of RESET_TABLES) {
      expect(db.all(`SELECT * FROM ${table}`), `${table} should be empty`).toHaveLength(0);
    }
  });

  it('leaves the schema version intact — onboarding re-runs against the current schema', () => {
    const db = openTestDb();
    migrate(db);
    const before = schemaVersion(db);
    seed(db);

    resetToFirstRun(db);

    expect(schemaVersion(db)).toBe(before);
  });

  it('clears onboarding so the app returns to first-run', () => {
    const db = openTestDb();
    migrate(db);
    seed(db);
    expect(meta.get(db, 'onboarded')).toBe('1');

    resetToFirstRun(db);

    expect(meta.get(db, 'onboarded')).toBeNull();
  });

  it('wipes at least everything a backup would carry, plus the caches a backup omits', () => {
    for (const t of BACKUP_TABLES) expect(RESET_TABLES).toContain(t);
    expect(RESET_TABLES).toContain('chapter_cache');
    expect(RESET_TABLES).toContain('error_log');
  });
});

describe('performReset', () => {
  it('clears notifications and the keychain before touching the db, and reloads last', async () => {
    const db = openTestDb();
    migrate(db);
    seed(db);

    const calls: string[] = [];
    const env: ResetEnv = {
      cancelAllNotifications: vi.fn(async () => {
        calls.push('notifications');
      }),
      clearRecoverySnapshots: vi.fn(async () => {
        calls.push('recovery-snapshots');
      }),
      clearTemporaryShareFiles: vi.fn(async () => {
        calls.push('share-files');
      }),
      clearBackupPassphrase: vi.fn(async () => {
        calls.push('keychain');
      }),
      reloadApp: vi.fn(async () => {
        calls.push('reload');
        expect(db.all('SELECT * FROM events')).toHaveLength(0);
      }),
    };

    await performReset(db, env);

    expect(calls).toEqual(['notifications', 'recovery-snapshots', 'share-files', 'keychain', 'reload']);
    expect(db.all('SELECT * FROM meta')).toHaveLength(0);
  });

  it('propagates a snapshot/share cleanup failure rather than claiming a complete reset', async () => {
    const db = openTestDb();
    migrate(db);
    seed(db);

    const reloadApp = vi.fn(async () => {});
    const env: ResetEnv = {
      cancelAllNotifications: vi.fn(async () => {}),
      clearRecoverySnapshots: vi.fn(async () => {
        throw new Error('recovery directory busy');
      }),
      clearTemporaryShareFiles: vi.fn(async () => {}),
      clearBackupPassphrase: vi.fn(async () => {}),
      reloadApp,
    };

    await expect(performReset(db, env)).rejects.toThrow('recovery directory busy');
    // Nothing destroyed yet — the failure happened before the db wipe.
    expect(db.all('SELECT * FROM events').length).toBeGreaterThan(0);
    expect(reloadApp).not.toHaveBeenCalled();
  });
});

describe('performReset — the wipe boundary', () => {
  function env(overrides: Partial<ResetEnv> = {}): ResetEnv {
    return {
      cancelAllNotifications: vi.fn(async () => {}),
      clearRecoverySnapshots: vi.fn(async () => {}),
      clearTemporaryShareFiles: vi.fn(async () => {}),
      clearBackupPassphrase: vi.fn(async () => {}),
      reloadApp: vi.fn(async () => {}),
      ...overrides,
    };
  }

  // The caller has to tell two failures apart: one before the wipe leaves
  // everything intact, one after has already destroyed the data and must not
  // return the user to a working sheet.
  it('signals onWiped once, after the db is actually empty', async () => {
    const db = openTestDb();
    migrate(db);
    seed(db);

    const seen: number[] = [];
    await performReset(db, env(), () => seen.push(db.all('SELECT * FROM events').length));

    expect(seen).toEqual([0]);
  });

  it('does not signal onWiped when a native step fails first', async () => {
    const db = openTestDb();
    migrate(db);
    seed(db);

    const onWiped = vi.fn();
    const failing = env({
      cancelAllNotifications: vi.fn(async () => {
        throw new Error('no notification permission');
      }),
    });

    await expect(performReset(db, failing, onWiped)).rejects.toThrow();
    expect(onWiped).not.toHaveBeenCalled();
    // nothing destroyed — returning to the sheet is safe
    expect(db.all('SELECT * FROM events').length).toBeGreaterThan(0);
  });

  it('has already signalled onWiped when the reload fails', async () => {
    const db = openTestDb();
    migrate(db);
    seed(db);

    const onWiped = vi.fn();
    const failing = env({
      reloadApp: vi.fn(async () => {
        throw new Error('reload unavailable');
      }),
    });

    await expect(performReset(db, failing, onWiped)).rejects.toThrow();
    expect(onWiped).toHaveBeenCalledTimes(1);
    expect(db.all('SELECT * FROM events')).toHaveLength(0);
  });

  it('still works without an onWiped callback', async () => {
    const db = openTestDb();
    migrate(db);
    seed(db);
    await performReset(db, env());
    expect(db.all('SELECT * FROM meta')).toHaveLength(0);
  });
});
