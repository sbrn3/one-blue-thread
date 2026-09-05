// Real wiring for ResetEnv (see perform.ts): expo-notifications for
// the scheduled-notification sweep, expo-file-system for recovery-
// snapshot/temporary-share cleanup, expo-secure-store for the keychain
// entry, expo-updates for the hard reload. App-only — the vitest suite
// exercises performReset() with a fake ResetEnv.
import { Directory, Paths } from 'expo-file-system';
import * as ExpoNotifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import { PASSPHRASE_KEY } from '../backup';
import { nativeBackupIo } from '../backup/nativeIo';
import type { ResetEnv } from './perform';

// Matches exactly the filenames writeShareFile() ever produces
// (src/backup/index.ts's exportNow) — scoped so this never touches cache
// files belonging to anything else.
const SHARE_FILE_PATTERN = /^thread-backup-.*\.json$/;

export const nativeResetEnv: ResetEnv = {
  async cancelAllNotifications() {
    await ExpoNotifications.cancelAllScheduledNotificationsAsync();
  },
  async clearRecoverySnapshots() {
    await nativeBackupIo.deleteRecoverySnapshots();
  },
  async clearTemporaryShareFiles() {
    const dir = new Directory(Paths.cache);
    if (!dir.exists) return;
    for (const entry of dir.list()) {
      if (SHARE_FILE_PATTERN.test(entry.name)) entry.delete();
    }
  },
  async clearBackupPassphrase() {
    await SecureStore.deleteItemAsync(PASSPHRASE_KEY);
  },
  async reloadApp() {
    await Updates.reloadAsync();
  },
};
