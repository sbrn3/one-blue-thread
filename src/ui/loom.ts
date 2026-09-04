// Cloth geometry — "The Loom" (docs/plans/aesthetic-thread-textile/plan.html).
//
// One book of the Bible is one bolt of woven cloth. The warp threads are its
// chapters; the rows are calendar days since the book was started; a weft pass
// is a day that was read. A day that was not read leaves bare warp you can see
// through, and the warp across a gap loses support and drifts off its sett.
//
// Pure geometry: no React, no react-native-svg, and no `Math.random()` (§13.6).
// Every value is a deterministic function of position, so the same input always
// yields the same paths — asserted in test/cloth.test.ts.

/** Below this the cloth smears into a solid block. */
export const MIN_SETT = 4.5;
/** Above this it stops reading as cloth and becomes a fence. */
export const MAX_SETT = 16;
/** Jude, 2 John and 3 John have one chapter each; one thread is not cloth. */
export const MIN_COLS = 3;
export const MIN_ROW_PITCH = 5;
export const MAX_ROW_PITCH = 16;
/** Path budget for one bolt — react-native-svg gets slow well before this. */
export const MAX_NODES = 4000;
/** Slack is capped so a lapse reads as *open*, never as damage. */
export const DEFAULT_SLACK_CAP = 4.5;
/** A gap this long or longer leaves a permanent mark when weaving resumes. */
export const SET_MARK_MIN_GAP = 2;
/** How far the cloth is displaced after a set mark, in px. Cumulative. */
export const SET_MARK_OFFSET = 2.5;

export interface Sett {
  /** The book's real chapter count — what the label says. */
  warpCount: number;
  /** How many warp threads are actually painted. */
  drawnCols: number;
  /** Paint every k-th warp thread. 1 means all of them. */
  drawEvery: number;
  /** Distance between painted warp threads, px. */
  sx: number;
}

export interface RowPlan {
  rows: number;
  sy: number;
}

/** A run of consecutive rows that share a support distance. */
export interface Span {
  from: number;
  to: number;
  dist: number;
}

export interface ClothGeom {
  sett: Sett;
  rows: number;
  sy: number;
  pad: number;
  amp: number;
  slackCap: number;
  /** Rows from each day to the nearest woven day. */
  dist: number[];
  /** Cumulative set-mark displacement per row. */
  setMark: number[];
}

/**
 * Chapter counts run from 150 (Psalms) down to 1. Widen the degenerate short
 * books to a ribbon, and for very long books paint every k-th warp thread so
 * the sett stays legible — `warpCount` still tells the truth.
 */
export function warpSett(availableWidth: number, chapterCount: number): Sett {
  const warpCount = Math.max(MIN_COLS, Math.floor(chapterCount) || MIN_COLS);
  const raw = availableWidth / (warpCount + 1);
  if (raw >= MIN_SETT) {
    return { warpCount, drawnCols: warpCount, drawEvery: 1, sx: Math.min(raw, MAX_SETT) };
  }
  // Solve for the column budget directly. Deriving drawEvery from `raw` lets
  // the later Math.ceil push drawnCols back up, and the final sett lands just
  // under MIN_SETT — 150 chapters on a 340px phone came out at 4.47.
  const maxDrawn = Math.max(MIN_COLS, Math.floor(availableWidth / MIN_SETT) - 1);
  const drawEvery = Math.max(1, Math.ceil(warpCount / maxDrawn));
  const drawnCols = Math.max(MIN_COLS, Math.ceil(warpCount / drawEvery));
  return { warpCount, drawnCols, drawEvery, sx: Math.min(availableWidth / (drawnCols + 1), MAX_SETT) };
}

/**
 * Rows are calendar days and a book can run long, so the pitch shrinks to fit
 * the height it is given rather than growing without bound.
 */
export function rowPlan(availableHeight: number, dayCount: number): RowPlan {
  const rows = Math.max(1, Math.floor(dayCount) || 1);
  const raw = availableHeight / (rows + 1);
  return { rows, sy: Math.min(Math.max(raw, MIN_ROW_PITCH), MAX_ROW_PITCH) };
}

