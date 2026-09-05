import { describe, expect, it } from 'vitest';
import { Backup } from '../src/backup';
import type { CryptoLike } from '../src/backup/crypto';
import { decryptPayload, deriveKey, encryptPayload } from '../src/backup/crypto';
import { BACKUP_TABLES, buildDump, restoreDump } from '../src/backup/dump';
import type { BackupIO, RecoverySnapshotHandle, RecoverySnapshotInfo } from '../src/backup/io';
import { meta } from '../src/log/log';
import { migrate } from '../src/log/schema';
import { openTestDb } from './util/testDb';

// A deterministic stand-in for expo-crypto's AES-GCM: "encrypts" by
// tagging the plaintext with the key that produced it, so a decrypt
// with a different key can be told apart from the right one — same
// observable contract (wrong key/tampered data throws) without
// needing a real cipher in the test suite.
function fakeCrypto(): CryptoLike {
  return {
    async digestSha256Hex(data) {
      // Not a real hash — just needs to be deterministic and mix the input.
      let h = 0;
      for (let i = 0; i < data.length; i++) h = (h * 31 + data.charCodeAt(i)) >>> 0;
      return h.toString(16).padStart(64, '0');
    },
    async randomHex(byteCount) {
      return Array.from({ length: byteCount * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    },
    async importAesKey(hex64) {
      return hex64;
    },
    async encryptUtf8(plaintext, key) {
      return Buffer.from(JSON.stringify({ key, plaintext })).toString('base64');
    },
    async decryptUtf8(combinedBase64, key) {
      const { key: usedKey, plaintext } = JSON.parse(Buffer.from(combinedBase64, 'base64').toString('utf8'));
      if (usedKey !== key) throw new Error('auth tag mismatch');
      return plaintext;
    },
  };
}

interface Snapshot {
  content: string;
  exportedAt: number;
  encrypted: boolean;
}

function fakeIo(): BackupIO & {
  files: Map<string, string>;
  /** Never pruned by deleteShareFile — records what every writeShareFile call actually wrote, so tests can inspect content after cleanup runs. */
  writtenShareFiles: Map<string, string>;
  deletedShareFiles: string[];
  secrets: Map<string, string>;
  nextPick: { uri: string; name: string } | null;
  shared: string[];
  current: Snapshot | null;
  previous: Snapshot | null;
} {
  const files = new Map<string, string>();
  const writtenShareFiles = new Map<string, string>();
  const deletedShareFiles: string[] = [];
  const secrets = new Map<string, string>();
  const shared: string[] = [];
  let seq = 0;

  return {
    files,
    writtenShareFiles,
    deletedShareFiles,
    secrets,
    shared,
    nextPick: null,
    current: null,
    previous: null,

    async writeShareFile(name, content) {
      const uri = `file:///cache/${seq++}-${name}`;
      files.set(uri, content);
      writtenShareFiles.set(uri, content);
      return uri;
    },
    async deleteShareFile(uri) {
      files.delete(uri);
      deletedShareFiles.push(uri);
    },
    async shareFile(uri) {
      shared.push(uri);
    },
    async pickImportFile() {
      return this.nextPick;
    },
    async readFile(uri) {
      const content = files.get(uri);
      if (content === undefined) throw new Error(`no such file: ${uri}`);
      return content;
    },

    async writeRecoverySnapshot(content, info) {
      this.previous = this.current;
      this.current = { content, exportedAt: info.exportedAt, encrypted: info.encrypted };
    },
    async listRecoverySnapshots(): Promise<RecoverySnapshotInfo[]> {
      const out: RecoverySnapshotInfo[] = [];
      if (this.current) out.push({ handle: { slot: 'current' }, exportedAt: this.current.exportedAt, encrypted: this.current.encrypted });
      if (this.previous) out.push({ handle: { slot: 'previous' }, exportedAt: this.previous.exportedAt, encrypted: this.previous.encrypted });
      return out;
    },
    async readRecoverySnapshot(handle: RecoverySnapshotHandle) {
      const snap = handle.slot === 'current' ? this.current : this.previous;
      if (!snap) throw new Error(`no such recovery snapshot: ${handle.slot}`);
      return snap.content;
    },
    async deleteRecoverySnapshots() {
      this.current = null;
      this.previous = null;
    },

    async getSecret(key) {
      return secrets.get(key) ?? null;
    },
    async setSecret(key, value) {
      secrets.set(key, value);
    },
    async deleteSecret(key) {
      secrets.delete(key);
    },
  };
}

describe('dump/restore (§16.9)', () => {
  it('round-trips every included table', () => {
    const db = openTestDb();
    migrate(db);
    db.run(`INSERT INTO events (ts, tz_offset, local_date, type, build_sha) VALUES (1, 0, '2026-01-01', 'app_open', 'abc')`);
    db.run(`INSERT INTO days (local_date, sealed, dose) VALUES ('2026-01-01', 1, 'full_chapter')`);
    db.run(`INSERT INTO meta (key, value) VALUES ('trial_seed', '42')`);

    const dump = buildDump(db);
    expect(Object.keys(dump.tables).sort()).toEqual([...BACKUP_TABLES].sort());
    expect(dump.tables.events).toHaveLength(1);

    const restoreDb = openTestDb();
    migrate(restoreDb);
    restoreDump(restoreDb, dump);

    expect(restoreDb.all('SELECT * FROM events')).toHaveLength(1);
    expect(restoreDb.get<{ value: string }>("SELECT value FROM meta WHERE key = 'trial_seed'")?.value).toBe('42');
  });

  it('wipes existing rows before restoring, not appending to them', () => {
    const db = openTestDb();
    migrate(db);
    db.run(`INSERT INTO meta (key, value) VALUES ('a', '1')`);
    const dump = buildDump(db); // captures just 'a'

    db.run(`INSERT INTO meta (key, value) VALUES ('b', '2')`); // added after the dump was taken
    restoreDump(db, dump);

    expect(db.all('SELECT key FROM meta')).toEqual([{ key: 'a' }]);
  });

  it('drops columns the current schema no longer has, without failing the restore', () => {
    const db = openTestDb();
    migrate(db);
    const dump = buildDump(db);
    dump.tables.meta.push({ key: 'x', value: '1', a_column_removed_since: 'ghost' });

    expect(() => restoreDump(db, dump)).not.toThrow();
    expect(db.get<{ value: string }>("SELECT value FROM meta WHERE key = 'x'")?.value).toBe('1');
  });

  it('never touches chapter_cache — a cache, not evidence', () => {
    expect(BACKUP_TABLES).not.toContain('chapter_cache');
  });
});

describe('crypto (§16.9 passphrase encryption)', () => {
  it('round-trips a payload with the right passphrase', async () => {
    const crypto = fakeCrypto();
    const encrypted = await encryptPayload(crypto, 'correct horse', '{"hello":"world"}');
    const decrypted = await decryptPayload(crypto, 'correct horse', encrypted);
    expect(decrypted).toBe('{"hello":"world"}');
  });

  it('throws on the wrong passphrase rather than returning garbage', async () => {
    const crypto = fakeCrypto();
    const encrypted = await encryptPayload(crypto, 'correct horse', '{"hello":"world"}');
    await expect(decryptPayload(crypto, 'wrong passphrase', encrypted)).rejects.toThrow();
  });

  it('derives the same key for the same passphrase+salt, deterministically', async () => {
    const crypto = fakeCrypto();
    const a = await deriveKey(crypto, 'p', 'deadbeef');
    const b = await deriveKey(crypto, 'p', 'deadbeef');
    expect(a).toBe(b);
  });
});

function db_seed(db: ReturnType<typeof openTestDb>, value: string) {
  db.run(`INSERT INTO meta (key, value) VALUES ('mark', ?)`, [value]);
}

describe('Backup (§16.9 export/restore orchestration)', () => {
  it('exports unencrypted by default, sharing then always cleaning up the temporary file', async () => {
    const db = openTestDb();
    migrate(db);
    const io = fakeIo();
    const backup = new Backup(db, fakeCrypto(), io);

    expect(backup.isEncryptionEnabled()).toBe(false);

    await backup.exportNow(() => 1_700_000_000_000);

    expect(io.shared).toHaveLength(1);
    const uri = io.shared[0];
    const stored = JSON.parse(io.writtenShareFiles.get(uri)!);
    expect(stored.encrypted).toBe(false);
    expect(io.deletedShareFiles).toContain(uri); // the finally-block cleanup
    expect(io.files.has(uri)).toBe(false); // actually gone from "disk"
  });

  it('cleans up the temporary share file even when the share sheet itself throws', async () => {
    const db = openTestDb();
    migrate(db);
    const io = fakeIo();
    io.shareFile = async () => {
      throw new Error('Sharing is not available on this device');
    };
    const backup = new Backup(db, fakeCrypto(), io);

    await expect(backup.exportNow()).rejects.toThrow('Sharing is not available');
    expect(io.deletedShareFiles).toHaveLength(1);
  });

  it('exportNow never claims external success on its own — confirmExternalBackupSaved is a separate, explicit step', async () => {
    const db = openTestDb();
    migrate(db);
    const io = fakeIo();
    const backup = new Backup(db, fakeCrypto(), io);

    await backup.exportNow(() => 1_700_000_000_000);
    expect(backup.status(() => 1_700_000_000_000).externalConfirmedAt).toBeNull();

    backup.confirmExternalBackupSaved(() => 1_700_000_000_000);
    expect(backup.status(() => 1_700_000_000_000).externalConfirmedAt).toBe(1_700_000_000_000);
  });

  it('encrypts once enabled, and a plain restore of it fails without the passphrase', async () => {
    const db = openTestDb();
    migrate(db);
    db.run(`INSERT INTO meta (key, value) VALUES ('trial_seed', '99')`);
    const io = fakeIo();
    const backup = new Backup(db, fakeCrypto(), io);

    await backup.enableEncryption('correct horse battery staple');
    expect(backup.isEncryptionEnabled()).toBe(true);

    await backup.exportNow();
    const content = io.writtenShareFiles.get(io.shared[0])!;
    expect(JSON.parse(content).encrypted).toBe(true);

    // The share file itself is already cleaned up by now — simulate the
    // reader having saved a copy elsewhere and picking it back up later.
    const pickedUri = 'file:///picked/thread-backup.json';
    io.files.set(pickedUri, content);
    io.nextPick = { uri: pickedUri, name: 'thread-backup.json' };

    const picked = await backup.pickRestoreFile();
    expect(picked?.requiresPassphrase).toBe(true);

    await expect(backup.restoreFrom(pickedUri)).rejects.toThrow(/passphrase/i);
    await expect(backup.restoreFrom(pickedUri, 'wrong')).rejects.toThrow();
  });

  it('a wrong-passphrase restore mutates nothing in the target db', async () => {
    const source = openTestDb();
    migrate(source);
    db_seed(source, 'original');
    const io = fakeIo();
    const sourceBackup = new Backup(source, fakeCrypto(), io);
    await sourceBackup.enableEncryption('right passphrase');
    await sourceBackup.retrySnapshot();

    const target = openTestDb();
    migrate(target);
    db_seed(target, 'untouched');
    const targetBackup = new Backup(target, fakeCrypto(), io);
    const [snap] = await targetBackup.listRecoverySnapshots();

    await expect(targetBackup.restoreRecoverySnapshot(snap.handle, 'wrong passphrase')).rejects.toThrow();
    expect(target.get<{ value: string }>("SELECT value FROM meta WHERE key = 'mark'")?.value).toBe('untouched');
  });

  it('restores a picked (previously exported, unencrypted) file into a fresh db', async () => {
    const source = openTestDb();
    migrate(source);
    db_seed(source, 'plain-value');
    const io = fakeIo();
    const sourceBackup = new Backup(source, fakeCrypto(), io);
    await sourceBackup.exportNow();
    const content = io.writtenShareFiles.get(io.shared[0])!;
    const pickedUri = 'file:///picked/thread-backup.json';
    io.files.set(pickedUri, content);

    const target = openTestDb();
    migrate(target);
    const targetBackup = new Backup(target, fakeCrypto(), io);
    await targetBackup.restoreFrom(pickedUri);

    expect(target.get<{ value: string }>("SELECT value FROM meta WHERE key = 'mark'")?.value).toBe('plain-value');
  });

  it('pickRestoreFile returns null when the user cancels the picker', async () => {
    const db = openTestDb();
    migrate(db);
    const io = fakeIo();
    io.nextPick = null;
    const backup = new Backup(db, fakeCrypto(), io);
    expect(await backup.pickRestoreFile()).toBeNull();
  });

  it('disableEncryption clears the stored passphrase', async () => {
    const db = openTestDb();
    migrate(db);
    const io = fakeIo();
    const backup = new Backup(db, fakeCrypto(), io);
    await backup.enableEncryption('temp');
    await backup.disableEncryption();

    expect(backup.isEncryptionEnabled()).toBe(false);
    expect(await io.getSecret('thread_backup_passphrase')).toBeNull();
  });

  describe('recovery snapshots — current/previous retention and restore (Slice 4)', () => {
    it('restores a recovery snapshot into a fresh db given the right passphrase', async () => {
      const source = openTestDb();
      migrate(source);
      db_seed(source, 'restored-value');
      const io = fakeIo();
      const sourceBackup = new Backup(source, fakeCrypto(), io);
      await sourceBackup.enableEncryption('the passphrase');
      await sourceBackup.retrySnapshot();

      const target = openTestDb();
      migrate(target);
      const targetBackup = new Backup(target, fakeCrypto(), io);
      const [snap] = await targetBackup.listRecoverySnapshots();
      expect(snap.encrypted).toBe(true); // encryption preserved through the snapshot
      await targetBackup.restoreRecoverySnapshot(snap.handle, 'the passphrase');

      expect(target.get<{ value: string }>("SELECT value FROM meta WHERE key = 'mark'")?.value).toBe('restored-value');
    });

    it('retains exactly current and previous — a third snapshot drops the oldest', async () => {
      const db = openTestDb();
      migrate(db);
      const io = fakeIo();
      const backup = new Backup(db, fakeCrypto(), io);

      db_seed(db, 'v1');
      await backup.retrySnapshot(() => 1);
      db.run(`UPDATE meta SET value = 'v2' WHERE key = 'mark'`);
      await backup.retrySnapshot(() => 2);
      db.run(`UPDATE meta SET value = 'v3' WHERE key = 'mark'`);
      await backup.retrySnapshot(() => 3);

      const snaps = await backup.listRecoverySnapshots();
      expect(snaps).toHaveLength(2);
      expect(snaps.map((s) => s.exportedAt).sort()).toEqual([2, 3]); // v1's snapshot (ts=1) is gone
    });

    it('a corrupt current snapshot does not prevent restoring from previous', async () => {
      const db = openTestDb();
      migrate(db);
      const io = fakeIo();
      const backup = new Backup(db, fakeCrypto(), io);

      db_seed(db, 'good-value');
      await backup.retrySnapshot(() => 1); // becomes "previous" after the next snapshot
      await backup.retrySnapshot(() => 2); // becomes "current"
      io.current!.content = '{not valid json'; // simulate corruption of current only

      const target = openTestDb();
      migrate(target);
      const targetBackup = new Backup(target, fakeCrypto(), io);
      const snaps = await targetBackup.listRecoverySnapshots();
      const currentHandle = snaps.find((s) => s.handle.slot === 'current')!.handle;
      const previousHandle = snaps.find((s) => s.handle.slot === 'previous')!.handle;

      await expect(targetBackup.restoreRecoverySnapshot(currentHandle)).rejects.toThrow();
      await targetBackup.restoreRecoverySnapshot(previousHandle);
      expect(target.get<{ value: string }>("SELECT value FROM meta WHERE key = 'mark'")?.value).toBe('good-value');
    });
  });

  describe('snapshotIfDue (§19 "weekly (auto): encrypted export. Silent unless it fails")', () => {
    const DAY = 24 * 60 * 60 * 1000;

    it('runs immediately when nothing has ever succeeded, without opening the share sheet', async () => {
      const db = openTestDb();
      migrate(db);
      const io = fakeIo();
      const backup = new Backup(db, fakeCrypto(), io);

      const ran = await backup.snapshotIfDue(() => 1_700_000_000_000);

      expect(ran).toBe(true);
      expect(io.shared).toEqual([]); // no share sheet — this is the silent path
      expect(backup.snapshotLastOkAt()).toBe(1_700_000_000_000);
    });

    it('skips (returns false) when less than a week has passed since the last success', async () => {
      const db = openTestDb();
      migrate(db);
      const io = fakeIo();
      const backup = new Backup(db, fakeCrypto(), io);
      const start = 1_700_000_000_000;
      await backup.snapshotIfDue(() => start);

      const result = await backup.snapshotIfDue(() => start + 3 * DAY);

      expect(result).toBe(false);
      expect(backup.snapshotLastOkAt()).toBe(start); // untouched
    });

    it('runs again once a full week has passed', async () => {
      const db = openTestDb();
      migrate(db);
      const io = fakeIo();
      const backup = new Backup(db, fakeCrypto(), io);
      const start = 1_700_000_000_000;
      await backup.snapshotIfDue(() => start);

      const result = await backup.snapshotIfDue(() => start + 7 * DAY);

      expect(result).toBe(true);
      expect(backup.snapshotLastOkAt()).toBe(start + 7 * DAY);
    });

    it('throws (rather than swallowing) on failure, recording an allowlisted code and leaving snapshotLastOkAt untouched', async () => {
      const db = openTestDb();
      migrate(db);
      const io = fakeIo();
      io.writeRecoverySnapshot = async () => {
        throw new Error('disk full');
      };
      const backup = new Backup(db, fakeCrypto(), io);

      await expect(backup.snapshotIfDue(() => 1_700_000_000_000)).rejects.toThrow('disk full');
      expect(backup.snapshotLastOkAt()).toBeNull();
      expect(backup.status(() => 1_700_000_000_000).snapshotLastError).toBe('storage_unavailable');
    });
  });

  describe('status() — attention boundaries (wall-clock, Slice 4)', () => {
    const DAY = 24 * 60 * 60 * 1000;

    it('snapshot attention: needed before any success, clears on success, reappears on a later failure', async () => {
      const db = openTestDb();
      migrate(db);
      const io = fakeIo();
      const backup = new Backup(db, fakeCrypto(), io);

      expect(backup.status(() => 1000).snapshotAttentionNeeded).toBe(true); // fresh install

      await backup.retrySnapshot(() => 1000);
      expect(backup.status(() => 1000).snapshotAttentionNeeded).toBe(false);

      io.writeRecoverySnapshot = async () => {
        throw new Error('boom');
      };
      await expect(backup.retrySnapshot(() => 2000)).rejects.toThrow();
      expect(backup.status(() => 2000).snapshotAttentionNeeded).toBe(true); // a later failure reopens it
    });

    it('external attention: not needed inside the 7-day grace period, needed exactly after it', () => {
      const db = openTestDb();
      migrate(db);
      // trial_start is a logical 'YYYY-MM-DD' date (OnboardingFlow.tsx), not epoch ms —
      // 1970-01-01 parses to epoch 0, keeping the offsets below easy to read.
      meta.set(db, 'trial_start', '1970-01-01');
      const backup = new Backup(db, fakeCrypto(), fakeIo());

      expect(backup.status(() => 7 * DAY - 1).externalAttentionNeeded).toBe(false);
      expect(backup.status(() => 7 * DAY + 1).externalAttentionNeeded).toBe(true);
    });

    it('external attention: clears on confirmation, needed again exactly after 90 days stale', () => {
      const db = openTestDb();
      migrate(db);
      meta.set(db, 'trial_start', '1970-01-01');
      const backup = new Backup(db, fakeCrypto(), fakeIo());

      backup.confirmExternalBackupSaved(() => 10_000);
      expect(backup.status(() => 10_000 + 90 * DAY - 1).externalAttentionNeeded).toBe(false);
      expect(backup.status(() => 10_000 + 90 * DAY + 1).externalAttentionNeeded).toBe(true);
    });
  });
});
