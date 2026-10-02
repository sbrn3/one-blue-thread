import { clothSize, geometry, MAX_ROW_PITCH, type ClothGeom } from './loom';

// Shared numbers for the left-edge rail (ThreadRail) and the seal line it
// locks onto. Pure, so the geometry is testable under Node.

export const RAIL_WIDTH = 26;
export const RAIL_THREADS = 3;
/** Tight and calm: three threads, small wobble, small slack. */
export const RAIL_OPTS = { pad: 4, amp: 0.7, slackCap: 1.2 };

/**
 * Row count that lets the cloth reach the bottom of the rail. `rowPlan` clamps
 * the row pitch at MAX_ROW_PITCH and otherwise squeezes rows into the height it
 * is given, so cloth planned for exactly `height` always stops about a pitch
 * short. The rail therefore plans on a taller cloth and lets the SVG clip it.
 */
export function railRows(height: number, pitch: number = MAX_ROW_PITCH): number {
  return Math.max(2, Math.ceil(height / pitch) + 3);
}

/** Height the rail geometry is planned on: the rail plus two pitches of overshoot. */
export function railPlanHeight(height: number): number {
  return height + 2 * MAX_ROW_PITCH;
}

/** Rail geometry; `woven` picks cloth (every row sealed) or slack warp. */
export function railGeometry(height: number, woven: boolean): { g: ClothGeom; rows: number } {
  const rows = railRows(height);
  const g = geometry(RAIL_WIDTH, railPlanHeight(height), RAIL_THREADS, Array<boolean>(rows).fill(woven), RAIL_OPTS);
  return { g, rows };
}

/** Depth the woven cloth reaches for a rail of this height. */
export function railCoverage(height: number): number {
  return clothSize(railGeometry(height, true).g).height;
}

/**
 * Where the rail's fell sits, in rail pixels. It follows scroll progress but can
 * never pass the seal line (`lineY`, in rail coordinates; null while unmeasured):
 * you cannot have woven past the thing that seals the day. `sealedSweep` (0→1)
 * then carries it to the bottom once sealed.
 */
export function railFell(progressPx: number, lineY: number | null, railHeight: number, sealedSweep: number): number {
  'worklet';
  const base = lineY === null ? progressPx : Math.min(progressPx, lineY);
  const clamped = Math.min(railHeight, Math.max(0, base));
  return clamped + (railHeight - clamped) * sealedSweep;
}