/**
 * Rows from each day to the nearest woven day. 0 means the day has a weft.
 *
 * Seeded with `slackCap` rather than Infinity: an all-unsealed book would
 * otherwise put Infinity into a path coordinate and emit "NaN" in the `d`
 * attribute, which silently renders nothing.
 */
export function supportDistances(sealed: boolean[], slackCap = DEFAULT_SLACK_CAP): number[] {
  const n = sealed.length;
  const d = new Array<number>(n).fill(slackCap);
  for (let j = 0; j < n; j++) if (sealed[j]) d[j] = 0;
  for (let j = 1; j < n; j++) d[j] = Math.min(d[j], d[j - 1] + 1);
  for (let j = n - 2; j >= 0; j--) d[j] = Math.min(d[j], d[j + 1] + 1);
  return d.map((v) => Math.min(v, slackCap));
}

/**
 * The set mark. A weaver who stops and comes back never beats the first pass
 * flush against the old cloth, and the line it leaves never comes out. Every
 * row from the first weft after a long gap onwards is displaced, cumulatively.
 */
export function setMarkOffsets(sealed: boolean[]): number[] {
  const out = new Array<number>(sealed.length).fill(0);
  let shift = 0;
  let gap = 0;
  let started = false;
  for (let j = 0; j < sealed.length; j++) {
    if (sealed[j]) {
      if (started && gap >= SET_MARK_MIN_GAP) shift += SET_MARK_OFFSET;
      started = true;
      gap = 0;
    } else if (started) {
      gap++;
    }
    out[j] = shift;
  }
  return out;
}

/**
 * Consecutive rows sharing a support distance, so the warp can be painted as a
 * few long spans instead of one per row. A book read every day collapses to a
 * single span per thread, which is what keeps the node count sane.
 */
export function warpSpans(dist: number[]): Span[] {
  if (dist.length === 0) return [];
  const spans: Span[] = [];
  let from = 0;
  for (let j = 1; j <= dist.length; j++) {
    if (j === dist.length || dist[j] !== dist[from]) {
      spans.push({ from, to: j - 1, dist: dist[from] });
      from = j;
    }
  }
  return spans;
}

/** Plain weave: the warp rides over at alternating crossings. */
export const ridesOver = (i: number, j: number): boolean => (i + j) % 2 === 0;

/**
 * How much of the cloth can be painted inside the path budget.
 *
 * `full`  — warp spans, weft, and the over/under interlace.
 * `plain` — warp spans and weft; the interlace is dropped first because it is
 *           the most expensive part and the least legible at a small row pitch.
 * `flat`  — one full-length path per warp thread, so per-row slack is lost.
 *           Only reached by a long book read erratically, where the row pitch
 *           is near MIN_ROW_PITCH and per-row slack is invisible anyway.
 */
export type Detail = 'full' | 'plain' | 'flat';

function counts(g: ClothGeom, spans: Span[]) {
  const woven = g.dist.filter((d) => d === 0).length;
  return {
    woven,
    warpSpans: g.sett.drawnCols * spans.length,
    warpFlat: g.sett.drawnCols,
    over: Math.ceil((g.sett.drawnCols * woven) / 2),
  };
}

export function detailLevel(g: ClothGeom, spans: Span[]): Detail {
  const c = counts(g, spans);
  if (c.warpSpans + c.woven + c.over <= MAX_NODES) return 'full';
  if (c.warpSpans + c.woven <= MAX_NODES) return 'plain';
  return 'flat';
}

/** Paths actually painted at a given detail level. */
export function nodeCount(g: ClothGeom, spans: Span[], detail: Detail): number {
  const c = counts(g, spans);
  if (detail === 'full') return c.warpSpans + c.woven + c.over;
  if (detail === 'plain') return c.warpSpans + c.woven;
  return c.warpFlat + c.woven;
}

/** Paths a fully-detailed bolt would need. */
export function nodeEstimate(g: ClothGeom, spans: Span[]): number {
  return nodeCount(g, spans, 'full');
}

