import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { geometry, ridesOver, warpPath, weftPath } from '../ui/loom';
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
// view, so nothing on the UI thread has to touch SVG props.

const RAIL_WIDTH = 26;
const ROW_PITCH = 20;
const WARP_THREADS = 3;

interface ThreadRailProps {
  scrollY: SharedValue<number>;
  contentHeight: SharedValue<number>;
  layoutHeight: SharedValue<number>;
}

export function ThreadRail({ scrollY, contentHeight, layoutHeight }: ThreadRailProps) {
  const { height: windowHeight } = useWindowDimensions();

  const { bare, woven } = useMemo(() => {
    const rows = Math.max(2, Math.ceil(windowHeight / ROW_PITCH) + 1);
    // Two passes of the same geometry: one with nothing woven (slack warp, what
    // lies ahead) and one fully woven (what has been read).
    const slack = geometry(RAIL_WIDTH, windowHeight, WARP_THREADS, Array<boolean>(rows).fill(false), {
      pad: 5,
    });
    const cloth = geometry(RAIL_WIDTH, windowHeight, WARP_THREADS, Array<boolean>(rows).fill(true), {
      pad: 5,
    });
    return { bare: { g: slack, rows }, woven: { g: cloth, rows } };
  }, [windowHeight]);

  const fillStyle = useAnimatedStyle(() => {
    const scrollable = Math.max(1, contentHeight.value - layoutHeight.value);
    // Deliberately NOT gated on reduced motion. This is a direct-manipulation
    // indicator, like a scrollbar, not an animation: snapping it to 100% would
    // show a reduced-motion reader fully woven cloth and no fell line at the
    // top of an unread chapter, which is the one thing the rail must never do.
    const progress = Math.min(1, Math.max(0, scrollY.value / scrollable));
    return { height: `${progress * 100}%` };
  });

  const cols = bare.g.sett.drawnCols;

  return (
    <View style={[styles.rail, { height: windowHeight }]} pointerEvents="none">
      {/* what is ahead of you: bare warp, slack and faint */}
      <Svg style={StyleSheet.absoluteFill} width={RAIL_WIDTH} height={windowHeight}>
        {Array.from({ length: cols }, (_, i) => (
          <Path
            key={`b${i}`}
            d={warpPath(bare.g, i, 0, bare.rows - 1)}
            stroke={tokens.color.warp}
            strokeWidth={2.2}
            strokeOpacity={0.42}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </Svg>

      {/* what you have read: cloth, revealed down to the fell line */}
      <Animated.View style={[styles.clip, fillStyle]}>
        <Svg width={RAIL_WIDTH} height={windowHeight}>
          <G>
            {Array.from({ length: cols }, (_, i) => (
              <Path
                key={`w${i}`}
                d={warpPath(woven.g, i, 0, woven.rows - 1)}
                stroke={tokens.color.warp}
                strokeWidth={2.6}
                strokeOpacity={0.95}
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
                strokeWidth={3}
                strokeOpacity={0.9}
                strokeLinecap="round"
                fill="none"
              />
            ))}
          </G>
          <G>
            {Array.from({ length: woven.rows }, (_, j) =>
              Array.from({ length: cols }, (_, i) => i)
                .filter((i) => ridesOver(i, j))
                .map((i) => (
                  <Path
                    key={`o${i}-${j}`}
                    d={warpPath(woven.g, i, j, j)}
                    stroke={tokens.color.warp}
                    strokeWidth={2.6}
                    strokeOpacity={0.95}
                    strokeLinecap="round"
                    fill="none"
                  />
                )),
            )}
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
