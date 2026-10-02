import { describe, expect, it } from 'vitest';
import { fellLineLength, fellLinePath, fellLinePoints, lineAmp } from '../src/ui/fellLine';

describe('fellLinePoints', () => {
  const W = 390;
  const X0 = 13;

  it('starts on the baseline at x0 so it leaves the rail pinned', () => {
    const [first] = fellLinePoints(W, X0, 2.4, 42);
    expect(first).toEqual({ x: X0, y: 42 });
  });

  it('ends at width - 16', () => {
    const pts = fellLinePoints(W, X0, 2.4, 42);
    expect(pts[pts.length - 1].x).toBe(W - 16);
  });

  it('never strays further than amp * 1.35 from the baseline', () => {
    const amp = 2.4;
    for (const p of fellLinePoints(W, X0, amp, 42)) {
      expect(Math.abs(p.y - 42)).toBeLessThanOrEqual(amp * 1.35 + 1e-9);
    }
  });

  it('is deterministic and a flat line at zero amplitude', () => {
    expect(fellLinePath(W, X0, 1, 42)).toBe(fellLinePath(W, X0, 1, 42));
    expect(fellLinePoints(W, X0, 0, 42).every((p) => p.y === 42)).toBe(true);
  });

  it('has a finite positive dash length', () => {
    expect(fellLineLength(W, X0)).toBeGreaterThan(W - 16 - X0 - 1);
  });
});

describe('lineAmp', () => {
  it('goes from slack to taut', () => {
    expect(lineAmp(0)).toBeCloseTo(2.65);
    expect(lineAmp(1)).toBeCloseTo(0.25);
    expect(lineAmp(0.5)).toBeLessThan(lineAmp(0.2));
  });

  it('clamps outside 0..1', () => {
    expect(lineAmp(-1)).toBeCloseTo(2.65);
    expect(lineAmp(2)).toBeCloseTo(0.25);
  });
});
