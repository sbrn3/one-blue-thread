import { describe, expect, it } from 'vitest';
import { scriptureFitsOnScreen } from '../src/flow/readingProgress';

// A short sitting on a tall screen never scrolls; the seal must still unlock.
describe('scriptureFitsOnScreen', () => {
  it('is true when the Scripture ends inside the first viewport', () => {
    expect(scriptureFitsOnScreen(1400, 2480)).toBe(true);
    expect(scriptureFitsOnScreen(2480, 2480)).toBe(true);
  });

  it('is false when reading the Scripture needs a scroll', () => {
    expect(scriptureFitsOnScreen(5200, 2480)).toBe(false);
  });

  it('is false before layout (zero heights)', () => {
    expect(scriptureFitsOnScreen(0, 2480)).toBe(false);
    expect(scriptureFitsOnScreen(1400, 0)).toBe(false);
  });
});
