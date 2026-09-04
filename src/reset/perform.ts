import type { SqlDb } from '../log/db';
import { resetToFirstRun } from './index';

/**
 * The parts of a reset that live outside SQLite. Injected as a seam so
 * the ordering logic in performReset() is testable without loading
 * expo-notifications / expo-updates / the OS keychain. Real wiring:
 * src/reset/nativeEnv.ts.
 */
export interface ResetEnv {
  /** Drop every OS-scheduled notification this app owns. */
  cancelAllNotifications(): Promise<void>;
  /** Delete the backup passphrase from the OS keychain. */
  clearBackupPassphrase(): Promise<void>;
  /** Fully reload the JS bundle so every store and service is rebuilt. */
  reloadApp(): Promise<void>;
}

/**
 * §20 "a clean start" — wipe the app back to first-run state. Native
 * side first (so nothing outside the db is left pointing at deleted
 * data), then the db, then a hard reload. reloadApp() does not return.
 *
 * `onWiped` fires the moment the database is actually empty. The caller
 * needs this to tell two failures apart: one before the wipe leaves
 * everything intact and can simply return to the sheet, while one after
 * it has already destroyed the data — the app must not carry on with
 * stores still holding deleted rows.
 */
export async function performReset(
  db: SqlDb,
  env: ResetEnv,
  onWiped?: () => void,
): Promise<void> {
  await env.cancelAllNotifications();
  await env.clearBackupPassphrase();
  resetToFirstRun(db);
  onWiped?.();
  await env.reloadApp();
}
