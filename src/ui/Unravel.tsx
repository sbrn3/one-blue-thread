import { useMemo } from 'react';
import Animated, { useAnimatedProps, type SharedValue } from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import {
  clothSize,
  geometry,
  polylineLength,
  warpPath,
  warpSpans,
  weftPath,
  weftPoints,
} from './loom';
import { tokens } from './tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface UnravelProps {
  width: number;
  maxHeight: number;
  chapterCount: number;
  sealed: boolean[];
  dye: string;
  /** 0 = whole cloth, 1 = fully unravelled. Driven by the hold. */
  progress: SharedValue<number>;
}

/**
 * The unravel — the deliberate inverse of the seal (docs/CONTEXT.md).
 *
 * The warp stays strung; the weft withdraws. Passes pull out from the working
 * edge backwards, newest first, exactly as a weaver would take them out, and
 * every pass re-enters if the hold is released.
 *
 * Each weft is its own animated path with a staggered window, so the whole
 * thing runs on the UI thread with no re-layout: nothing here recomputes
 * geometry while the finger is down.
 */
export function Unravel({ width, maxHeight, chapterCount, sealed, dye, progress }: UnravelProps) {
  const { g, spans, size, woven, lengths } = useMemo(() => {
    const geo = geometry(width, maxHeight, chapterCount, sealed);
    const rows = sealed.map((s, j) => (s ? j : -1)).filter((j) => j >= 0);
    return {
      g: geo,
      spans: warpSpans(geo.dist),
      size: clothSize(geo),
      woven: rows,
      lengths: rows.map((j) => polylineLength(weftPoints(geo, j))),
    };
  }, [width, maxHeight, chapterCount, sealed]);

  if (width <= 0 || sealed.length === 0) return null;

  const cols = g.sett.drawnCols;
  // Each pass gets its own slice of the hold, overlapping so the cloth comes
  // apart continuously rather than in visible steps.
  const n = Math.max(1, woven.length);
  const window = Math.min(0.6, 1.4 / n);

  return (
    <Svg width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`}>
      <G>
        {spans.map((span) =>
          Array.from({ length: cols }, (_, i) => {
            const slack = g.slackCap === 0 ? 0 : Math.min(span.dist, g.slackCap) / g.slackCap;
            return (
              <Path
                key={`w${i}-${span.from}`}
                d={warpPath(g, i, span.from, span.to)}
                stroke={tokens.color.warp}
                strokeWidth={2.5 * (1 - slack * 0.2)}
                strokeOpacity={0.95 - slack * 0.4}
                strokeLinecap="round"
                fill="none"
              />
            );
          }),
        )}
      </G>
      <G>
        {woven.map((j, k) => (
          <UnravellingWeft
            key={`f${j}`}
            d={weftPath(g, j)}
            length={lengths[k]}
            dye={dye}
            progress={progress}
            // Newest pass first: the last one woven is the first to come out.
            start={((n - 1 - k) / n) * (1 - window)}
            window={window}
          />
        ))}
      </G>
    </Svg>
  );
}

interface WeftProps {
  d: string;
  length: number;
  dye: string;
  progress: SharedValue<number>;
  start: number;
  window: number;
}

function UnravellingWeft({ d, length, dye, progress, start, window }: WeftProps) {
  const animatedProps = useAnimatedProps(() => {
    const t = Math.min(1, Math.max(0, (progress.value - start) / window));
    return { strokeDashoffset: length * t };
  });

  return (
    <AnimatedPath
      d={d}
      stroke={dye}
      strokeWidth={3.2}
      strokeOpacity={0.92}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={length}
      animatedProps={animatedProps}
    />
  );
}
