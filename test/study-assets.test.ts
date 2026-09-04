import { describe, expect, it } from 'vitest';
import manifest from '../assets/tyndale/manifest.json';
import index from '../assets/tyndale/dictionary-index.json';
import { dictionaryAssets, studyAssets } from '../src/study/assets.generated';
import { createStudyProvider } from '../src/study';

describe('generated Tyndale assets', () => {
  it('contains every canonical book and the reviewed source releases', () => {
    expect(Object.keys(studyAssets)).toHaveLength(66);
    expect(manifest.source.notes.release).toBe('1.25');
    expect(manifest.source.dictionary.release).toBe('1.6');
    expect(manifest.counts).toEqual({ resources:17477, articles:6010 });
  });

  it('resolves every dictionary index id exactly once', () => {
    const ids = new Set<string>();
    for (const load of Object.values(dictionaryAssets)) for (const article of load()) ids.add(article.id);
    expect(ids.size).toBe(manifest.counts.articles);
    expect(index.every((entry) => ids.has(entry.id))).toBe(true);
  });

  it('derives no more than four exact cues from a representative sitting', () => {
    const study=createStudyProvider();
    const cues=study.termsForVerses([{book:'philippians',chapter:1,verse:3,text:'I thank my God whenever I remember you, always praying with joy.'}],4);
    expect(cues.length).toBeLessThanOrEqual(4);
    expect(cues.every((cue)=>cue.start>=0&&cue.end>cue.start)).toBe(true);
  });
});
