/**
 * "What's new" release notes, bundled in the binary. The native version is
 * always 1.0.0 and BUILD_SHA changes every build, so this list — keyed by
 * release tag — is the only version source the card needs.
 *
 * Newest first. A tag that changes anything a reader can notice adds one
 * entry: 1–3 plain operational lines, each ≤120 characters (AGENTS.md).
 */

export interface Release {
  /** The release tag, `vX.Y.Z`. */
  id: string;
  lines: string[];
}

export const RELEASES: readonly Release[] = [
  {
    id: 'v0.10.0',
    lines: [
      'After an update, a short note like this one says what changed.',
      "Every note stays in the knot, under More › About › What's new.",
    ],
  },
];

/** `meta` key holding the newest release id the reader has dismissed or was onboarded at. */
export const WHATS_NEW_SEEN_KEY = 'whats_new_seen';

export function latestReleaseId(releases: readonly Release[]): string | null {
  return releases[0]?.id ?? null;
}

/**
 * The releases the reader hasn't seen, newest first. No marker means the
 * reader upgraded from a build before this feature (onboarding sets it), so
 * they get the newest note only, not a backlog; an unknown marker is treated
 * the same way.
 */
export function unseenReleases(releases: readonly Release[], seenId: string | null): Release[] {
  if (releases.length === 0) return [];
  const seenAt = seenId === null ? -1 : releases.findIndex((r) => r.id === seenId);
  if (seenAt === -1) return [releases[0]];
  return releases.slice(0, seenAt);
}
