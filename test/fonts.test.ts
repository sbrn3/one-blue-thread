import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tokens } from '../src/ui/tokens';

const ROOT = join(__dirname, '..');
const APP = readFileSync(join(ROOT, 'App.tsx'), 'utf8');

const FILES: Record<string, string> = {
  'Schibsted Grotesk': 'SchibstedGrotesk.ttf',
  Newsreader: 'Newsreader.ttf',
  'JetBrains Mono': 'JetBrainsMono.ttf',
};

/**
 * Android logs `Build font failed ... Failed to read font contents` and falls
 * back silently when a fontFamily names a font that was never bundled, so the
 * app renders in the wrong typeface with nothing failing anywhere. Tie the
 * three token families to real files, and to the useFonts keys registering
 * them — Android resolves by exact name, so a typo is the same as missing.
 */
describe('every token font family is actually bundled', () => {
  it.each(Object.values(tokens.font))('%s resolves to a bundled file', (family) => {
    const file = FILES[family];
    expect(file, `no font file mapped for "${family}"`).toBeTruthy();
    const path = join(ROOT, 'assets', 'fonts', file);
    expect(existsSync(path), `${file} missing from assets/fonts`).toBe(true);
    expect(statSync(path).size).toBeGreaterThan(50_000);
  });

  it.each(Object.values(tokens.font))('%s is registered with useFonts under that exact name', (family) => {
    const registered =
      APP.includes(`'${family}':`) || APP.includes(`"${family}":`) || APP.includes(`${family}:`);
    expect(registered, `${family} is not a useFonts key in App.tsx`).toBe(true);
  });

  it('registers exactly the families the tokens declare', () => {
    expect(Object.keys(FILES).sort()).toEqual(Object.values(tokens.font).sort());
  });
});
