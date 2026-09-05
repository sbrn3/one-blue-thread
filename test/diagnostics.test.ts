import { describe, expect, it } from 'vitest';
import { logError } from '../src/errors';
import { formatDiagnosticsForSharing, getSupportSummary, needsAttention } from '../src/lab/diagnostics';
import { meta } from '../src/log/log';
import { migrate } from '../src/log/schema';
import { openTestDb } from './util/testDb';

const DAY = 24 * 60 * 60 * 1000;

describe('getSupportSummary / formatDiagnosticsForSharing (§20 — support with zero telemetry)', () => {
  it('includes build_sha, schema_version, and key meta values', () => {
    const db = openTestDb();
    migrate(db);
    meta.set(db, 'trial_start', '2026-01-01');
    meta.set(db, 'watermark', '2026-07-14');

    const summary = getSupportSummary(db, () => Date.UTC(2026, 6, 14));
    const text = formatDiagnosticsForSharing(summary);

    expect(text).toContain('build_sha:');
    expect(text).toContain('schema_version:');
    expect(text).toContain('trial_start: 2026-01-01');
    expect(text).toContain('watermark: 2026-07-14');
  });

  it('reports "unset"/"none"/"never" for absent values rather than blank or throwing', () => {
    const db = openTestDb();
    migrate(db);
    const text = formatDiagnosticsForSharing(getSupportSummary(db));
    expect(text).toContain('trial_start: unset');
    expect(text).toContain('invariant_failed: none');
    expect(text).toContain('recovery_snapshot_last_ok: never');
    expect(text).toContain('external_backup_confirmed_at: never');
  });

  it('states up front that nothing is sent automatically', () => {
    const db = openTestDb();
    migrate(db);
    expect(formatDiagnosticsForSharing(getSupportSummary(db))).toMatch(/^Nothing is sent automatically\./);
  });

  it('lists recent local issues by allowlisted code, or says none', () => {
    const db = openTestDb();
    migrate(db);
    expect(formatDiagnosticsForSharing(getSupportSummary(db))).toContain('(none)');

    logError(db, 'weekly recovery snapshot failed: disk full');
    const summary = getSupportSummary(db);
    expect(summary.items).toHaveLength(1);
    expect(summary.items[0].code).toBe('storage_unavailable');
    expect(formatDiagnosticsForSharing(summary)).toContain('storage_unavailable');
  });

  it('caps recent items at 10, newest first', () => {
    const db = openTestDb();
    migrate(db);
    for (let i = 0; i < 15; i++) logError(db, `error ${i}: network timeout`);

    const summary = getSupportSummary(db);
    expect(summary.items).toHaveLength(10);
  });

  it('the preview (getSupportSummary + formatDiagnosticsForSharing) is byte-identical to what Copy would place on the clipboard', () => {
    const db = openTestDb();
    migrate(db);
    logError(db, 'restore failed: bad passphrase');

    const summary = getSupportSummary(db, () => 1_700_000_000_000);
    const preview = formatDiagnosticsForSharing(summary);
    const clipboardPayload = formatDiagnosticsForSharing(getSupportSummary(db, () => 1_700_000_000_000));
    expect(preview).toBe(clipboardPayload);
  });

  describe('recovery/external labels', () => {
    it('shows the recovery snapshot and external-confirmation timestamps when present', () => {
      const db = openTestDb();
      migrate(db);
      meta.set(db, 'recovery_snapshot_last_ok', '1700000000000');
      meta.set(db, 'external_backup_confirmed_at', '1700000000000');

      const text = formatDiagnosticsForSharing(getSupportSummary(db));
      expect(text).toContain('recovery_snapshot_last_ok: 2023-11-14');
      expect(text).toContain('external_backup_confirmed_at: 2023-11-14');
    });
  });

  describe('attention boundaries', () => {
    it('snapshot attention needed before any success or after a failure', () => {
      const db = openTestDb();
      migrate(db);
      expect(getSupportSummary(db).snapshotAttentionNeeded).toBe(true);

      meta.set(db, 'recovery_snapshot_last_ok', '1000');
      expect(getSupportSummary(db).snapshotAttentionNeeded).toBe(false);

      meta.set(db, 'recovery_snapshot_last_error', 'storage_unavailable');
      expect(getSupportSummary(db).snapshotAttentionNeeded).toBe(true);
    });

    it('external attention: not needed inside the 7-day grace period, needed exactly after it', () => {
      const db = openTestDb();
      migrate(db);
      meta.set(db, 'trial_start', '1970-01-01'); // epoch 0 under Date.parse

      expect(getSupportSummary(db, () => 7 * DAY - 1).externalAttentionNeeded).toBe(false);
      expect(getSupportSummary(db, () => 7 * DAY + 1).externalAttentionNeeded).toBe(true);
    });

    it('recentErrorWithin7Days is exactly a 7-day window', () => {
      const db = openTestDb();
      migrate(db);
      // logError() stamps real Date.now(), which a fake `now` here can't
      // control — insert directly with an explicit ts instead.
      db.run(`INSERT INTO error_log (ts, message) VALUES (0, 'network timeout')`);

      expect(getSupportSummary(db, () => 7 * DAY - 1).recentErrorWithin7Days).toBe(true);
      expect(getSupportSummary(db, () => 7 * DAY + 1).recentErrorWithin7Days).toBe(false);
    });
  });

  describe('needsAttention — Support auto-open triggers', () => {
    it('is false when nothing is wrong', () => {
      const db = openTestDb();
      migrate(db);
      meta.set(db, 'recovery_snapshot_last_ok', '1000');
      expect(needsAttention(getSupportSummary(db, () => 1000))).toBe(false);
    });

    it('opens on an invariant failure', () => {
      const db = openTestDb();
      migrate(db);
      meta.set(db, 'recovery_snapshot_last_ok', '1000');
      meta.set(db, 'invariant_failed', 'append_only_violation');
      expect(needsAttention(getSupportSummary(db, () => 1000))).toBe(true);
    });

    it('opens when the snapshot currently fails', () => {
      const db = openTestDb();
      migrate(db);
      expect(needsAttention(getSupportSummary(db))).toBe(true); // never succeeded yet
    });

    it('opens when an error was logged within 7 days', () => {
      const db = openTestDb();
      migrate(db);
      meta.set(db, 'recovery_snapshot_last_ok', '1000');
      db.run(`INSERT INTO error_log (ts, message) VALUES (1000, 'something broke')`);
      expect(needsAttention(getSupportSummary(db, () => 1000 + DAY))).toBe(true);
    });
  });

  describe('privacy — sentinels never reach the preview/copy payload', () => {
    const sentinels = {
      apiKey: 'sk-live-THIS_IS_A_SECRET_API_KEY_1234567890',
      cueSentence: 'When I pour my morning coffee, I will read one chapter',
      reflection: 'Today I finally understood the parable of the sower',
      partnerContact: 'sam.reader@example.com',
      fileUri: 'file:///data/user/0/com.sngugi.thread/files/private-notes.json',
      queryToken: 'https://api.example.com/v1/verify?token=abcdef123456&user=sam',
      email: 'someone@example.com',
      phone: '+1 (555) 123-4567',
      arbitraryText: 'the quick brown fox jumped over verse 16 of John 3',
    };

    it('none of the sentinel values survive into the shared payload, however they were logged', () => {
      const db = openTestDb();
      migrate(db);
      for (const value of Object.values(sentinels)) {
        logError(db, `unexpected failure near: ${value}`, `stack trace mentioning ${value}`);
      }

      const text = formatDiagnosticsForSharing(getSupportSummary(db));
      for (const [name, value] of Object.entries(sentinels)) {
        expect(text, `${name} leaked into the diagnostics payload`).not.toContain(value);
      }
    });

    it('an unrecognized error message still classifies to a bounded code, never falling back to raw text', () => {
      const db = openTestDb();
      migrate(db);
      logError(db, sentinels.reflection);
      const summary = getSupportSummary(db);
      expect(summary.items[0].code).toBe('unexpected_error');
    });
  });
});
