import type { Verse } from '../text/provider';
import type {
  DictionaryArticle,
  DictionaryIndexEntry,
  StudyReference,
  StudyResource,
  TermCue,
  VerseLookup,
} from './types';

export const STUDY_ATTRIBUTION =
  'Adapted from Tyndale Open Study Notes and Tyndale Open Bible Dictionary · CC BY-SA 4.0';

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function contains(ref: StudyReference, target: VerseLookup): boolean {
  if (ref.book !== target.book) return false;
  const point = target.chapter * 1000 + target.verse;
  return point >= ref.startChapter * 1000 + ref.startVerse && point <= ref.endChapter * 1000 + ref.endVerse;
}

function span(ref: StudyReference): number {
  return ref.endChapter * 1000 + ref.endVerse - (ref.startChapter * 1000 + ref.startVerse);
}

function typeRank(type: StudyResource['type']): number {
  if (type === 'StudyNote') return 0;
  if (type === 'ThemeNote') return 1;
  if (type === 'Profile') return 2;
  return 3;
}

interface CueCandidate {
  entry: DictionaryIndexEntry;
  alias: string;
  normalized: string;
}

interface LocatedCue extends CueCandidate {
  start: number;
  end: number;
}

const cueCache = new WeakMap<DictionaryIndexEntry[], CueCandidate[]>();

function cueCandidates(index: DictionaryIndexEntry[]): CueCandidate[] {
  const cached = cueCache.get(index);
  if (cached) return cached;
  const prepared = index
    .flatMap((entry) => entry.aliases.map((alias) => ({ entry, alias, normalized: normalizeSearch(alias) })))
    .filter((candidate) => candidate.normalized.length >= 3);
  cueCache.set(index, prepared);
  return prepared;
}

