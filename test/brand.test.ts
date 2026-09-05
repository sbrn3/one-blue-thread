import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DISPLAY_NAME } from '../src/brand';
import { ORIGIN_PASSAGE } from '../src/brand/origin';

// The brand passage must come from the same bundled text the reader uses.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WEB = require('../assets/bible/web.json') as {
  translation: string;
  books: Record<string, Array<Array<{ v: number; t: string }>>>;
};

describe('One Blue Thread brand contract', () => {
  it('uses the exact public display name', () => {
    expect(DISPLAY_NAME).toBe('One Blue Thread');
  });

  it('carries the complete Numbers 15:37–41 passage from the bundled WEB source', () => {
    const source = WEB.books.numbers[14].filter(({ v }) => v >= 37 && v <= 41);

    expect(ORIGIN_PASSAGE.reference).toBe('Numbers 15:37–41');
    expect(ORIGIN_PASSAGE.translation).toBe('World English Bible (WEB)');
    expect(ORIGIN_PASSAGE.provenance).toBe('bundled');
    expect(ORIGIN_PASSAGE.attribution).toContain('Public Domain');
    expect(ORIGIN_PASSAGE.verses).toEqual(source.map(({ v, t }) => ({ verse: v, text: t })));
    expect(ORIGIN_PASSAGE.verses.map(({ verse }) => verse)).toEqual([37, 38, 39, 40, 41]);
  });

  it('publishes the same complete passage on the canonical marketing surface', () => {
    const site = readFileSync(join(__dirname, '..', 'docs', 'index.html'), 'utf8');

    expect(site).toContain('Numbers 15:37–41');
    for (const { verse, text } of ORIGIN_PASSAGE.verses) {
      expect(site).toContain(`<span class="vn">${verse}</span>${text}`);
    }
    expect(site).toContain(ORIGIN_PASSAGE.attribution);
    expect(site).not.toMatch(/Numbers 15:(?!37[–-]41)\d/);
  });

  it('renames only the public app identity and preserves Android upgrade compatibility', () => {
    const app = JSON.parse(readFileSync(join(__dirname, '..', 'app.json'), 'utf8')) as {
      expo: { name: string; slug: string; android: { package: string } };
    };

    expect(app.expo.name).toBe(DISPLAY_NAME);
    expect(app.expo.slug).toBe('thread');
    expect(app.expo.android.package).toBe('com.sngugi.thread');
  });
});
