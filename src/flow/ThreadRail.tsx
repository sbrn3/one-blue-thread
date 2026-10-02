import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { warpPath, weftPath } from '../ui/loom';
import { RAIL_WIDTH, railFell, railGeometry } from '../ui/rail';
import { tokens } from '../ui/tokens';

// §04 — the rail on the left edge tracks scroll position; reading progress IS
// the scroll. It must run on the UI thread via a worklet or it stutters during
// scroll and the concept dies (§05).
//
// "The Loom": progress is not a bar, it is an edge. The rail is the page's own
// warp, woven down to the fell line — the boundary where bare warp becomes
// cloth. Everything above it you have read; everything below is still slack.
//
// The cloth is painted once and revealed by animating the HEIGHT of a clipping
// view, so nothing on the UI thread has to touch SVG props. The bare warp is
// windowed to the region below the fell, so slack thread never paints under the
// cloth.

interface ThreadRailProps {
  scrollY: SharedValue<number>;
  contentHeight: SharedValue<number>;
  layoutHeight: SharedValue<number>;
  /** The actual safe content height (post safe-area-inset) — see Flow.tsx's onLayout measurement. Full window height overcounted the status bar/home-indicator as rail. */
  railHeight: number;
  /** Content-Y of the seal line (-1 until measured). The fell can never pass it. */
  sealLineY: SharedValue<number>;
  /** Where the ScrollView's viewport starts on screen (the top safe-area inset). */
  viewportTop: number;
  /** Once sealed, the fell sweeps on to the bottom of the rail. */
  sealed: boolean;
  reducedMotion: boolean;
}

const SWEEP_MS = 600;

export function ThreadRail({
  scrollY,
  contentHeight,
  layoutHeight,
  railHeight,
  sealLineY,
  viewportTop,
  sealed,
  reducedMotion,
}: ThreadRailProps) {
  const windowHeight = railHeight;

  // 0 until the day is sealed, then the fell runs on down to the bottom. Already
  // sealed on mount (or reduced motion) it simply is there.
  const sealedSweep = useSharedValue(sealed ? 1 : 0);
  useEffect(() => {
    if (!sealed) sealedSweep.value = 0;
    else if (reducedMotion) sealedSweep.value = 1;
    else sealedSweep.value = withTiming(1, { duration: SWEEP_MS, easing: Easing.inOut(Easing.cubic) });
  }, [sealed, reducedMotion, sealedSweep]);

  const fellPx = () => {
    'worklet';
    const scrollable = Math.max(1, contentHeight.value - layoutHeight.value);
    const progress = Math.min(1, Math.max(0, scrollY.value / scrollable));
    const lineY = sealLineY.value < 0 ? null : viewportTop + sealLineY.value - scrollY.value;
    return railFell(progress * windowHeight, lineY, windowHeight, sealedSweep.value);
  };

  const { bare, woven } = useMemo(
    () => ({ bare: railGeometry(windowHeight, false), woven: railGeometry(windowHeight, true) }),
    [windowHeight],
  );

  // Deliberately NOT gated on reduced motion. This is a direct-manipulation
  // indicator, like a scrollbar, not an animation: snapping it to 100% would
  // show a reduced-motion reader fully woven cloth and no fell line at the
  // top of an unread chapter, which is the one thing the rail must never do.
  const fillStyle = useAnimatedStyle(() => ({ height: fellPx() }));

  // The bare warp lives only below the fell: a window whose top follows the
  // fell, with the Svg counter-offset so its paths keep their coordinates.
  const bareWindowStyle = useAnimatedStyle(() => {
    const fell = fellPx();
    return { top: fell, height: windowHeight - fell };
  });
  const bareOffsetStyle = useAnimatedStyle(() => ({ top: -fellPx() }));

  const cols = bare.g.sett.drawnCols;

  return (
    <View style={[styles.rail, { height: windowHeight }]} pointerEvents="none">
      {/* what is ahead of you: bare warp, slack and faint */}
      <Animated.View style={[styles.clipBelow, bareWindowStyle]}>
        <Animated.View style={[styles.absolute, bareOffsetStyle]}>
          <Svg width={RAIL_WIDTH} height={windowHeight}>
            {Array.from({ length: cols }, (_, i) => (
              <Path
                key={`b${i}`}
                d={warpPath(bare.g, i, 0, bare.rows - 1)}
                stroke={tokens.color.warp}
                strokeWidth={1.8}
                strokeOpacity={0.3}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </Svg>
        </Animated.View>
      </Animated.View>

      {/* what you have read: cloth, revealed down to the fell line. No
          over/under interlace — at 26pt it is illegible mush. */}
      <Animated.View style={[styles.clip, fillStyle]}>
        <Svg width={RAIL_WIDTH} height={windowHeight}>
          <G>
            {Array.from({ length: cols }, (_, i) => (
              <Path
                key={`w${i}`}
                d={warpPath(woven.g, i, 0, woven.rows - 1)}
                stroke={tokens.color.warp}
                strokeWidth={2}
                strokeOpacity={0.55}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </G>
          <G>
            {Array.from({ length: woven.rows }, (_, j) => (
              <Path
                key={`f${j}`}
                d={weftPath(woven.g, j)}
                stroke={tokens.color.thread}
                strokeWidth={2.6}
                strokeOpacity={0.85}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </G>
        </Svg>
      </Animated.View>

      {/* the fell line itself, sitting on the boundary */}
      <Animated.View style={[styles.fell, fillStyle]} pointerEvents="none">
        <View style={styles.fellMark} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: RAIL_WIDTH,
    zIndex: 100,
  },
  clip: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RAIL_WIDTH,
    overflow: 'hidden',
  },
  clipBelow: {
    position: 'absolute',
    left: 0,
    width: RAIL_WIDTH,
    overflow: 'hidden',
  },
  absolute: {
    position: 'absolute',
    left: 0,
    width: RAIL_WIDTH,
  },
  fell: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: RAIL_WIDTH,
    justifyContent: 'flex-end',
  },
  fellMark: {
    height: 2,
    marginHorizontal: 3,
    borderRadius: 1,
    backgroundColor: tokens.color.thread,
    opacity: 0.55,
  },
});
