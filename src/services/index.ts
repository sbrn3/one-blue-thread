import * as ExpoNotifications from 'expo-notifications';
import { Backup } from '../backup';
import { expoCrypto } from '../backup/expoAdapter';
import { nativeBackupIo } from '../backup/nativeIo';
import { CueService } from '../cue';
import { BUILD_SHA } from '../log/buildSha';
import type { SqlDb } from '../log/db';
import { openAppDb } from '../log/expoDb';
import { Log, meta } from '../log/log';
import { migrate } from '../log/schema';
import { Memory } from '../memory/memory';
import { Notifier } from '../notify';
import { PartnerService } from '../partner';
import { nativePartnerIo } from '../partner/nativeIo';
import { createTextProvider, type TextProvider } from '../text';
import { createStudyProvider, type StudyProvider } from '../study';
import { migrateLegacyProviderKey, TranslationService } from '../text/translationService';

export interface Services {
  db: SqlDb;
  log: Log;
  text: TextProvider;
  translation: TranslationService;
  study: StudyProvider;
  cue: CueService;
  memory: Memory;
  notifier: Notifier;
  backup: Backup;
  partner: PartnerService;
}

/** Opens the one SQLite connection the app uses for its whole lifetime, migrated to latest. */
export function openDb(): SqlDb {
  const db = openAppDb();
  migrate(db);
  return db;
}

/**
 * The rest of the app-lifetime instances, built from an already-open
 * db. Split from openDb() because the text provider depends on
 * meta['text_provider'] and the per-provider keys — written by onboarding or the knot
 * — so this can't run until onboarding has had a chance to set them
 * (App.tsx calls this only once onboarding is confirmed complete).
 */
export function createServices(db: SqlDb): Services {
  const log = new Log({ db, buildSha: BUILD_SHA });
  migrateLegacyProviderKey(db); // carries an existing install's key forward, once
  const translation = new TranslationService(db, log);
  const activeProvider = translation.current();
  const text = createTextProvider({
    db,
    provider: activeProvider,
    apiKey: activeProvider ? translation.keyFor(activeProvider) : null,
  });
  const study = createStudyProvider();
  const cue = new CueService(db, log);
  const memory = new Memory(db, log);
  const notifier = new Notifier(db, ExpoNotifications);
  const backup = new Backup(db, expoCrypto, nativeBackupIo);
  const partner = new PartnerService(db, log, nativePartnerIo);
  return { db, log, text, translation, study, cue, memory, notifier, backup, partner };
}
