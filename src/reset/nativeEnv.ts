// Real wiring for ResetEnv (see perform.ts): expo-notifications for
// the scheduled-notification sweep, expo-secure-store for the keychain
// entry, expo-updates for the hard reload. App-only — the vitest suite
// exercises performReset() with a fake ResetEnv.
import * as ExpoNotifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import { PASSPHRASE_KEY } from '../backup';
import type { ResetEnv } from './perform';

export const nativeResetEnv: ResetEnv = {
  async cancelAllNotifications() {
    await ExpoNotifications.cancelAllScheduledNotificationsAsync();
  },
  async clearBackupPassphrase() {
    await SecureStore.deleteItemAsync(PASSPHRASE_KEY);
  },
  async reloadApp() {
    await Updates.reloadAsync();
  },
};
