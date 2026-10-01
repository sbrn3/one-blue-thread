import { describe, expect, it } from 'vitest';
import { migrate } from '../src/log/schema';
import { Log, meta } from '../src/log/log';
import { migrateLegacyProviderKey, TranslationService } from '../src/text/translationService';
import { openTestDb } from './util/testDb';

function setup() {
  const db = openTestDb();
  migrate(db);
  const log = new Log({ db, buildSha: 'test' });
  return { db, log, translation: new TranslationService(db, log) };
}

const nivFetch = (async () => ({
  ok: true,
  json: async () => ({ data: [{ id: 'niv-uuid', abbreviation: 'NIV' }] }),
})) as unknown as typeof fetch;
const esvFetch = (async () => ({ ok: true, json: async () => ({ passages: ['[1] x'] }) })) as unknown as typeof fetch;

describe('TranslationService', () => {
  it('current() is null when nothing is set, and after setOffline()', () => {
    const { translation } = setup();
    expect(translation.current()).toBeNull();
    translation.setOffline();
    expect(translation.current()).toBeNull();
  });

  it('set() persists the provider and per-provider key, and keyFor() reads it back', async () => {
    const { db, translation } = setup();
    const validated = await translation.validate('niv', 'key-a', nivFetch);
    translation.set('niv', 'key-a', validated);
    expect(translation.current()).toBe('niv');
    expect(translation.keyFor('niv')).toBe('key-a');
    expect(meta.get(db, 'niv_bible_id')).toBe('niv-uuid');
  });

  it("switching providers keeps the old provider's key retrievable", async () => {
    const { translation } = setup();
    translation.set('niv', 'niv-key', await translation.validate('niv', 'niv-key', nivFetch));
    translation.set('esv', 'esv-key', await translation.validate('esv', 'esv-key', esvFetch));
    expect(translation.current()).toBe('esv');
    expect(translation.keyFor('niv')).toBe('niv-key');
    expect(translation.keyFor('esv')).toBe('esv-key');
  });

  it('logs translation_changed only when the provider actually changes', async () => {
    const { db, translation } = setup();
    translation.set('niv', 'k', await translation.validate('niv', 'k', nivFetch));
    translation.set('niv', 'k', await translation.validate('niv', 'k', nivFetch)); // re-save, same provider
    const events = db.all<{ type: string }>('SELECT type FROM events');
    expect(events.filter((e) => e.type === 'translation_changed')).toHaveLength(1);
  });

  it('switching back to the bundled text is logged too, and keeps the stored keys', async () => {
    const { db, translation } = setup();
    translation.set('niv', 'k', await translation.validate('niv', 'k', nivFetch));
    translation.setOffline();
    const events = db.all<{ type: string }>('SELECT type FROM events');
    expect(events.filter((e) => e.type === 'translation_changed')).toHaveLength(2);
    expect(translation.keyFor('niv')).toBe('k');
  });

  it('resets current_sitting to 0 on switch', () => {
    const { db, translation } = setup();
    meta.set(db, 'current_sitting', '2');
    meta.set(db, 'text_provider', 'niv');
    translation.setOffline();
    expect(meta.get(db, 'current_sitting')).toBe('0');
  });

  it('validate() rejects a bad key without saving anything', async () => {
    const { translation } = setup();
    const badFetch = (async () => ({ ok: false, status: 401, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(translation.validate('niv', 'bad', badFetch)).rejects.toThrow();
    expect(translation.current()).toBeNull();
  });
});

describe('migrateLegacyProviderKey', () => {
  it('copies the legacy single key forward to the per-provider slot, and clears the legacy row', () => {
    const db = openTestDb();
    migrate(db);
    meta.set(db, 'text_provider', 'niv');
    meta.set(db, 'text_provider_key', 'old-key');
    migrateLegacyProviderKey(db);
    expect(meta.get(db, 'text_provider_key_niv')).toBe('old-key');
    expect(meta.get(db, 'text_provider_key')).toBe('');
  });

  it('does not overwrite an existing per-provider key, but still clears the legacy row', () => {
    const db = openTestDb();
    migrate(db);
    meta.set(db, 'text_provider', 'niv');
    meta.set(db, 'text_provider_key', 'old-key');
    meta.set(db, 'text_provider_key_niv', 'already-migrated');
    migrateLegacyProviderKey(db);
    expect(meta.get(db, 'text_provider_key_niv')).toBe('already-migrated');
    expect(meta.get(db, 'text_provider_key')).toBe('');
  });

  it('is a no-op when no legacy key exists', () => {
    const db = openTestDb();
    migrate(db);
    meta.set(db, 'text_provider', 'niv');
    meta.set(db, 'text_provider_key_niv', 'onboarding-key');
    migrateLegacyProviderKey(db);
    expect(meta.get(db, 'text_provider_key_niv')).toBe('onboarding-key');
    expect(meta.get(db, 'text_provider_key')).toBeNull();
  });
});
