// Injectable surface over expo-file-system + expo-sharing +
// expo-document-picker + expo-secure-store — same seam pattern as
// CryptoLike/NotificationsLike, so Backup's actual branching logic
// (encryption toggle, restore requiring a passphrase or not, file
// naming) is testable under vitest with a fake instead of the four
// native modules it really takes on-device.

/**
 * Opaque — resolved to a real file only inside nativeIo. Callers (Backup,
 * BackupSection) pass this straight through; they never see or construct a
 * path from it.
 */
export interface RecoverySnapshotHandle {
  readonly slot: 'current' | 'previous';
}

export interface RecoverySnapshotInfo {
  handle: RecoverySnapshotHandle;
  exportedAt: number;
  encrypted: boolean;
}

export interface BackupIO {
  /** Writes content to a fresh, temporary file for OS sharing only. The caller deletes it with deleteShareFile once the share sheet closes, success or not. */
  writeShareFile(name: string, content: string): Promise<string>;
  /** Deletes a file written by writeShareFile. Safe to call even if it's already gone. */
  deleteShareFile(uri: string): Promise<void>;
  /** Opens the OS share sheet for the given file uri. */
  shareFile(uri: string): Promise<void>;
  /** Opens the system file picker. Returns null if the user cancelled. */
  pickImportFile(): Promise<{ uri: string; name: string } | null>;
  readFile(uri: string): Promise<string>;

  /** Writes a new persistent recovery snapshot, rotating the previous current into previous. */
  writeRecoverySnapshot(content: string, info: { exportedAt: number; encrypted: boolean }): Promise<void>;
  /** Recoverable snapshots, newest first. At most two: current, then previous. */
  listRecoverySnapshots(): Promise<RecoverySnapshotInfo[]>;
  readRecoverySnapshot(handle: RecoverySnapshotHandle): Promise<string>;
  /** Deletes every recovery snapshot (used by reset). */
  deleteRecoverySnapshots(): Promise<void>;

  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}
