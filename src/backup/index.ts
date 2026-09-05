// §16.9 layer 2 — weekly export/restore, opt-in passphrase encryption.
// Layer 1 (SQLCipher on-device encryption at rest) is a separate,
// deferred decision — this only ever touches a file the user
// explicitly exports or imports; nothing leaves the phone unless the
// user shares it themselves.
import type { SqlDb } from '../log/db';
import { meta } from '../log/log';
import { decryptPayload, encryptPayload, type CryptoLike, type EncryptedBackup } from './crypto';
import { buildDump, restoreDump, type BackupDump } from './dump';
import type { BackupIO, RecoverySnapshotHandle, RecoverySnapshotInfo } from './io';

// Exported so a full account reset (src/reset) can clear the keychain entry
// directly, without going through disableEncryption() — which would write a
// `backup_encrypted` row back into the just-wiped db.
export const PASSPHRASE_KEY = 'thread_backup_passphrase';
const META_ENCRYPTED = 'backup_encrypted';

// On-device recovery snapshot bookkeeping — distinct from an external,
// user-shared backup (below). Weekly, automatic, silent unless it fails.
const META_SNAPSHOT_LAST_ATTEMPT = 'recovery_snapshot_last_attempt';
const META_SNAPSHOT_LAST_OK = 'recovery_snapshot_last_ok';
/** An allowlisted code, never the raw error — see snapshotErrorCode() below. Cleared (set to '') on the next success. */
const META_SNAPSHOT_LAST_ERROR = 'recovery_snapshot_last_error';

// Confirmed only when the reader explicitly says a shared export was saved
// somewhere off this phone. Never inferred from exportNow() merely running —
// sharing is not saving.
const META_EXTERNAL_CONFIRMED = 'external_backup_confirmed_at';
const META_TRIAL_START = 'trial_start';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const EXTERNAL_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const EXTERNAL_RECONFIRM_MS = 90 * 24 * 60 * 60 * 1000;

interface StoredFile {
  formatVersion: 1;
  encrypted: boolean;
  payload: BackupDump | EncryptedBackup;
}

export interface PickedRestoreFile {
  uri: string;
  name: string;
  requiresPassphrase: boolean;
}

export interface BackupStatus {
  /** The latest foreground snapshot attempt failed, or none has ever succeeded. */
  snapshotAttentionNeeded: boolean;
  snapshotLastOk: number | null;
  /** An allowlisted code, e.g. "passphrase_unavailable" — never raw error text. */
  snapshotLastError: string | null;
  /** Never confirmed past the 7-day grace period, or confirmed but stale past 90 days. */
  externalAttentionNeeded: boolean;
  externalConfirmedAt: number | null;
}

function numOrNull(raw: string | null): number | null {
  return raw ? Number(raw) : null;
}

/** trial_start is stored as a logical 'YYYY-MM-DD' date (see OnboardingFlow.tsx), not epoch ms — Date.parse reads that ISO date-only form as UTC midnight, which is precise enough for a 7/90-day wall-clock grace window. */
function dateStringToEpochMs(raw: string | null): number | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

/** Maps a raw snapshot failure to a bounded, sharing-safe code — the raw error still propagates to the caller for local diagnostics. */
function snapshotErrorCode(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/passphrase/i.test(msg)) return 'passphrase_unavailable';
  if (/space|disk|storage|quota/i.test(msg)) return 'storage_unavailable';
  return 'snapshot_failed';
}

export class Backup {
  constructor(
    private readonly db: SqlDb,
    private readonly crypto: CryptoLike,
    private readonly io: BackupIO,
  ) {}

  isEncryptionEnabled(): boolean {
    return meta.get(this.db, META_ENCRYPTED) === '1';
  }

  async enableEncryption(passphrase: string): Promise<void> {
    if (!passphrase) throw new Error('Passphrase required');
    await this.io.setSecret(PASSPHRASE_KEY, passphrase);
    meta.set(this.db, META_ENCRYPTED, '1');
  }

  async disableEncryption(): Promise<void> {
    await this.io.deleteSecret(PASSPHRASE_KEY);
    meta.set(this.db, META_ENCRYPTED, '0');
  }

  /** Builds the dump and encrypts it if enabled. Writes nothing — the caller decides where the bytes go (share file vs. recovery snapshot). */
  private async buildStoredFile(now: () => number): Promise<{ json: string; encrypted: boolean }> {
    const dump = buildDump(this.db, now);

    let stored: StoredFile;
    if (this.isEncryptionEnabled()) {
      const passphrase = await this.io.getSecret(PASSPHRASE_KEY);
      if (!passphrase) throw new Error('Encryption is enabled but no passphrase is stored');
      const encrypted = await encryptPayload(this.crypto, passphrase, JSON.stringify(dump));
      stored = { formatVersion: 1, encrypted: true, payload: encrypted };
    } else {
      stored = { formatVersion: 1, encrypted: false, payload: dump };
    }
    return { json: JSON.stringify(stored), encrypted: stored.encrypted };
  }

