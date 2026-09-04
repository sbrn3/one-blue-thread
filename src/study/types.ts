export type StudyResourceType = 'StudyNote' | 'ThemeNote' | 'Profile' | 'BookIntroSummary' | 'BookIntro';

export interface StudyReference {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}

export type ResourceInline =
  | string
  | { t:'em'; v:string }
  | { t:'ref'; v:string; r:string }
  | { t:'link'; v:string; id:string };

export interface ResourceBlock {
  t: 'p' | 'h' | 'li' | 'omit';
  c: ResourceInline[];
}

export interface StudyResource {
  id: string;
  type: StudyResourceType;
  title: string;
  refs: StudyReference[];
  lookupRefs?: StudyReference[];
  versificationNote?: string;
  content: ResourceBlock[];
  sourceOrder: number;
}

export interface DictionaryArticle {
  id: string;
  title: string;
  aliases: string[];
  content: ResourceBlock[];
}

export interface DictionaryIndexEntry {
  id: string;
  title: string;
  aliases: string[];
  normalized: string;
  normalizedAliases: string[];
  letter: string;
}

export interface VerseLookup { book:string; chapter:number; verse:number }
export interface TermCue { articleId:string; title:string; verse:number; start:number; end:number }
