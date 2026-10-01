export const ISSUES_URL = 'https://github.com/sbrn3/one-blue-thread/issues/new';

/**
 * The "Report a problem" link. Carries the app version and nothing else —
 * never reading history, the cue, partner, keys or diagnostics (AGENTS.md
 * privacy). The reader writes the rest in their own browser.
 */
export function issueUrl(appVersion?: string): string {
  if (!appVersion) return ISSUES_URL;
  const body = `App version: ${appVersion}\n\nWhat happened:\n`;
  return `${ISSUES_URL}?body=${encodeURIComponent(body)}`;
}
