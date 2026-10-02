import { describe, expect, it } from 'vitest';
import { geometry, warpX } from '../src/ui/loom';
import { RAIL_OPTS, RAIL_THREADS, RAIL_WIDTH, railCoverage, railFell, railRows } from '../src/ui/rail';

describe('rail geometry', () => {
  it.each([480, 736, 1024])('cloth reaches the bottom of a %ipx rail', (h) => {
    expect(railCoverage(h)).toBeGreaterThanOrEqual(h);
  });

  it('regression: the old 20px row pitch fell short on a 736px rail', () => {
    const oldRows = Math.max(2, Math.ceil(736 / 20) + 1);
    const g = geometry(RAIL_WIDTH, 736, RAIL_THREADS, Array<boolean>(oldRows).fill(true), RAIL_OPTS);
    expect(g.sy * (g.rows - 1) + g.pad * 2).toBeLessThan(736);
  });

  it('always plans at least two rows', () => {
    expect(railRows(1)).toBeGreaterThanOrEqual(2);
  });

  it('bare threads wobble but never cross their neighbours', () => {
    const rows = railRows(736);
    const g = geometry(RAIL_WIDTH, 736, RAIL_THREADS, Array<boolean>(rows).fill(false), RAIL_OPTS);
    for (let y = 0; y <= 736; y += 4) {
      for (let i = 0; i < g.sett.drawnCols - 1; i++) {
        expect(warpX(g, i + 1, y) - warpX(g, i, y)).toBeGreaterThan(0);
      }
    }
  });
});

describe('railFell', () => {
  const H = 700;

  it('follows progress when the seal line is unmeasured or below', () => {
    expect(railFell(200, null, H, 0)).toBe(200);
    expect(railFell(200, 500, H, 0)).toBe(200);
  });

  it('locks at the seal line when progress would pass it', () => {
    expect(railFell(600, 450, H, 0)).toBe(450);
  });

  it('is 0 when the seal line is above the screen', () => {
    expect(railFell(300, -80, H, 0)).toBe(0);
  });

  it('clamps to the rail', () => {
    expect(railFell(900, null, H, 0)).toBe(H);
  });

  it('sweeps to the bottom once sealed', () => {
    expect(railFell(100, 300, H, 1)).toBe(H);
    expect(railFell(100, 300, H, 0.5)).toBe(100 + (H - 100) * 0.5);
  });
});
