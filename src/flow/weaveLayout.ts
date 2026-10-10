// WeaveZone's sizing, kept pure so the first frame can be computed before any
// layout pass (docs/plans/reading-screen-and-motion, S04: F4).
//
// The device audit found the knot sheet jumping as it opened. WeaveZone only
// drew its cloth once onLayout had reported a width, so everything below it
// moved down a frame later. Now the zone seeds its width from the window and
// the caller's inset, and the cloth has its final size on the first frame.
import { clothSize, geometry } from '../ui/loom';

/** WeaveZone's horizontal padding, each side. */
export const WEAVE_PAD_X = 32;
export const CLOTH_MAX_HEIGHT = 520;
export const CLOTH_MAX_HEIGHT_COMPACT = 220;

/** The zone's width before layout: the window less what the caller takes from it. */
export function seedZoneWidth(windowWidth: number, insetX: number): number {
  return Math.max(0, windowWidth - insetX);
}

/** The width the cloth may draw in: inside the zone's padding. */
export function clothWidthFor(zoneWidth: number, compact: boolean): number {
  return Math.max(0, zoneWidth - (compact ? 0 : WEAVE_PAD_X * 2));
}

/** The cloth's drawn height for a zone width: what the zone reserves. */
export function boltHeight(zoneWidth: number, compact: boolean, chapterCount: number, sealed: boolean[]): number {
  const width = clothWidthFor(zoneWidth, compact);
  if (width <= 0 || sealed.length === 0) return 0;
  const maxHeight = compact ? CLOTH_MAX_HEIGHT_COMPACT : CLOTH_MAX_HEIGHT;
  return clothSize(geometry(width, maxHeight, chapterCount, sealed)).height;
}
