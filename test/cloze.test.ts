import { describe, expect, it } from 'vitest';
import { hiddenIndexes, keyWordIndexes, STOP_WORDS, toCloze } from '../src/memory/cloze';

const JOHN =
  'For God so loved the world, that he gave his only Son, that whoever believes in him shall not perish but have eternal life. ' +
  'For God did not send his Son into the world to condemn the world, but that the world might be saved through him.';
const words = JOHN.split(/\s+/);

const hiddenAt = (rung: number, id = 7) => [...(hiddenIndexes(words, rung, id) ?? [])].sort((a, b) => a - b);

describe('cloze engine', () => {
  it('never hides stop words', () => {
    const keys = keyWordIndexes(words).map((i) => words[i].replace(/[^\p{L}]/gu, '').toLowerCase());
    for (const k of keys) expect(STOP_WORDS.has(k)).toBe(false);
    expect(keys).toContain('loved');
    expect(keys).not.toContain('the');
  });

  it('handles curly-apostrophe contractions and surrounding punctuation', () => {
    const w = ['“Didn’t', 'he', '—', 'rejoice,”', 'Moses', '(said)'];
    expect(keyWordIndexes(w)).toEqual([3, 4, 5]);
  });

  it('rungs 1 and 2 hide the identical set; later steps nest', () => {
    expect(hiddenAt(1)).toEqual(hiddenAt(2));
    expect(hiddenAt(3)).toEqual(hiddenAt(4));
    expect(hiddenAt(5)).toEqual(hiddenAt(6));
    for (const [a, b] of [
      [1, 3],
      [3, 5],
    ] as const) {
      const small = hiddenAt(a);
      for (const i of small) expect(hiddenAt(b)).toContain(i);
      expect(hiddenAt(b).length).toBeGreaterThan(small.length);
    }
  });

  it('rung 7 (and out-of-range rungs above it) hides the whole passage', () => {
    expect(toCloze(JOHN, 7, 1)).toBeNull();
    expect(toCloze(JOHN, 40, 1)).toBeNull();
    expect(toCloze(JOHN, -5, 1)).not.toBeNull(); // clamps to 1
  });

  it('is deterministic and varies with the passage id', () => {
    expect(hiddenAt(3, 7)).toEqual(hiddenAt(3, 7));
    expect(hiddenAt(3, 7)).not.toEqual(hiddenAt(3, 8));
  });

  it('hides at least one word even in a one-verse passage', () => {
    const t = toCloze('Jesus wept.', 1, 3)!;
    expect(t.filter((x) => x.hidden)).toHaveLength(1);
  });

  it('returns null when there are no key words', () => {
    expect(toCloze('It is as he is.', 1, 1)).toBeNull();
    expect(toCloze('   ', 1, 1)).toBeNull();
  });

  it('reconstructs the text with punctuation and spacing preserved', () => {
    const tokens = toCloze(JOHN, 3, 5)!;
    expect(tokens.map((t) => t.text).join(' ')).toBe(JOHN);
    for (const t of tokens) {
      if (t.hidden) {
        expect(t.lead + t.word + t.trail).toBe(t.text);
        expect(t.stub).toBe(t.word.charAt(0));
        expect(t.width).toBe(t.word.length);
      }
    }
  });

  it('strips quotes and dashes before matching and for the stub letter', () => {
    const t = toCloze('“Behold mercy”', 1, 1)!;
    const h = t.filter((x) => x.hidden);
    expect(h).toHaveLength(1);
    if (h[0].hidden) expect(h[0].lead + h[0].stub).toMatch(/^(“B|“?M|M|B)/);
  });
});
