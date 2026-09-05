// Real wiring for BackupIO (see io.ts): expo-file-system for writing
// the export file and reading a picked one, expo-sharing for the
// share sheet, expo-document-picker for the restore-side file picker,
// expo-secure-store (OS keychain) for the passphrase — a deliberate
// improvement over the plan's literal pseudocode of storing the raw
// passphrase in the app's own `meta` table.
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import type { BackupIO, RecoverySnapshotHandle } from './io';

// One directory under persistent document storage — never Paths.cache, which
// the OS can purge at any time. "current"/"previous" are the only two
// snapshots ever retained; a metadata sidecar per slot carries exportedAt/
// encrypted so discovery never has to parse (or expose) the payload itself.
const RECOVERY_DIR_NAME = 'recovery';
const SLOT_FILE: Record<RecoverySnapshotHandle['slot'], string> = { current: 'current.json', previous: 'previous.json' };
const SLOT_META_FILE: Record<RecoverySnapshotHandle['slot'], string> = {
  current: 'current.meta.json',
  previous: 'previous.meta.json',
};

interface SnapshotMeta {
  exportedAt: number;
  encrypted: boolean;
}

function recoveryDirectory(): Directory {
  const dir = new Directory(Paths.document, RECOVERY_DIR_NAME);
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

export const nativeBackupIo: BackupIO = {
  async writeShareFile(name, content) {
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    file.create();
    file.write(content);
    return file.uri;
  },

  async deleteShareFile(uri) {
    const file = new File(uri);
    if (file.exists) file.delete();
  },

  async shareFile(uri) {
    if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
    await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export Thread backup' });
  },

  async pickImportFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
    if (result.canceled) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.name };
  },

  async readFile(uri) {
    return new File(uri).text();
  },

  async writeRecoverySnapshot(content, info) {
    const dir = recoveryDirectory();

    // Write-new-then-move: the new snapshot is fully written to a temp file
    // before anything existing is touched, so an interrupted write can never
    // leave "current" corrupt or missing.
    const tmp = new File(dir, 'current.tmp.json');
    if (tmp.exists) tmp.delete();
    tmp.create();
    tmp.write(content);

    const current = new File(dir, SLOT_FILE.current);
    const currentMeta = new File(dir, SLOT_META_FILE.current);
    const previous = new File(dir, SLOT_FILE.previous);
    const previousMeta = new File(dir, SLOT_META_FILE.previous);

    if (current.exists) {
      if (previous.exists) previous.delete();
      current.moveSync(previous);
      if (currentMeta.exists) {
        if (previousMeta.exists) previousMeta.delete();
        currentMeta.moveSync(previousMeta);
      }
    }

    tmp.moveSync(current);
    if (currentMeta.exists) currentMeta.delete();
    currentMeta.create();
    currentMeta.write(JSON.stringify({ exportedAt: info.exportedAt, encrypted: info.encrypted } satisfies SnapshotMeta));
  },

  async listRecoverySnapshots() {
    const dir = recoveryDirectory();
    const out: Array<{ handle: RecoverySnapshotHandle; exportedAt: number; encrypted: boolean }> = [];
    for (const slot of ['current', 'previous'] as const) {
      const file = new File(dir, SLOT_FILE[slot]);
      const metaFile = new File(dir, SLOT_META_FILE[slot]);
      if (!file.exists || !metaFile.exists) continue;
      const parsed = JSON.parse(await metaFile.text()) as SnapshotMeta;
      out.push({ handle: { slot }, exportedAt: parsed.exportedAt, encrypted: parsed.encrypted });
    }
    return out;
  },

  async readRecoverySnapshot(handle) {
    const dir = recoveryDirectory();
    const file = new File(dir, SLOT_FILE[handle.slot]);
    if (!file.exists) throw new Error(`No ${handle.slot} recovery snapshot exists`);
    return file.text();
  },

  async deleteRecoverySnapshots() {
    // Every recovery artifact lives under this one resolved directory —
    // there is no path parameter anywhere in this API, so a caller has no
    // way to point this at anything else.
    const dir = new Directory(Paths.document, RECOVERY_DIR_NAME);
    if (dir.exists) dir.delete();
  },

  async getSecret(key) {
    return SecureStore.getItemAsync(key);
  },

  async setSecret(key, value) {
    await SecureStore.setItemAsync(key, value);
  },

  async deleteSecret(key) {
    await SecureStore.deleteItemAsync(key);
  },
};
