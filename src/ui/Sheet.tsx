import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { easing, useMotion } from './motion';

interface SheetProps {
  visible: boolean;
  /** Android back. The owner decides what it means (close, or step back a screen). */
  onRequestClose: () => void;
  onShow?: () => void;
  children: ReactNode;
}

/**
 * A full-screen sheet that rises from the bottom and falls away again
 * (docs/plans/reading-screen-and-motion, S04: F5).
 *
 * The device audit found the opaque sheets (history, memory, a past chapter, the
 * dictionary) appearing within a frame: Android's own `animationType='slide'`
 * gave them no visible slide, while the transparent knot sheet did slide. So the
 * Modal here is transparent with no animation of its own, and Reanimated moves
 * the content on the UI thread. Every full-screen sheet now enters and leaves
 * the same way, whatever the window does.
 *
 * Closing keeps the Modal up until the fall finishes, drawing the last children
 * it was given while visible, so an owner can clear its state on close.
 * Reduce motion: shown and hidden at once.
 */
export function Sheet({ visible, onRequestClose, onShow, children }: SheetProps) {
  const { reduced, ms } = useMotion();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const shown = useRef(children);
  if (visible) shown.current = children;
  // 0 = in place, 1 = a full window height below.
  const offset = useSharedValue(visible ? 0 : 1);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      if (reduced) offset.value = 0;
      else offset.value = withTiming(0, { duration: ms('sheetInMs'), easing: easing('outCubic') });
    } else if (reduced) {
      offset.value = 1;
      setMounted(false);
    } else {
      offset.value = withTiming(1, { duration: ms('sheetOutMs'), easing: easing('inCubic') }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // ms is rebuilt each render; reduced is what it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduced, offset]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value * height }] }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onRequestClose} onShow={onShow}>
      <Animated.View style={[styles.fill, style]}>{shown.current}</Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