  /**
   * The manual "Export now" path: writes a temporary share file, opens the
   * OS share sheet, and always deletes the temporary file afterward —
   * success, failure, or cancellation. This never claims the reader saved
   * the file anywhere; only confirmExternalBackupSaved() does that.
   */
  async exportNow(now: () => number = Date.now): Promise<void> {
    const { json } = await this.buildStoredFile(now);
    const filename = `one-blue-thread-backup-${new Date(now()).toISOString().slice(0, 10)}.json`;
    const uri = await this.io.writeShareFile(filename, json);
    try {
      await this.io.shareFile(uri);
    } finally {
      await this.io.deleteShareFile(uri);
    }
  }

  /** Records that the reader confirmed a shared export was saved somewhere off this phone. */
  confirmExternalBackupSaved(now: () => number = Date.now): void {
    meta.set(this.db, META_EXTERNAL_CONFIRMED, String(now()));
  }

  snapshotLastOkAt(): number | null {
    return numOrNull(meta.get(this.db, META_SNAPSHOT_LAST_OK));
  }

  /**
   * Writes (and rotates current->previous) a persistent recovery snapshot
   * right now, regardless of the weekly interval. Used by snapshotIfDue()
   * below and by the knot's manual Retry. Throws on failure — after first
   * recording an allowlisted code, so the caller still gets the raw error
   * for local diagnostics (§19) while nothing sharing-bound ever sees it.
   */
  async retrySnapshot(now: () => number = Date.now): Promise<void> {
    meta.set(this.db, META_SNAPSHOT_LAST_ATTEMPT, String(now()));
    try {
      const { json, encrypted } = await this.buildStoredFile(now);
      await this.io.writeRecoverySnapshot(json, { exportedAt: now(), encrypted });
      meta.set(this.db, META_SNAPSHOT_LAST_OK, String(now()));
      meta.set(this.db, META_SNAPSHOT_LAST_ERROR, ''); // cleared — see status()
    } catch (e) {
      meta.set(this.db, META_SNAPSHOT_LAST_ERROR, snapshotErrorCode(e));
      throw e;
    }
  }

  /**
   * §19 "Weekly (auto): encrypted export. Silent unless it fails" — a
   * recovery snapshot under persistent document storage, not the OS share
   * sheet. Returns false if a week hasn't passed since the last SUCCESSFUL
   * snapshot; throws on failure so the caller can log it (see App.tsx).
   */
  async snapshotIfDue(now: () => number = Date.now): Promise<boolean> {
    const last = this.snapshotLastOkAt();
    if (last !== null && now() - last < WEEK_MS) return false;
    await this.retrySnapshot(now);
    return true;
  }

  async listRecoverySnapshots(): Promise<RecoverySnapshotInfo[]> {
    return this.io.listRecoverySnapshots();
  }

  /** Wall-clock (Date.now, never the logical 4am date) attention status for the knot's Safekeeping/Backup section. */
  status(now: () => number = Date.now): BackupStatus {
    const lastOk = numOrNull(meta.get(this.db, META_SNAPSHOT_LAST_OK));
    const lastError = meta.get(this.db, META_SNAPSHOT_LAST_ERROR) || null;
    const externalConfirmedAt = numOrNull(meta.get(this.db, META_EXTERNAL_CONFIRMED));
    const trialStart = dateStringToEpochMs(meta.get(this.db, META_TRIAL_START));

    const externalAttentionNeeded =
      externalConfirmedAt === null
        ? trialStart !== null && now() - trialStart > EXTERNAL_GRACE_MS
        : now() - externalConfirmedAt > EXTERNAL_RECONFIRM_MS;

    return {
      snapshotAttentionNeeded: lastOk === null || lastError !== null,
      snapshotLastOk: lastOk,
      snapshotLastError: lastError,
      externalAttentionNeeded,
      externalConfirmedAt,
    };
  }

  /** Opens the system file picker. Returns null if the user cancelled. */
  async pickRestoreFile(): Promise<PickedRestoreFile | null> {
    const picked = await this.io.pickImportFile();
    if (!picked) return null;
    const stored = JSON.parse(await this.io.readFile(picked.uri)) as StoredFile;
    return { uri: picked.uri, name: picked.name, requiresPassphrase: stored.encrypted };
  }

  /**
   * Decrypts (if needed) and restores, wiping and repopulating every
   * included table in one transaction (see dump.ts). `passphrase` is
   * required only when the source reported requiresPassphrase/encrypted —
   * a wrong passphrase throws (GCM auth-tag mismatch) rather than silently
   * corrupting the restore, and nothing is mutated before that check passes.
   */
  async restoreFrom(uri: string, passphrase?: string): Promise<void> {
    await this.applyStoredContent(await this.io.readFile(uri), passphrase);
  }

  /** Same restore path, reading from a persistent recovery snapshot instead of a picked file. */
  async restoreRecoverySnapshot(handle: RecoverySnapshotHandle, passphrase?: string): Promise<void> {
    await this.applyStoredContent(await this.io.readRecoverySnapshot(handle), passphrase);
  }

  private async applyStoredContent(raw: string, passphrase?: string): Promise<void> {
    const stored = JSON.parse(raw) as StoredFile;
    const dump = stored.encrypted
      ? (JSON.parse(
          await decryptPayload(this.crypto, requirePassphrase(passphrase), stored.payload as EncryptedBackup),
        ) as BackupDump)
      : (stored.payload as BackupDump);
    restoreDump(this.db, dump);
  }
}

function requirePassphrase(p: string | undefined): string {
  if (!p) throw new Error('This backup is encrypted — a passphrase is required to restore it');
  return p;
}
