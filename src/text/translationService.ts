import type { SqlDb } from '../log/db';
import type { Log } from '../log/log';
import { meta } from '../log/log';
import { resolveNivBibleId } from './apiBible';
import { probeEsvKey } from './esv';

export type Provider = 'niv' | 'esv';

export interface ValidatedKey {
  /** Only set for NIV — the resolved bible id, ready to cache immediately. */
  nivBibleId?: string;
}

/**
 * §04/§19 knot control — owns the reader's translation choice the same
 * way CueService (src/cue/index.ts) owns the cue: reads/writes meta,
 * and is the one place that decides when a translation_changed
 * confound (§13) is logged. validate() never touches chapter_cache —
 * a cached chapter would let a revoked/rotated key "pass" with no live
 * network call at all, defeating the point of validating before save
 * (docs/plans/knot-translation-switch).
 */
export class TranslationService {
  constructor(
    private readonly db: SqlDb,
    private readonly log: Log,
  ) {}

  /** Normalizes meta's raw string (absent key, or '' meaning "cleared") to null — null means the bundled WEB. */
  current(): Provider | null {
    const raw = meta.get(this.db, 'text_provider');
    return raw === 'niv' || raw === 'esv' ? raw : null;
  }

  /** The stored key for a provider, so the knot can pre-fill it on re-selection rather than asking the reader to retype it. */
  keyFor(provider: Provider): string | null {
    return meta.get(this.db, `text_provider_key_${provider}`) || null;
  }

  /**
   * Live round-trip proving the key actually authenticates, before
   * anything is saved. Throws with a message fit to show the reader.
   */
  async validate(provider: Provider, apiKey: string, fetchFn: typeof fetch = fetch): Promise<ValidatedKey> {
    if (provider === 'niv') return { nivBibleId: await resolveNivBibleId(apiKey, fetchFn) };
    await probeEsvKey(apiKey, fetchFn);
    return {};
  }

  /**
   * Persists an already-validated provider + key as the active
   * translation. Never call this without a preceding validate() —
   * same division of responsibility BackupSection already uses for
   * its passphrase form (validate, then save; never the reverse).
   */
  set(provider: Provider, apiKey: string, validated: ValidatedKey): void {
    const previous = this.current();
    meta.set(this.db, `text_provider_key_${provider}`, apiKey);
    meta.set(this.db, 'text_provider', provider);
    // A replaced NIV key can resolve to a different bible id — cache
    // the id validate() just resolved, so ApiBibleProvider never reads
    // a stale one left over from the previous key.
    if (provider === 'niv') meta.set(this.db, 'niv_bible_id', validated.nivBibleId ?? '');
    // Restart today's portion at sitting 1 rather than clamping into
    // it: sittings are derived from per-translation verse counts, so
    // clamping into whatever index the OLD translation left behind can
    // skip verses the reader never saw. Re-reading is the safe
    // failure; skipping is not.
    meta.set(this.db, 'current_sitting', '0');
    if (previous !== provider) this.log.write({ type: 'translation_changed' });
  }

  /** No key, no round-trip — the bundled WEB is always present, offline, by construction. Stored keys are kept. */
  setOffline(): void {
    const previous = this.current();
    meta.set(this.db, 'text_provider', '');
    meta.set(this.db, 'current_sitting', '0');
    if (previous !== null) this.log.write({ type: 'translation_changed' });
  }
}

/**
 * One-time carry-forward for an install that chose a translation
 * before this file existed: the single legacy `text_provider_key`
 * meta row becomes `text_provider_key_<provider>`, so an existing
 * reader's key survives the upgrade instead of silently reverting to
 * WEB. Additive and idempotent — safe to call on every app open.
 *
 * Always clears the legacy row once it has been read, whether or not
 * a copy actually happened — a stale, possibly-revoked copy must not
 * survive indefinitely in `meta` (and every future unencrypted backup)
 * once it is superseded.
 */
export function migrateLegacyProviderKey(db: SqlDb): void {
  const provider = meta.get(db, 'text_provider');
  const legacy = meta.get(db, 'text_provider_key');
  if (!legacy) return;
  if (provider === 'niv' || provider === 'esv') {
    const perProviderKey = `text_provider_key_${provider}`;
    if (!meta.get(db, perProviderKey)) meta.set(db, perProviderKey, legacy);
  }
  meta.set(db, 'text_provider_key', '');
}