export function geometry(
  availableWidth: number,
  availableHeight: number,
  chapterCount: number,
  sealed: boolean[],
  opts: { pad?: number; amp?: number; slackCap?: number } = {},
): ClothGeom {
  const pad = opts.pad ?? 10;
  const slackCap = opts.slackCap ?? DEFAULT_SLACK_CAP;
  const sett = warpSett(Math.max(1, availableWidth - pad * 2), chapterCount);
  const { rows, sy } = rowPlan(Math.max(1, availableHeight - pad * 2), sealed.length);
  return {
    sett,
    rows,
    sy,
    pad,
    amp: opts.amp ?? 1.8,
    slackCap,
    dist: supportDistances(sealed, slackCap),
    setMark: setMarkOffsets(sealed),
  };
}

export function clothSize(g: ClothGeom): { width: number; height: number } {
  return {
    width: g.sett.sx * (g.sett.drawnCols - 1) + g.pad * 2,
    height: g.sy * (g.rows - 1) + g.pad * 2 + (g.setMark[g.rows - 1] ?? 0),
  };
}

function distAt(g: ClothGeom, y: number): number {
  const f = (y - g.pad) / g.sy;
  const a = Math.max(0, Math.min(g.dist.length - 1, Math.floor(f)));
  const b = Math.min(g.dist.length - 1, a + 1);
  const t = Math.max(0, Math.min(1, f - a));
  return g.dist[a] + (g.dist[b] - g.dist[a]) * t;
}

/** Warp x at a height. Unsupported warp wobbles wider and drifts off its sett. */
export function warpX(g: ClothGeom, i: number, y: number): number {
  const d = Math.min(distAt(g, y), g.slackCap);
  const slack = g.slackCap === 0 ? 0 : d / g.slackCap;
  const wl = g.sy * 2.05;
  return (
    g.pad +
    i * g.sett.sx +
    Math.sin(y / wl + i * 0.9) * g.amp * (1 + slack * 2.2) +
    Math.sin(i * 2.31 + 1.7) * d * 1.05
  );
}

/** Weft y across the cloth, displaced by any set mark at or before this row. */
export function weftY(g: ClothGeom, j: number, x: number): number {
  return (
    g.pad +
    j * g.sy +
    Math.sin(x / (g.sett.sx * 2.05) + j * 0.7) * g.amp +
    (g.setMark[j] ?? 0)
  );
}

const fixed = (n: number): string => (Math.round(n * 100) / 100).toString();

export function warpPath(g: ClothGeom, i: number, fromRow: number, toRow: number): string {
  const step = Math.min(3.5, g.sy / 3);
  const ya = g.pad + (fromRow - 0.5) * g.sy;
  const yb = g.pad + (toRow + 0.5) * g.sy;
  let d = '';
  for (let y = ya; y <= yb + 0.001; y += step) {
    d += `${d ? 'L' : 'M'}${fixed(warpX(g, i, y))} ${fixed(y)} `;
  }
  return d.trim();
}

export type Point = readonly [number, number];

export function weftPoints(g: ClothGeom, j: number): Point[] {
  const step = Math.min(3.5, g.sett.sx / 3);
  const x0 = g.pad - g.pad * 0.6;
  const x1 = g.pad + g.sett.sx * (g.sett.drawnCols - 1) + g.pad * 0.6;
  const pts: Point[] = [];
  for (let x = x0; x <= x1 + 0.001; x += step) pts.push([x, weftY(g, j, x)]);
  return pts;
}

export function pointsToPath(pts: Point[]): string {
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${fixed(x)} ${fixed(y)}`).join(' ');
}

/**
 * Length of a generated polyline. The seal animates a weft pass with
 * strokeDasharray, which needs the real length — react-native-svg has no
 * getTotalLength, and guessing high makes the pass finish before the hold does.
 */
export function polylineLength(pts: Point[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return total;
}

export function weftPath(g: ClothGeom, j: number): string {
  return pointsToPath(weftPoints(g, j));
}
