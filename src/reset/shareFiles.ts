// Exact filenames created by Backup.exportNow(), including the legacy public
// name. Reset uses this narrow predicate so it never deletes another app's
// cache file or an unrelated JSON document.
const APP_SHARE_FILE = /^(?:thread|one-blue-thread)-backup-\d{4}-\d{2}-\d{2}\.json$/;

export function isAppShareFilename(name: string): boolean {
  return APP_SHARE_FILE.test(name);
}
