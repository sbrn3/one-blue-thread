// Pure motion timing — no React Native imports, so the test suite can load it.
// Reanimated-facing helpers live in ./motion.ts.
import { tokens } from './tokens';

type Motion = typeof tokens.motion;

/** Every duration key in tokens.motion (the ones ending in "Ms"). */
export type MotionKey = { [K in keyof Motion]: K extends `${string}Ms` ? K : never }[keyof Motion];

export const MOTION_KEYS = (Object.keys(tokens.motion) as (keyof Motion)[]).filter((k): k is MotionKey =>
  k.endsWith('Ms'),
);

/** A duration in ms, or 0 when the reader has reduce motion on. */
export function motionMs(key: MotionKey, reduced: boolean): number {
  return reduced ? 0 : tokens.motion[key];
}
