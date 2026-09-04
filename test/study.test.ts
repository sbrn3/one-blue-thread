import { describe, expect, it } from 'vitest';
import { BundledStudyProvider, cueTerms } from '../src/study/provider';
import type { DictionaryIndexEntry, StudyResource } from '../src/study/types';

const resources: StudyResource[] = [
  { id:'wide', type:'StudyNote', title:'Wide', content:[{t:'p',c:['Wide note']}], sourceOrder:0, refs:[{book:'philippians',startChapter:1,startVerse:1,endChapter:1,endVerse:11}] },
  { id:'exact', type:'StudyNote', title:'Exact', content:[{t:'p',c:['Exact note']}], sourceOrder:1, refs:[{book:'philippians',startChapter:1,startVerse:3,endChapter:1,endVerse:3}] },
  { id:'theme', type:'ThemeNote', title:'Prayer', content:[{t:'p',c:['Theme']}], sourceOrder:2, refs:[{book:'philippians',startChapter:1,startVerse:3,endChapter:1,endVerse:11}] },
];
const index: DictionaryIndexEntry[] = [
  { id:'Prayer', title:'Prayer', aliases:['Prayer'], normalized:'prayer', normalizedAliases:['prayer'], letter:'P' },
  { id:'PrayerOfJesus', title:'Prayer of Jesus', aliases:['Prayer of Jesus'], normalized:'prayer of jesus', normalizedAliases:['prayer of jesus'], letter:'P' },
];
const provider = new BundledStudyProvider({ studyLoader:() => resources, dictionaryLoader:() => [], index });

describe('BundledStudyProvider', () => {
  it('orders exact notes before wider notes and typed resources', () => {
    expect(provider.resourcesForVerse({book:'philippians',chapter:1,verse:3}).map((x) => x.id)).toEqual(['exact','wide','theme']);
  });

  it('ranks dictionary title and alias matches deterministically', () => {
    expect(provider.search('prayer').map((x) => x.id)).toEqual(['Prayer','PrayerOfJesus']);
  });

  it('finds longest exact cue phrases once and caps the sitting', () => {
    const terms = cueTerms([{book:'philippians',chapter:1,verse:3,text:'Prayer of Jesus and prayer bring joy.'}], index, 4);
    expect(terms).toEqual([
      { articleId:'PrayerOfJesus', title:'Prayer of Jesus', verse:3, start:0, end:15 },
      { articleId:'Prayer', title:'Prayer', verse:3, start:20, end:26 },
    ]);
  });

  it('matches normalized Unicode text while returning original string offsets', () => {
    const unicodeIndex=[{id:'EliesHope',title:'Elies Hope',aliases:["Elie's Hope"],normalized:'elies hope',normalizedAliases:['elies hope'],letter:'E'}];
    expect(cueTerms([{book:'x',chapter:1,verse:1,text:'Élie’s Hope remains.'}],unicodeIndex)).toEqual([
      {articleId:'EliesHope',title:'Elies Hope',verse:1,start:0,end:11},
    ]);
  });
});
