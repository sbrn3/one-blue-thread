import { describe, expect, it } from 'vitest';
import { CANON } from '../src/text/canon';
import { dyeFor } from '../src/ui/dye';
import { tokens } from '../src/ui/tokens';
import {
  clothSize,
  detailLevel,
  geometry,
  nodeCount,
  nodeEstimate,
  ridesOver,
  rowPlan,
  setMarkOffsets,
  supportDistances,
  warpPath,
  warpSett,
  warpSpans,
  weftPath,
  DEFAULT_SLACK_CAP,
  MAX_NODES,
  MAX_SETT,
  MIN_COLS,
  MIN_SETT,
  SET_MARK_MIN_GAP,
  SET_MARK_OFFSET,
} from '../src/ui/loom';

// The bolt is the one place the app draws something dense enough to matter, and
// none of it can be checked by rendering (the suite is logic-only, per
// AGENTS.md). So the geometry carries the real invariants: it must stay legible
// from Psalms (150 chapters) down to Jude (1), never emit a non-finite
// coordinate, and never depend on Math.random.

const PHONE = 340;

describe('warpSett', () => {
  it('widens a one-chapter book to a ribbon rather than a single line', () => {
    const s = warpSett(PHONE, 1);
    expect(s.warpCount).toBe(MIN_COLS);
    expect(s.drawnCols).toBe(MIN_COLS);
    expect(s.drawEvery).toBe(1);
  });

  it('keeps Psalms legible on a phone by painting every k-th thread', () => {
    const s = warpSett(PHONE, 150);
    expect(s.warpCount).toBe(150); // the label still tells the truth
    expect(s.drawEvery).toBeGreaterThan(1);
    expect(s.sx).toBeGreaterThanOrEqual(MIN_SETT);
    expect(s.drawnCols).toBeLessThan(150);
  });

  it('never exceeds MAX_SETT, so a short book does not become a fence', () => {
    expect(warpSett(1024, 3).sx).toBeLessThanOrEqual(MAX_SETT);
  });

  it('treats an unknown chapter count as the minimum, without dividing by zero', () => {
    const s = warpSett(PHONE, 0);
    expect(s.warpCount).toBe(MIN_COLS);
    expect(Number.isFinite(s.sx)).toBe(true);
  });
});

describe('rowPlan', () => {
  it('shrinks the pitch so a long book fits the height it is given', () => {
    const short = rowPlan(600, 10);
    const long = rowPlan(600, 200);
    expect(long.sy).toBeLessThan(short.sy);
    expect(long.rows).toBe(200);
  });

  it('never returns a zero or negative pitch for a one-day book', () => {
    const p = rowPlan(600, 1);
    expect(p.rows).toBe(1);
    expect(p.sy).toBeGreaterThan(0);
  });
});

describe('supportDistances', () => {
  it('is all zeroes when every day was read', () => {
    expect(supportDistances([true, true, true])).toEqual([0, 0, 0]);
  });

  it('rises and falls symmetrically across a gap', () => {
    expect(supportDistances([true, false, false, false, true])).toEqual([0, 1, 2, 1, 0]);
  });

  it('handles a leading and a trailing gap', () => {
    expect(supportDistances([false, false, true, false])).toEqual([2, 1, 0, 1]);
  });

  it('returns only finite values for a book with nothing read', () => {
    const d = supportDistances([false, false, false, false]);
    expect(d.every(Number.isFinite)).toBe(true);
    expect(Math.max(...d)).toBeLessThanOrEqual(DEFAULT_SLACK_CAP);
  });

  it('caps slack so a long lapse reads as open, not as damage', () => {
    const sealed = [true, ...Array<boolean>(40).fill(false), true];
    expect(Math.max(...supportDistances(sealed))).toBe(DEFAULT_SLACK_CAP);
  });
});

describe('setMarkOffsets', () => {
  it('is all zero when nothing was ever missed', () => {
    expect(setMarkOffsets([true, true, true])).toEqual([0, 0, 0]);
  });

  it('is zero for a gap shorter than the threshold', () => {
    expect(setMarkOffsets([true, false, true])).toEqual([0, 0, 0]);
  });

  it('displaces every row from the first weft after a lapse onwards', () => {
    // gap of 2 -> the mark lands on the return and never comes out
    const out = setMarkOffsets([true, false, false, true, true]);
    expect(out[0]).toBe(0);
    expect(out[3]).toBe(SET_MARK_OFFSET);
    expect(out[4]).toBe(SET_MARK_OFFSET);
  });

  it('accumulates across two separate lapses', () => {
    const sealed = [true, false, false, true, false, false, false, true];
    const out = setMarkOffsets(sealed);
    expect(out[7]).toBe(SET_MARK_OFFSET * 2);
  });

  it('does not mark a book that simply started late', () => {
    const gap = Array<boolean>(SET_MARK_MIN_GAP + 1).fill(false);
    expect(setMarkOffsets([...gap, true])).toEqual([0, 0, 0, 0]);
  });
});

