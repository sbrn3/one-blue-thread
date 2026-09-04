import { describe, expect, it } from 'vitest';
import { normalizeSearch, parseDictionaryXml, parseReference, parseStudyXml } from '../scripts/lib/tyndale-transform.mjs';

describe('Tyndale resource transform', () => {
  it('parses same- and cross-chapter source references without using memory ranges', () => {
    expect(parseReference('Phil.1.3-11')).toEqual([{ book:'philippians', startChapter:1, startVerse:3, endChapter:1, endVerse:11 }]);
    expect(parseReference('Gen.1.1-2.3')).toEqual([{ book:'genesis', startChapter:1, startVerse:1, endChapter:2, endVerse:3 }]);
  });

  it('extracts typed study prose and intentionally marks omitted supplements', () => {
    const xml = '<items><item name="Prayer" typename="ThemeNote"><title>Prayer</title><refs>Phil.1.3-11</refs><body><p>Pray with joy.</p><include_items src="x"/></body></item></items>';
    expect(parseStudyXml(xml, 'ThemeNote')[0]).toMatchObject({ type:'ThemeNote', title:'Prayer', content:[{t:'p',c:['Pray with joy.']},{t:'omit',c:['Supplement omitted from this text-first edition.']}] });
  });

  it('extracts dictionary aliases and normalizes diacritics/case', () => {
    const xml = '<items><item name="Messiah" typename="Article"><title>Messiah, Christ</title><body><p>Anointed one.</p></body></item></items>';
    expect(parseDictionaryXml(xml)[0].aliases).toEqual(['Messiah, Christ','Messiah','Christ']);
    expect(normalizeSearch('Élie’s Hope')).toBe('elies hope');
  });

  it('preserves inline emphasis, Scripture references, and dictionary links', () => {
    const xml='<items><item name="Hope" typename="Article"><title>Hope</title><body><p><em>Blessed</em> <a href="?bref=Rom.5.5">hope</a> and <a href="?item=Faith_Article_TyndaleOpenBibleDictionary">faith</a>.</p></body></item></items>';
    expect(parseDictionaryXml(xml)[0].content).toEqual([{t:'p',c:[{t:'em',v:'Blessed'},' ',{t:'ref',v:'hope',r:'Rom.5.5'},' and ',{t:'link',v:'faith',id:'Faith'},'.']}]);
  });
});
