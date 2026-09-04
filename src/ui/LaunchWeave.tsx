import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import { clothSize, geometry, pointsToPath, polylineLength, ridesOver, warpPath, weftPoints } from './loom';
import { tokens } from './tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

// A fixed synthetic 11-chapter/21-day pattern — never derived from the
// reader's own history, never looped, never labelled as percent progress
// (docs/plans/app-quality-foundations/plan.html, active-weft launch).
const ROWS = 21;
const CHAPTERS = 11;
// rowPlan()/warpSett() in ./loom clamp sy/sx to MAX_ROW_PITCH/MAX_SETT (16) on
// any real screen, so a naive geometry(screenW, screenH, 11, 21-true) always
// lands on a 180x340 box at pitch 16. Scaling that box (and inverse-scaling
// stroke width) by 1.625 reproduces the approved mockup's 26px pitch exactly,
// without touching loom.ts's shared constants.
const SCALE = 1.625;
// The slack field's first/last row spans reach this many rows past the
// visible band so the warp never looks clipped at the top/bottom edge.
const EXTRA_ROWS = 3;

const START_MS = 400;
const ROW_MS = 600;
const WEFT_MS = 520;
const TENSION_MS = 240;
const ACCELERATE_MS = 180;
const STALL_MS = 14000;

const weftStart = (j: number) => START_MS + j * ROW_MS;

const STROKE_WIDTH = {
  slack: 2 / SCALE,
  taut: 2.5 / SCALE,
  weft: 3.2 / SCALE,
  over: 2.5 / SCALE,
};

interface LaunchWeaveProps {
  width: number;
  height: number;
  /** True once the real session load has resolved — accelerates and dissolves the remaining rows. */
  done: boolean;
  /** Called once the (possibly accelerated) weave has fully dissolved, so the caller can unmount this. */
  onDismissed: () => void;
  /** Offered only once the sequence has run past STALL_MS while still loading. */
  onRetry: () => void;
}

/**
 * The launch state: a decorative, full-page relative of Cloth (see
 * src/flow/ThreadRail.tsx, src/flow/SealZone.tsx) that inserts weft row by
 * row rather than revealing a pre-painted graphic — every taut-warp/fell-line
 * reveal is caused by that row's own weft pass finishing, not by an
 * independent timer.
 */
