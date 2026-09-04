import type { SqlDb } from '../log/db';

// Every table the app writes to. This is a superset of BACKUP_TABLES
// (src/backup/dump.ts): a backup deliberately omits the re-derivable
// caches and the local-only error log, but a reset-to-first-run wipes
// those too — the point is a genuinely clean slate.
export const RESET_TABLES = [
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
  'state',
  'probes',
  'profile',
  'meta',
  'chapter_cache',
  'error_log',
] as const;

/**
 * Returns the database to its just-migrated, pre-onboarding state:
 * every row in every table deleted, in one transaction. The schema
 * itself (PRAGMA user_version) is left untouched — migrations are
 * additive-only and re-running onboarding against the current schema
 * is exactly right; there is nothing to roll back.
 *
 * §13.6 note: `events` is append-only *as a running invariant* — no
 * code path in the app UPDATEs or DELETEs an individual event row, and
 * a trial year stays reconstructible from `trial_seed`. A full
 * wipe-to-empty on the user's explicit request is a different thing: it
 * ends the current trial rather than editing its history, and it is the
 * same table-clearing operation `restoreDump()` already performs. The
 * append-only tests assert the log writer exposes no mutation methods,
 * not that the table can never be emptied.
 *
 * This only touches SQLite. The caller is responsible for everything
 * outside it — cancelling scheduled notifications, clearing the
 * keychain backup passphrase — and for forcing a full app reload
 * afterwards so every in-memory store and service is rebuilt.
 */
export function resetToFirstRun(db: SqlDb): void {
  db.tx(() => {
    for (const table of RESET_TABLES) db.run(`DELETE FROM ${table}`);
  });
}
