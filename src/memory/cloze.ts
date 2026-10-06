import { ladderStep, MAX_RUNG } from './ladder';

// Cloze cards (docs/plans/recall-cloze-ladder): hide some "key words"
// of a passage. Selection is deterministic — a local FNV-1a hash of the
// passage id and word index, never Math.random — and the ladder step is
// NOT part of the hash, so each step's hidden set contains the previous
// step's and the two rungs of a step hide the identical set.
// /src/memory must not import /src/lab, so the hash lives here.

export const STOP_WORDS: ReadonlySet<string> = new Set(
  (
    'a an the and or but nor so yet for of to in on at by with from into onto upon about as ' +
      'is am are was were be been being do does did done have has had having will would shall should ' +
      'may might can could must i me my mine we us our ours you your yours he him his she her hers it its they them their theirs ' +
      'this that these those who whom whose which what when where why how ' +
      'not no if then than there here also all any each every both some such very too only own just ' +
      'up out off over under again further once more most other ' +
      "don't doesn't didn't isn't aren't wasn't weren't won't wouldn't shouldn't couldn't can't cannot haven't hasn't hadn't " +
      "i'm you're he's she's it's we're they're i've you've we've they've i'll you'll he'll she'll we'll they'll i'd you'd he'd she'd we'd they'd that's there's let's"
  ).split(/\s+/),
);

export type ClozeToken =
  | { text: string; hidden: false }
  | { text: string; hidden: true; lead: string; word: string; trail: string; stub: string; width: number };

const PCT = [0, 0.2, 0.5, 0.85] as const; // index = ladderStep

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function split(token: string): { lead: string; word: string; trail: string } {
  const m = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/su.exec(token);
  return { lead: m?.[1] ?? '', word: m?.[2] ?? '', trail: m?.[3] ?? '' };
}

function isKey(word: string): boolean {
  if (word.length <= 2) return false;
  return !STOP_WORDS.has(word.toLowerCase().replace(/[’‘]/g, "'"));
}

/** Indexes of words a cloze card may hide. */
export function keyWordIndexes(words: string[]): number[] {
  const out: number[] = [];
  words.forEach((w, i) => {
    if (isKey(split(w).word)) out.push(i);
  });
  return out;
}

/** The set of word indexes hidden at this rung; null = hide everything (rung 7) or no key words. */
export function hiddenIndexes(words: string[], rung: number, passageId: number): Set<number> | null {
  const r = Number.isFinite(rung) ? Math.min(MAX_RUNG, Math.max(1, Math.round(rung))) : 1;
  const step = ladderStep(r);
  if (step === 4) return null;
  const keys = keyWordIndexes(words);
  if (keys.length === 0) return null;
  const n = Math.min(keys.length, Math.max(1, Math.round(keys.length * PCT[step])));
  const ordered = keys
    .map((i) => ({ i, h: fnv1a(`${passageId}:${i}`) }))
    .sort((a, b) => a.h - b.h || a.i - b.i);
  return new Set(ordered.slice(0, n).map((o) => o.i));
}

/** Tokens for a cloze card; null when the whole passage should be hidden. */
export function toCloze(text: string, rung: number, passageId: number): ClozeToken[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const hidden = hiddenIndexes(words, rung, passageId);
  if (!hidden) return null;
  return words.map((w, i): ClozeToken => {
    if (!hidden.has(i)) return { text: w, hidden: false };
    const { lead, word, trail } = split(w);
    return { text: w, hidden: true, lead, word, trail, stub: word.charAt(0), width: word.length };
  });
}
