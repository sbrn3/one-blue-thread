import { describe, expect, it } from 'vitest';
import { clothSize, geometry } from '../src/ui/loom';
import { boltHeight, clothWidthFor, seedZoneWidth, WEAVE_PAD_X } from '../src/flow/weaveLayout';

const days = (n: number) => Array.from({ length: n }, (_, i) => i % 3 !== 2);

describe('WeaveZone sizing before layout (S04, F4)', () => {
  it('seeds the zone from the window less the caller inset', () => {
    expect(seedZoneWidth(412, 30)).toBe(382);
    expect(seedZoneWidth(20, 48)).toBe(0);
  });

  it('draws the cloth inside the full zone padding, edge to edge when compact', () => {
    expect(clothWidthFor(382, false)).toBe(382 - WEAVE_PAD_X * 2);
    expect(clothWidthFor(364, true)).toBe(364);
  });

  it.each([1, 5, 16, 150])('reserves a positive, stable height for %i chapters', (chapters) => {
    const sealed = days(chapters);
    const a = boltHeight(382, false, chapters, sealed);
    expect(a).toBeGreaterThan(0);
    expect(boltHeight(382, false, chapters, [...sealed])).toBe(a);
    expect(boltHeight(364, true, chapters, sealed)).toBeGreaterThan(0);
  });

  it('reserves exactly what the cloth draws, so nothing moves when it appears', () => {
    const sealed = days(40);
    const drawn = clothSize(geometry(clothWidthFor(382, false), 520, 50, sealed)).height;
    expect(boltHeight(382, false, 50, sealed)).toBe(drawn);
  });

  it('reserves nothing before the first day', () => {
    expect(boltHeight(382, false, 16, [])).toBe(0);
  });

  it('keeps a wide book inside the padding', () => {
    const w = clothWidthFor(382, false);
    expect(clothSize(geometry(w, 520, 150, days(30))).width).toBeLessThanOrEqual(w);
  });
});
