import { describe, expect, it } from 'vitest';
import { allOverviewUrls, overviewsFor } from '../src/study/overviews';
import { CANON } from '../src/text/canon';

const TWO_PART = ['genesis', 'exodus', 'isaiah', 'ezekiel', 'matthew', 'luke', 'john', 'acts', 'romans', 'revelation'];
const SHARED: Record<string, string[]> = {
  '1 & 2 Kings': ['1kings', '2kings'],
  '1 & 2 Chronicles': ['1chronicles', '2chronicles'],
  'Ezra–Nehemiah': ['ezra', 'nehemiah'],
  '1–3 John': ['1john', '2john', '3john'],
};

describe('BibleProject overviews (docs/plans/bibleproject-book-videos)', () => {
  it('every book in the canon has at least one overview', () => {
    for (const b of CANON) expect(overviewsFor(b.id).length, b.id).toBeGreaterThan(0);
  });

  it('every URL is a bibleproject.com/videos page', () => {
    for (const url of allOverviewUrls()) expect(url).toMatch(/^https:\/\/bibleproject\.com\/videos\/[a-z0-9-]+\/$/);
  });

  it('two-part books have exactly Part 1 then Part 2, on different pages', () => {
    for (const id of TWO_PART) {
      const o = overviewsFor(id);
      expect(o.map((x) => x.part), id).toEqual([1, 2]);
      expect(o[0].url).not.toBe(o[1].url);
    }
  });

  it('every other book has one overview with no part', () => {
    for (const b of CANON.filter((x) => !TWO_PART.includes(x.id))) {
      const o = overviewsFor(b.id);
      expect(o, b.id).toHaveLength(1);
      expect(o[0].part).toBeNull();
    }
  });

  it('books sharing a video get the same URL, labelled with the joint title', () => {
    for (const [title, ids] of Object.entries(SHARED)) {
      const urls = new Set(ids.map((id) => overviewsFor(id)[0].url));
      expect(urls.size, title).toBe(1);
      for (const id of ids) expect(overviewsFor(id)[0].covers).toBe(title);
    }
  });

  it('no other book claims a joint title', () => {
    const shared = new Set(Object.values(SHARED).flat());
    for (const b of CANON.filter((x) => !shared.has(x.id))) {
      for (const o of overviewsFor(b.id)) expect(o.covers, b.id).toBeNull();
    }
  });

  it('an unknown book has none', () => {
    expect(overviewsFor('nope')).toEqual([]);
  });
});
