import { getRecentErrors } from '../errors';
import type { SqlDb } from '../log/db';
import { BUILD_SHA } from '../log/buildSha';
import { meta } from '../log/log';
import { schemaVersion } from '../log/schema';
import { getAmendmentLog, type AmendmentEntry } from './analysis/amendments';

const ITEM_CAP = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const EXTERNAL_GRACE_MS = 7 * DAY_MS;
const RECENT_ERROR_WINDOW_MS = 7 * DAY_MS;

export interface SupportItem {
  ts: number;
  /** An allowlisted code — the raw error message is discarded during classification and never reaches this. */
  code: string;
}

export interface SupportSummary {
  buildSha: string;
  schemaVersion: number;
  trialStart: string | null;
  watermark: string | null;
  invariantFailed: string | null;
  snapshotLastOk: number | null;
  snapshotAttentionNeeded: boolean;
  externalConfirmedAt: number | null;
  externalAttentionNeeded: boolean;
  /** True when any local error was logged within the last 7 days — one of Support's auto-open triggers. */
  recentErrorWithin7Days: boolean;
  /** At most 10, newest first. */
  items: SupportItem[];
  amendments: AmendmentEntry[];
}

function numOrNull(raw: string | null): number | null {
  return raw ? Number(raw) : null;
}

/** trial_start is a logical 'YYYY-MM-DD' date (OnboardingFlow.tsx), not epoch ms. */
function dateStringToEpochMs(raw: string | null): number | null {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Maps a raw local error message to one of a small fixed set of codes.
 * This is the entire privacy boundary: the original message is read here
 * and never returned or stored anywhere else — there is no "sanitize and
 * pass through" step for free-form text, because free-form text can
 * always contain something this function didn't anticipate (a verse, a
 * cue sentence, a partner name, a stray API key). Classifying to a fixed
 * allowlist instead makes leaking any of that structurally impossible,
 * not just unlikely.
 */
function classifyError(message: string): string {
  const m = message.toLowerCase();
  // Specific causes take priority: callers like App.tsx's "weekly recovery
  // snapshot failed: <cause>" always contain "snapshot", which would
  // otherwise mask a more useful disk/passphrase/network cause underneath.
  if (m.includes('passphrase')) return 'passphrase_unavailable';
  if (m.includes('disk') || m.includes('storage') || m.includes('space') || m.includes('quota')) {
    return 'storage_unavailable';
  }
  if (m.includes('network') || m.includes('fetch') || m.includes('timeout')) return 'network_unavailable';
  if (m.includes('restore')) return 'restore_failed';
  if (m.includes('snapshot')) return 'snapshot_failed';
  return 'unexpected_error';
}

/**
 * §20 "support with zero telemetry" — everything here stays on-device
 * until the reader explicitly copies it via formatDiagnosticsForSharing().
 * Raw errors stay in error_log (see src/errors) for the reader's own local
 * inspection; nothing here ever reads their free-form message back out.
 */
export function getSupportSummary(db: SqlDb, now: () => number = Date.now): SupportSummary {
  const snapshotLastOk = numOrNull(meta.get(db, 'recovery_snapshot_last_ok'));
  const snapshotLastError = meta.get(db, 'recovery_snapshot_last_error') || null;
  const externalConfirmedAt = numOrNull(meta.get(db, 'external_backup_confirmed_at'));
  const trialStart = meta.get(db, 'trial_start');
  const trialStartMs = dateStringToEpochMs(trialStart);

  const externalAttentionNeeded =
    externalConfirmedAt === null
      ? trialStartMs !== null && now() - trialStartMs > EXTERNAL_GRACE_MS
      : now() - externalConfirmedAt > 90 * DAY_MS;

  const recent = getRecentErrors(db, ITEM_CAP);

  return {
    buildSha: BUILD_SHA,
    schemaVersion: schemaVersion(db),
    trialStart,
    watermark: meta.get(db, 'watermark'),
    invariantFailed: meta.get(db, 'invariant_failed'),
    snapshotLastOk,
    snapshotAttentionNeeded: snapshotLastOk === null || snapshotLastError !== null,
    externalConfirmedAt,
    externalAttentionNeeded,
    recentErrorWithin7Days: recent.some((e) => now() - e.ts <= RECENT_ERROR_WINDOW_MS),
    items: recent.map((e) => ({ ts: e.ts, code: classifyError(e.message) })),
    amendments: getAmendmentLog(db),
  };
}

/**
 * True when Support should open automatically: an invariant failed, the
 * recovery snapshot currently fails, or a local error was logged within
 * the last 7 days.
 */
export function needsAttention(summary: SupportSummary): boolean {
  return summary.invariantFailed !== null || summary.snapshotAttentionNeeded || summary.recentErrorWithin7Days;
}

/**
 * The EXACT string Copy diagnostics places on the clipboard — also what
 * DiagnosticsSection previews before the reader taps Copy, so there is
 * never a gap between what is shown and what is actually shared.
 */
export function formatDiagnosticsForSharing(summary: SupportSummary): string {
  const lines: string[] = [
    'Nothing is sent automatically. This is only shared if you copy and send it yourself.',
    '',
    `build_sha: ${summary.buildSha}`,
    `schema_version: ${summary.schemaVersion}`,
    `trial_start: ${summary.trialStart ?? 'unset'}`,
    `watermark: ${summary.watermark ?? 'unset'}`,
    `invariant_failed: ${summary.invariantFailed ?? 'none'}`,
    `recovery_snapshot_last_ok: ${summary.snapshotLastOk ? new Date(summary.snapshotLastOk).toISOString() : 'never'}`,
    `external_backup_confirmed_at: ${summary.externalConfirmedAt ? new Date(summary.externalConfirmedAt).toISOString() : 'never'}`,
    '',
    'Recent local issues:',
  ];

  if (summary.items.length === 0) {
    lines.push('  (none)');
  } else {
    for (const item of summary.items) lines.push(`  ${new Date(item.ts).toISOString()} — ${item.code}`);
  }

  if (summary.amendments.length > 0) {
    lines.push('', 'Amendment log:');
    for (const a of summary.amendments.slice().reverse()) {
      lines.push(`  ${new Date(a.ts).toISOString().slice(0, 10)} — ${a.text}`);
    }
  }

  return lines.join('\n');
}
