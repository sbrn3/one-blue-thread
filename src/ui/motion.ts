import { Easing, useReducedMotion } from 'react-native-reanimated';
import { motionMs, type MotionKey } from './motionTiming';

export type EasingName = 'linear' | 'inOutCubic' | 'outCubic' | 'inCubic';

/** The app's four easings. No spring and no bounce: see tokens.motion. */
export function easing(name: EasingName) {
  switch (name) {
    case 'linear':
      return Easing.linear;
    case 'inOutCubic':
      return Easing.inOut(Easing.cubic);
    case 'outCubic':
      return Easing.out(Easing.cubic);
    case 'inCubic':
      return Easing.in(Easing.cubic);
  }
}

/** `ms(key)` is the token's duration, or 0 under the OS reduce-motion setting. */
export function useMotion() {
  const reduced = useReducedMotion();
  return { reduced, ms: (key: MotionKey) => motionMs(key, reduced) };
}
