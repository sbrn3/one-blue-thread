import { useMemo } from 'react';
import Svg, { G, Path } from 'react-native-svg';
import {
  clothSize,
  detailLevel,
  geometry,
  ridesOver,
  warpPath,
  warpSpans,
  weftPath,
  type Span,
} from './cloth';
import { tokens } from './tokens';

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
}

/**
 * A bolt of cloth. Presentational only — every coordinate comes from cloth.ts.
 *
 * Painted in three passes so the interlacing is genuine occlusion rather than a
 * texture: all warp, then the weft over it, then the warp segments that ride
 * over at alternating crossings.
 */
export function Cloth({ width, maxHeight, chapterCount, sealed, dye }: ClothProps) {
  const { g, spans, size, woven } = useMemo(() => {
    const geo = geometry(width, maxHeight, chapterCount, sealed);
    return {
      g: geo,
      spans: warpSpans(geo.dist),
      size: clothSize(geo),
      woven: sealed.map((s, j) => (s ? j : -1)).filter((j) => j >= 0),
    };
  }, [width, maxHeight, chapterCount, sealed]);

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
        {woven.map((j) => (
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
    </Svg>
  );
}