function normalizedWithOffsets(original: string): { value:string; offsets:number[] } {
  let value='';
  const offsets:number[]=[];
  for(let index=0;index<original.length;){
    const character=String.fromCodePoint(original.codePointAt(index) as number);
    const normalized=character.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en');
    if(/[a-z0-9]/.test(normalized)){
      for(const part of normalized){value+=part;offsets.push(index);}
    }else if(!/[’']/.test(character)&&value.at(-1)!==' '){value+=' ';offsets.push(index);}
    index+=character.length;
  }
  const start=value.search(/\S|$/); const end=value.trimEnd().length;
  return {value:value.slice(start,end),offsets:offsets.slice(start,end)};
}

/**
 * `haystack` is passed in because every candidate scans the SAME verse text:
 * normalising it per candidate meant ~7,900 redundant NFD passes per verse,
 * which on Hermes blocked the render thread for minutes and froze the launch
 * screen. Normalise once per verse, in cueTerms, and reuse it here.
 */
function locateCandidates(
  original: string,
  candidate: CueCandidate,
  haystack: { value: string; offsets: number[] } = normalizedWithOffsets(original),
): LocatedCue[] {
  const needle = candidate.normalized;
  const located: LocatedCue[] = [];
  let from = 0;
  while (from < haystack.value.length) {
    const normalizedStart = haystack.value.indexOf(needle, from);
    const start = normalizedStart < 0 ? -1 : haystack.offsets[normalizedStart];
    if (start < 0) break;
    const normalizedEnd=normalizedStart+needle.length;
    const before = normalizedStart === 0 ? ' ' : haystack.value[normalizedStart - 1];
    const after = normalizedEnd === haystack.value.length ? ' ' : haystack.value[normalizedEnd];
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) {
      const lastOriginalOffset=haystack.offsets[normalizedEnd-1];
      const lastCharacter=String.fromCodePoint(original.codePointAt(lastOriginalOffset) as number);
      located.push({ ...candidate, start, end:lastOriginalOffset+lastCharacter.length });
    }
    from = normalizedStart + 1;
  }
  return located;
}

export function cueTerms(verses: Verse[], index: DictionaryIndexEntry[], limit = 4): TermCue[] {
  const candidates = cueCandidates(index);
  const usedArticles = new Set<string>();
  const cues: TermCue[] = [];

  for (const verse of verses) {
    const haystack = normalizedWithOffsets(verse.text);
    const located = candidates
      .flatMap((candidate) => locateCandidates(verse.text, candidate, haystack))
      .sort(
        (a, b) =>
          a.start - b.start ||
          b.normalized.length - a.normalized.length ||
          a.entry.id.localeCompare(b.entry.id),
      );
    const occupied: Array<[number, number]> = [];

    for (const candidate of located) {
      if (usedArticles.has(candidate.entry.id)) continue;
      if (occupied.some(([start, end]) => candidate.start < end && candidate.end > start)) continue;
      occupied.push([candidate.start, candidate.end]);
      usedArticles.add(candidate.entry.id);
      cues.push({
        articleId: candidate.entry.id,
        title: candidate.entry.title,
        verse: verse.verse,
        start: candidate.start,
        end: candidate.end,
      });
      if (cues.length >= limit) return cues;
    }
  }
  return cues;
}

interface ProviderConfig {
  studyLoader: (book: string) => StudyResource[];
  dictionaryLoader: (letter: string) => DictionaryArticle[];
  index: DictionaryIndexEntry[];
}

export class BundledStudyProvider {
  constructor(private readonly cfg: ProviderConfig) {}

  resourcesForVerse(target: VerseLookup): StudyResource[] {
    return this.cfg
      .studyLoader(target.book)
      .filter(
        (resource) =>
          resource.type !== 'BookIntro' &&
          resource.type !== 'BookIntroSummary' &&
          (resource.lookupRefs ?? resource.refs).some((ref) => contains(ref, target)),
      )
      .sort((a, b) => {
        const refsA = a.lookupRefs ?? a.refs;
        const refsB = b.lookupRefs ?? b.refs;
        const exactA = refsA.some((ref) => contains(ref, target) && span(ref) === 0) ? -1 : 0;
        const exactB = refsB.some((ref) => contains(ref, target) && span(ref) === 0) ? -1 : 0;
        return (
          typeRank(a.type) - typeRank(b.type) ||
          exactA - exactB ||
          Math.min(...refsA.map(span)) - Math.min(...refsB.map(span)) ||
          a.sourceOrder - b.sourceOrder
        );
      });
  }

  bookResources(book: string): StudyResource[] {
    return this.cfg
      .studyLoader(book)
      .filter((resource) => resource.type === 'BookIntroSummary' || resource.type === 'BookIntro')
      .sort(
        (a, b) =>
          (a.type === 'BookIntroSummary' ? 0 : 1) - (b.type === 'BookIntroSummary' ? 0 : 1) ||
          a.sourceOrder - b.sourceOrder,
      );
  }

  search(query: string, limit = 30): DictionaryIndexEntry[] {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return [];

    const score = (entry: DictionaryIndexEntry): number => {
      const aliases = entry.normalizedAliases;
      if (entry.normalized === normalizedQuery) return 0;
      if (entry.normalized.startsWith(normalizedQuery)) return 1;
      if (aliases.some((alias) => alias === normalizedQuery)) return 2;
      if (aliases.some((alias) => alias.startsWith(normalizedQuery))) return 3;
      if (entry.normalized.includes(normalizedQuery)) return 4;
      return 99;
    };

    return this.cfg.index
      .map((entry) => ({ entry, score: score(entry) }))
      .filter((result) => result.score < 99)
      .sort(
        (a, b) =>
          a.score - b.score ||
          a.entry.normalized.localeCompare(b.entry.normalized) ||
          a.entry.id.localeCompare(b.entry.id),
      )
      .slice(0, limit)
      .map((result) => result.entry);
  }

  article(id: string): DictionaryArticle | null {
    const entry = this.cfg.index.find((candidate) => candidate.id === id);
    if (!entry) return null;
    return this.cfg.dictionaryLoader(entry.letter).find((article) => article.id === id) ?? null;
  }

  termsForVerses(verses: Verse[], limit = 4): TermCue[] {
    return cueTerms(verses, this.cfg.index, limit);
  }

  attribution(): string {
    return STUDY_ATTRIBUTION;
  }
}