export function LaunchWeave({ width, height, done, onDismissed, onRetry }: LaunchWeaveProps) {
  const reducedMotion = useReducedMotion();
  const [statusText, setStatusText] = useState(reducedMotion ? 'Ready.' : '');
  const [stalled, setStalled] = useState(false);

  const { slackGeom, tautGeom, nativeSize, size } = useMemo(() => {
    const slack = geometry(width, height, CHAPTERS, new Array(ROWS).fill(false));
    const taut = geometry(width, height, CHAPTERS, new Array(ROWS).fill(true));
    const box = clothSize(taut);
    return {
      slackGeom: slack,
      tautGeom: taut,
      nativeSize: box,
      size: { width: box.width * SCALE, height: box.height * SCALE },
    };
  }, [width, height]);

  const bandBottomPx = (j: number) => (tautGeom.pad + (j + 0.5) * tautGeom.sy) * SCALE;
  const fellY = useSharedValue(reducedMotion ? bandBottomPx(ROWS - 1) : 0);

  useEffect(() => {
    if (reducedMotion) return;
    const showStatus = setTimeout(() => setStatusText('Preparing today’s reading…'), START_MS);
    const stall = setTimeout(() => setStalled(true), STALL_MS);
    return () => {
      clearTimeout(showStatus);
      clearTimeout(stall);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(onDismissed, reducedMotion ? 0 : ACCELERATE_MS + 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, reducedMotion]);

  const cols = tautGeom.sett.drawnCols;
  const rows = useMemo(
    () =>
      Array.from({ length: ROWS }, (_, j) => {
        const slackFrom = j === 0 ? -EXTRA_ROWS : j;
        const slackTo = j === ROWS - 1 ? ROWS - 1 + EXTRA_ROWS : j;
        const slackPaths = Array.from({ length: cols }, (_, i) => warpPath(slackGeom, i, slackFrom, slackTo));
        const tautPaths = Array.from({ length: cols }, (_, i) => warpPath(tautGeom, i, j, j));
        const overPaths = Array.from({ length: cols }, (_, i) => i)
          .filter((i) => ridesOver(i, j))
          .map((i) => warpPath(tautGeom, i, j, j));
        const points = weftPoints(tautGeom, j);
        const weftD = pointsToPath(j % 2 === 1 ? [...points].reverse() : points);
        const weftLength = polylineLength(points);
        return { j, slackPaths, tautPaths, overPaths, weftD, weftLength, fellTargetPx: bandBottomPx(j) };
      }),
    [slackGeom, tautGeom, cols],
  );

  const fellStyle = useAnimatedStyle(() => ({ height: fellY.value }));

  return (
    <View style={styles.wrap}>
      <View style={[styles.field, { width: size.width, height: size.height }]}>
        <Svg
          width={size.width}
          height={size.height}
          viewBox={`0 0 ${nativeSize.width} ${nativeSize.height}`}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          {rows.map((row) => (
            <LaunchRow
              key={row.j}
              slackPaths={row.slackPaths}
              tautPaths={row.tautPaths}
              overPaths={row.overPaths}
              weftD={row.weftD}
              weftLength={row.weftLength}
              startMs={weftStart(row.j)}
              fellTargetPx={row.fellTargetPx}
              fellY={fellY}
              reducedMotion={reducedMotion}
              done={done}
            />
          ))}
        </Svg>
        <Animated.View style={[styles.fell, fellStyle]} pointerEvents="none">
          <View style={styles.fellMark} />
        </Animated.View>
      </View>
      <Text style={styles.status} accessibilityRole="text" accessibilityLiveRegion="polite">
        {statusText}
      </Text>
      {stalled && !done && (
        <View style={styles.stalledWrap}>
          <Text style={styles.stalledText}>This is taking longer than expected.</Text>
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.retryLabel}>Retry</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

interface LaunchRowProps {
  slackPaths: string[];
  tautPaths: string[];
  overPaths: string[];
  weftD: string;
  weftLength: number;
  startMs: number;
  fellTargetPx: number;
  fellY: SharedValue<number>;
  reducedMotion: boolean;
  done: boolean;
}

function LaunchRow({
  slackPaths,
  tautPaths,
  overPaths,
  weftD,
  weftLength,
  startMs,
  fellTargetPx,
  fellY,
  reducedMotion,
  done,
}: LaunchRowProps) {
  const weftDash = useSharedValue(reducedMotion ? 0 : weftLength);
  const slackOpacity = useSharedValue(reducedMotion ? 0 : 0.34);
  const wovenOpacity = useSharedValue(reducedMotion ? 0.95 : 0);

  useEffect(() => {
    if (reducedMotion) {
      fellY.value = fellTargetPx; // the last row to run this effect wins, landing on the finished position
      return;
    }
    weftDash.value = withDelay(
      startMs,
      withTiming(0, { duration: WEFT_MS, easing: Easing.linear }, (finished) => {
        if (finished) {
          slackOpacity.value = withTiming(0, { duration: TENSION_MS });
          wovenOpacity.value = withTiming(0.95, { duration: TENSION_MS });
          fellY.value = withTiming(fellTargetPx, { duration: TENSION_MS });
        }
      }),
    );
    return () => {
      cancelAnimation(weftDash);
      cancelAnimation(slackOpacity);
      cancelAnimation(wovenOpacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!done || reducedMotion) return;
    cancelAnimation(weftDash);
    weftDash.value = withTiming(0, { duration: ACCELERATE_MS, easing: Easing.linear }, (finished) => {
      if (finished) {
        slackOpacity.value = withTiming(0, { duration: ACCELERATE_MS });
        wovenOpacity.value = withTiming(0.95, { duration: ACCELERATE_MS });
        fellY.value = withTiming(fellTargetPx, { duration: ACCELERATE_MS });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, reducedMotion]);

  const weftProps = useAnimatedProps(() => ({ strokeDashoffset: weftDash.value }));
  const slackProps = useAnimatedProps(() => ({ opacity: slackOpacity.value }));
  const wovenProps = useAnimatedProps(() => ({ opacity: wovenOpacity.value }));

  return (
    <>
      <AnimatedG animatedProps={slackProps}>
        {slackPaths.map((d, i) => (
          <Path key={`s${i}`} d={d} stroke={tokens.color.warp} strokeWidth={STROKE_WIDTH.slack} strokeLinecap="round" fill="none" />
        ))}
      </AnimatedG>
      <AnimatedPath
        d={weftD}
        stroke={tokens.color.thread}
        strokeWidth={STROKE_WIDTH.weft}
        strokeOpacity={0.92}
        strokeLinecap="round"
        strokeDasharray={weftLength}
        animatedProps={weftProps}
        fill="none"
      />
      <AnimatedG animatedProps={wovenProps}>
        {tautPaths.map((d, i) => (
          <Path key={`t${i}`} d={d} stroke={tokens.color.warp} strokeWidth={STROKE_WIDTH.taut} strokeLinecap="round" fill="none" />
        ))}
        {overPaths.map((d, i) => (
          <Path key={`o${i}`} d={d} stroke={tokens.color.warp} strokeWidth={STROKE_WIDTH.over} strokeLinecap="round" fill="none" />
        ))}
      </AnimatedG>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.color.paper,
    gap: 12,
  },
  field: {
    position: 'relative',
  },
  fell: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
  },
  fellMark: {
    height: 2,
    marginHorizontal: 10,
    borderRadius: 1,
    backgroundColor: tokens.color.thread,
    opacity: 0.55,
  },
  status: {
    minHeight: 20,
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.ink60,
  },
  stalledWrap: {
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  stalledText: {
    fontFamily: tokens.font.display,
    fontSize: 14,
    color: tokens.color.ink60,
    textAlign: 'center',
  },
  retry: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: tokens.color.thread,
  },
  retryPressed: {
    opacity: 0.85,
  },
  retryLabel: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 15,
    color: tokens.color.paper,
  },
});
