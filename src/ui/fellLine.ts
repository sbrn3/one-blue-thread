// The seal line: a thread run across the page at the fell. Pure and
// `'worklet'` so the live weft can be re-derived on the UI thread as the hold
// tightens it from slack to taut.

export interface FellPoint {
  x: number;
  y: number;
}

const STEP = 3;
const RAMP = 30; // px over which the line leaves the rail pinned to its baseline
const END_INSET = 16;

/** Slack at rest, taut when the seal completes. */
export function lineAmp(progress: number): number {
  'worklet';
  const t = Math.min(1, Math.max(0, progress));
  const eased = t * t * (3 - 2 * t);
  return 2.4 * (1 - eased) + 0.25;
}

export function fellLinePoints(width: number, x0: number, amp: number, baselineY: number): FellPoint[] {
  'worklet';
  const x1 = Math.max(x0, width - END_INSET);
  const pts: FellPoint[] = [];
  for (let x = x0; x < x1; x += STEP) {
    const ramp = Math.min(1, (x - x0) / RAMP);
    const off = (Math.sin(x / 23) * amp + Math.sin(x / 7.3 + 1) * amp * 0.35) * ramp;
    pts.push({ x, y: baselineY + off });
  }
  const ramp = Math.min(1, (x1 - x0) / RAMP);
  const off = (Math.sin(x1 / 23) * amp + Math.sin(x1 / 7.3 + 1) * amp * 0.35) * ramp;
  pts.push({ x: x1, y: baselineY + off });
  return pts;
}

export function fellLinePath(width: number, x0: number, amp: number, baselineY: number): string {
  'worklet';
  const pts = fellLinePoints(width, x0, amp, baselineY);
  let d = '';
  for (let i = 0; i < pts.length; i++) {
    d += (i === 0 ? 'M' : 'L') + Math.round(pts[i].x * 100) / 100 + ' ' + Math.round(pts[i].y * 100) / 100;
  }
  return d;
}

/** Length of the line at its slackest — the dash length, so the pass never finishes early. */
export function fellLineLength(width: number, x0: number): number {
  const pts = fellLinePoints(width, x0, lineAmp(0), 0);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}
