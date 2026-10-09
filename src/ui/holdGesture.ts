// Press-and-hold for the seal and the unravel
// (docs/plans/reading-screen-and-motion, S02: F2/F3).
//
// The device audit found that a held seal showed nothing until the finger
// lifted, and only landed then. Two causes:
// - the commit ran in onFinalize, which fires only on finger-up;
// - the gesture was rebuilt on every render. The scroll lock sets Flow's state
//   at touch-down, so the handler could be replaced mid-press.
// Now the commit runs in onStart: minDuration has passed and the finger is still
// down. The gesture is memoised, and it reads its callbacks through a ref, so
// re-renders don't touch it.
import { useCallback, useMemo, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { cancelAnimation, Easing, runOnJS, type SharedValue, withTiming } from 'react-native-reanimated';

export interface HoldCallbacks {
  /** Touch down: lock the scroll, start any haptics. */
  onPressIn?: () => void;
  /** minDuration reached with the finger still down. */
  onCommit: () => void;
  /** Released, or dragged past maxDriftPx, before minDuration. */
  onCancel?: () => void;
  /** Finger up, either way: unlock the scroll. */
  onPressOut?: () => void;
}

export interface HoldOptions {
  holdMs: number;
  maxDriftPx: number;
  /** How long the progress takes to run back to 0 after an early release. */
  releaseMs: number;
  enabled: boolean;
}

/**
 * A long press that drives `progress` from 0 to 1 over `holdMs`, starting at
 * touch-down. Composed with Gesture.Native(), so it shares the touch with the
 * enclosing ScrollView instead of losing it (see SealZone/ResetSection).
 */
export function useHoldGesture(progress: SharedValue<number>, options: HoldOptions, callbacks: HoldCallbacks) {
  const latest = useRef(callbacks);
  latest.current = callbacks;
  const fire = useCallback((kind: keyof HoldCallbacks) => {
    latest.current[kind]?.();
  }, []);

  const { holdMs, maxDriftPx, releaseMs, enabled } = options;
  return useMemo(() => {
    const hold = Gesture.LongPress()
      .minDuration(holdMs)
      .maxDistance(maxDriftPx)
      .enabled(enabled)
      .onBegin(() => {
        progress.value = withTiming(1, { duration: holdMs, easing: Easing.linear });
        runOnJS(fire)('onPressIn');
      })
      .onStart(() => {
        cancelAnimation(progress);
        progress.value = 1;
        runOnJS(fire)('onCommit');
      })
      .onFinalize((_event, success) => {
        runOnJS(fire)('onPressOut');
        if (!success) {
          cancelAnimation(progress);
          progress.value = withTiming(0, { duration: releaseMs });
          runOnJS(fire)('onCancel');
        }
      });
    return Gesture.Simultaneous(hold, Gesture.Native());
  }, [progress, holdMs, maxDriftPx, releaseMs, enabled, fire]);
}
