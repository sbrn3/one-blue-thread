import { useEffect, useMemo } from 'react';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Ellipse, G, Path } from 'react-native-svg';
import {
  type ClothGeom,
  clothSize,
  detailLevel,
  geometry,
  polylineLength,
  ridesOver,
  warpPath,
  warpSpans,
  weftPath,
  weftPoints,
  type Span,
} from './loom';
import { easing, useMotion } from './motion';
import { tokens } from './tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const WALNUT = tokens.dye[2];

interface ClothProps {
  /** Space the cloth may occupy. Both drive the sett and the row pitch. */
  width: number;
  maxHeight: number;
  /** The book's chapter count — the width of the cloth in warp threads. */
  chapterCount: number;
  /** One entry per calendar day since the book started; true = a day read. */
  sealed: boolean[];
  /** This book's natural dye (see dye.ts). */
  dye: string;
  /**
   * Weave the last row (today) in: a shuttle carries the weft across, then the
   * row beats up into place (reading-screen-and-motion S08). Only for a seal
   * that just happened; a reopened, already-sealed day is drawn still.
   */
  weaveLastRow?: boolean;
}

/**
 * A bolt of cloth. Presentational only — every coordinate comes from cloth.ts.
 *
 * Painted in three passes so the interlacing is genuine occlusion rather than a
 * texture: all warp, then the weft over it, then the warp segments that ride
 * over at alternating crossings.
 */
export function Cloth({ width, maxHeight, chapterCount, sealed, dye, weaveLastRow = false }: ClothProps) {
  const { g, spans, size, woven } = useMemo(() => {
    const geo = geometry(width, maxHeight, chapterCount, sealed);
    return {
      g: geo,
      spans: warpSpans(geo.dist),
      size: clothSize(geo),
      woven: sealed.map((s, j) => (s ? j : -1)).filter((j) => j >= 0),
    };
  }, [width, maxHeight, chapterCount, sealed]);

  const last = sealed.length - 1;
  const weaving = weaveLastRow && last >= 0 && sealed[last] === true;

  if (sealed.length === 0 || width <= 0) return null;

  const cols = g.sett.drawnCols;
  // The warp is painted as spans of constant support rather than one path per
  // row: a book read every day collapses to a single span per thread. A long
  // book read erratically still overruns the budget, so detail degrades in
  // steps — the interlace goes first, then per-row slack.
  const detail = detailLevel(g, spans);
  const warpRuns: Span[] =
    detail === 'flat' ? [{ from: 0, to: g.rows - 1, dist: 0 }] : spans;

  return (
    <Svg width={size.width} height={size.height} viewBox={`0 0 ${size.width} ${size.height}`}>
      <G>
        {warpRuns.map((span) =>
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
        {woven.filter((j) => !(weaving && j === last)).map((j) => (
          <Path
            key={`f${j}`}
            d={weftPath(g, j)}
            stroke={dye}
            strokeWidth={3.2}
            strokeOpacity={0.92}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </G>
      {/* The interlace. Skipped only if the bolt is so long that painting it
          would blow the path budget — the cloth still reads, it just loses
          over/under, which is the right thing to drop first. */}
      {detail === 'full' && (
        <G>
          {woven.flatMap((j) =>
            Array.from({ length: cols }, (_, i) => i)
              .filter((i) => ridesOver(i, j))
              .map((i) => (
                <Path
                  key={`o${i}-${j}`}
                  // warpPath already pads half a row either side, so a single
                  // row is exactly the segment that should ride over the weft.
                  d={warpPath(g, i, j, j)}
                  stroke={tokens.color.warp}
                  strokeWidth={2.5}
                  strokeOpacity={0.95}
                  strokeLinecap="round"
                  fill="none"
                />
              )),
          )}
        </G>
      )}
      {weaving && <WeavingRow g={g} row={last} dye={dye} />}
    </Svg>
  );
}

/**
 * Today's row, boustrophedon: even rows run left to right, odd rows back.
 * The pass draws by dash offset over motion.weftPassMs (linear, like a thrown
 * shuttle), then the row beats up into place over motion.tensionMs. Reduce
 * motion: drawn in place.
 */
function useWeave() {
  const { reduced, ms } = useMotion();
  const pass = useSharedValue(reduced ? 1 : 0);
  const beat = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    const tension = ms('tensionMs');
    pass.value = withTiming(1, { duration: ms('weftPassMs'), easing: easing('linear') }, (done) => {
      if (done) beat.value = withTiming(1, { duration: tension, easing: easing('outCubic') });
    });
    // Once per mount: the parent mounts this only for a seal that just happened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { pass, beat };
}

function rowPoints(g: ClothGeom, row: number) {
  const pts = weftPoints(g, row).map(([x, y]) => [x, y] as [number, number]);
  return row % 2 === 0 ? pts : pts.reverse();
}

/** The row and the walnut shuttle riding its leading end, on one clock. */
function WeavingRow({ g, row, dye }: { g: ClothGeom; row: number; dye: string }) {
  const { pass, beat } = useWeave();
  const pts = useMemo(() => rowPoints(g, row), [g, row]);
  const length = useMemo(() => Math.ceil(polylineLength(pts)) + 1, [pts]);
  // Before the beat the row sits low in the open shed.
  const drop = g.sy * 0.6;
  const props = useAnimatedProps(() => {
    const dy = drop * (1 - beat.value);
    let d = '';
    for (let i = 0; i < pts.length; i++) d += (i === 0 ? 'M' : 'L') + pts[i][0] + ' ' + (pts[i][1] + dy);
    return { d, strokeDashoffset: length * (1 - pass.value) };
  });
  const shuttle = useAnimatedProps(() => {
    const at = pass.value * (pts.length - 1);
    const i = Math.max(0, Math.min(pts.length - 2, Math.floor(at)));
    const t = at - i;
    return {
      cx: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t,
      cy: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t + drop,
      opacity: pass.value > 0 && pass.value < 1 ? 1 : 0,
    };
  });
  if (pts.length < 2) return null;
  return (
    <>
      <AnimatedPath
        stroke={dye}
        strokeWidth={3.2}
        strokeOpacity={0.92}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={length}
        animatedProps={props}
      />
      <AnimatedEllipse rx={7} ry={2.5} fill={WALNUT} animatedProps={shuttle} />
    </>
  );
}