describe('warpSpans', () => {
  it('collapses a fully-read book to one span per thread', () => {
    expect(warpSpans(supportDistances(Array<boolean>(60).fill(true)))).toHaveLength(1);
  });

  it('splits only around the gaps', () => {
    const spans = warpSpans(supportDistances([true, true, false, true, true]));
    expect(spans.length).toBeGreaterThan(1);
    expect(spans[0]).toEqual({ from: 0, to: 1, dist: 0 });
  });

  it('covers every row exactly once', () => {
    const dist = supportDistances([true, false, false, true, true, false, true]);
    const spans = warpSpans(dist);
    expect(spans[0].from).toBe(0);
    expect(spans[spans.length - 1].to).toBe(dist.length - 1);
    for (let i = 1; i < spans.length; i++) expect(spans[i].from).toBe(spans[i - 1].to + 1);
  });
});

describe('the path budget', () => {
  it('keeps a steadily-read Psalms inside MAX_NODES', () => {
    const sealed = Array<boolean>(150).fill(true);
    const g = geometry(PHONE, 620, 150, sealed);
    expect(nodeEstimate(g, warpSpans(g.dist))).toBeLessThanOrEqual(MAX_NODES);
  });
});

describe('paths', () => {
  const sealed = [true, false, true, true, false, false, true];
  const g = geometry(PHONE, 400, 21, sealed);

  it('emits no NaN, even where the warp is unsupported', () => {
    for (let i = 0; i < g.sett.drawnCols; i++) {
      expect(warpPath(g, i, 0, sealed.length - 1)).not.toMatch(/NaN|Infinity/);
    }
    for (let j = 0; j < sealed.length; j++) {
      expect(weftPath(g, j)).not.toMatch(/NaN|Infinity/);
    }
  });

  it('emits no NaN for a book with nothing read at all', () => {
    const empty = geometry(PHONE, 400, 21, Array<boolean>(12).fill(false));
    expect(warpPath(empty, 0, 0, 11)).not.toMatch(/NaN|Infinity/);
  });

  it('gives a positive size for a one-day, one-chapter bolt', () => {
    const tiny = geometry(PHONE, 400, 1, [false]);
    const size = clothSize(tiny);
    expect(size.width).toBeGreaterThan(0);
    expect(size.height).toBeGreaterThan(0);
  });
});

describe('plain weave', () => {
  it('alternates over and under along both axes', () => {
    expect(ridesOver(0, 0)).toBe(true);
    expect(ridesOver(1, 0)).toBe(false);
    expect(ridesOver(0, 1)).toBe(false);
    expect(ridesOver(1, 1)).toBe(true);
  });
});

describe('determinism (§13.6 — no Math.random)', () => {
  it('produces byte-identical paths across calls', () => {
    const sealed = [true, false, true, true, false, true];
    const a = geometry(PHONE, 400, 21, sealed);
    const b = geometry(PHONE, 400, 21, sealed);
    expect(warpPath(a, 2, 0, 5)).toBe(warpPath(b, 2, 0, 5));
    expect(weftPath(a, 3)).toBe(weftPath(b, 3));
  });

  it('does not reference Math.random anywhere in the module', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, '..', 'src', 'ui', 'loom.ts'), 'utf8')
      // Strip comments first — the module's own header promises it avoids
      // Math.random, and that sentence would otherwise fail this assertion.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(src).not.toMatch(/Math\.random/);
  });
});

describe('dyeFor', () => {
  it('assigns a dye to every book in the canon', () => {
    for (const book of CANON) {
      expect(tokens.dye).toContain(dyeFor(book.id));
    }
  });

  it('is stable across calls', () => {
    expect(dyeFor('john')).toBe(dyeFor('john'));
  });

  it('gives adjacent books different dyes', () => {
    expect(dyeFor(CANON[0].id)).not.toBe(dyeFor(CANON[1].id));
  });

  it('falls back rather than returning undefined for an unknown book', () => {
    expect(tokens.dye).toContain(dyeFor('not-a-book'));
  });
});

describe('detail degrades under the path budget', () => {
  const psalmsSteady = Array<boolean>(150).fill(true);
  // 150 chapters read erratically: the worst case, and the one that motivated
  // graded detail rather than a single on/off fallback.
  const psalmsPatchy = Array.from({ length: 150 }, (_, i) => i % 5 !== 3);

  it('paints a steadily-read Psalms in full', () => {
    const g = geometry(340, 620, 150, psalmsSteady);
    const spans = warpSpans(g.dist);
    expect(detailLevel(g, spans)).toBe('full');
  });

  it('drops below full for a long book read erratically', () => {
    const g = geometry(340, 620, 150, psalmsPatchy);
    expect(detailLevel(g, warpSpans(g.dist))).not.toBe('full');
  });

  it('always lands inside MAX_NODES at whatever level it chooses', () => {
    for (const sealed of [psalmsSteady, psalmsPatchy, Array<boolean>(150).fill(false)]) {
      const g = geometry(340, 620, 150, sealed);
      const spans = warpSpans(g.dist);
      expect(nodeCount(g, spans, detailLevel(g, spans))).toBeLessThanOrEqual(MAX_NODES);
    }
  });

  it('keeps an ordinary book at full detail', () => {
    const g = geometry(340, 460, 21, Array.from({ length: 28 }, (_, i) => i % 3 !== 0));
    expect(detailLevel(g, warpSpans(g.dist))).toBe('full');
  });
});
