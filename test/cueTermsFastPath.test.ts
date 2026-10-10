// The launch fix (docs/plans/reading-screen-and-motion, S01/F1): cue matching
// must give the same answers while skipping the per-alias and per-character
// Unicode work that cost ~10.7 s on Hermes during Flow's first render.
import { describe, expect, it } from 'vitest';
import { cueTerms, normalizedWithOffsets, normalizeSearch } from '../src/study/provider';
import type { DictionaryIndexEntry } from '../src/study/types';
import type { Verse } from '../src/text/provider';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WEB = require('../assets/bible/web.json') as { books: Record<string, Array<Array<{ v: number; t: string }>>> };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawIndex = require('../assets/tyndale/dictionary-index.json') as unknown;
const index = (Array.isArray(rawIndex) ? rawIndex : (rawIndex as { entries: unknown[] }).entries) as DictionaryIndexEntry[];

/** The implementation before the fast path, kept verbatim as the reference. */
function referenceOffsets(original: string): { value: string; offsets: number[] } {
  let value = '';
  const offsets: number[] = [];
  for (let i = 0; i < original.length; ) {
    const character = String.fromCodePoint(original.codePointAt(i) as number);
    const normalized = character.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('en');
    if (/[a-z0-9]/.test(normalized)) {
      for (const part of normalized) {
        value += part;
        offsets.push(i);
      }
    } else if (!/[’']/.test(character) && value.at(-1) !== ' ') {
      value += ' ';
      offsets.push(i);
    }
    i += character.length;
  }
  const start = value.search(/\S|$/);
  const end = value.trimEnd().length;
  return { value: value.slice(start, end), offsets: offsets.slice(start, end) };
}

describe('normalizedWithOffsets fast path', () => {
  it('matches the reference on every verse of several whole books', () => {
    for (const book of ['genesis', 'psalms', 'isaiah', 'john', 'romans', 'revelation']) {
      for (const chapter of WEB.books[book]) {
        for (const { t } of chapter) expect(normalizedWithOffsets(t)).toEqual(referenceOffsets(t));
      }
    }
  });

  it('matches the reference on accents, curly quotes, apostrophes, digits and emoji', () => {
    for (const s of [
      'Élie went to Zoan’s gate, 12 o\'clock — “Naïve” café!',
      "  Leading and trailing  'quotes'  ",
      'MiXeD CaSe 123 and 😀 emoji, Ægypt, Ångström',
      '',
      '’',
    ]) {
      expect(normalizedWithOffsets(s)).toEqual(referenceOffsets(s));
    }
  });
});

describe('cueTerms', () => {
  it('returns nothing for no verses without touching the index', () => {
    const exploding = new Proxy([] as DictionaryIndexEntry[], {
      get() {
        throw new Error('the index was read');
      },
    });
    expect(cueTerms([], exploding)).toEqual([]);
  });

  it('uses the build-time normalised aliases instead of re-normalising', () => {
    const entry: DictionaryIndexEntry = {
      id: 'x1',
      title: 'Odd',
      aliases: ['Something Else'],
      normalized: 'odd',
      normalizedAliases: ['lamp'], // deliberately not normalizeSearch('Something Else')
      letter: 'O',
    } as DictionaryIndexEntry;
    const verse: Verse = { book: 'psalms', chapter: 119, verse: 105, text: 'Your word is a lamp to my feet.' };
    expect(cueTerms([verse], [entry]).map((c) => c.articleId)).toEqual(['x1']);
  });

  it('every shipped index row was normalised exactly as normalizeSearch would', () => {
    for (const row of index) {
      row.aliases.forEach((alias, i) => expect(row.normalizedAliases[i], alias).toBe(normalizeSearch(alias)));
    }
  });
});
