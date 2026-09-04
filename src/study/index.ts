import { dictionaryAssets, dictionaryIndex, studyAssets } from './assets.generated';
import { BundledStudyProvider } from './provider';
import type { DictionaryArticle, DictionaryIndexEntry, StudyResource } from './types';

export type { DictionaryArticle, DictionaryIndexEntry, StudyResource, StudyReference, TermCue, VerseLookup } from './types';
export { STUDY_ATTRIBUTION } from './provider';

export function createStudyProvider(): BundledStudyProvider {
  const studyCache = new Map<string, StudyResource[]>();
  const dictionaryCache = new Map<string, DictionaryArticle[]>();
  const cached = <T>(cache: Map<string,T>, key:string, load:()=>T):T => {
    const existing=cache.get(key);
    if(existing!==undefined){cache.delete(key);cache.set(key,existing);return existing;}
    const value=load();cache.set(key,value);
    if(cache.size>3)cache.delete(cache.keys().next().value as string);
    return value;
  };
  return new BundledStudyProvider({
    studyLoader:(book) => cached(studyCache,book,()=>studyAssets[book]?.() ?? []),
    dictionaryLoader:(letter) => cached(dictionaryCache,letter,()=>dictionaryAssets[letter]?.() ?? []),
    index:dictionaryIndex as DictionaryIndexEntry[],
  });
}

export type StudyProvider = BundledStudyProvider;
