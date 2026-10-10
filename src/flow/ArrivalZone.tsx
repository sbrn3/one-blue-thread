import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import type { Cue } from '../cue';
import { bookName } from '../text/canon';
import { Ornament } from '../ui/Ornament';
import { OverviewLink } from '../ui/OverviewLink';
import { fellLinePath, fellLinePoints } from '../ui/fellLine';
import { easing, useMotion } from '../ui/motion';
import { tokens } from '../ui/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const WEFT_H = 10;
const WEFT_AMP = 1.4;
// fellLine stops 16 px short of the width it is given (room for the seal's pill).
const FELL_END_INSET = 16;

/**
 * Direction A's arrival signature (S07): one weft drawn under the header as
 * the page opens, once per mount. The same deterministic wave as the seal
 * line, so the day opens and closes on one thread. Reduce motion: drawn.
 */
function ArrivalWeft() {
  const { reduced, ms } = useMotion();
  const [width, setWidth] = useState(0);
  const d = useMemo(() => fellLinePath(width + FELL_END_INSET, 0, WEFT_AMP, WEFT_H / 2), [width]);
  const length = useMemo(() => {
    const pts = fellLinePoints(width + FELL_END_INSET, 0, WEFT_AMP, WEFT_H / 2);
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return Math.ceil(len) + 1;
  }, [width]);
  const drawn = useSharedValue(0);
  useEffect(() => {
    if (width <= 0 || drawn.value > 0) return;
    drawn.value = reduced ? 1 : withTiming(1, { duration: ms('arrivalWeftMs'), easing: easing('outCubic') });
    // Once per mount: a later width change redraws the path but doesn't replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));

  return (
    <View
      style={styles.weft}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 && (
        <Svg width={width} height={WEFT_H}>
          <AnimatedPath
            d={d}
            stroke={tokens.color.thread}
            strokeWidth={2}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={length}
            animatedProps={props}
          />
        </Svg>
      )}
    </View>
  );
}

interface ArrivalZoneProps {
  today: string; // 'YYYY-MM-DD'
  cue: Cue | null;
  book: string;
  chapter: number;
  sittingIndex: number;
  sittingsTotal: number;
  /** Today's sitting's first and last verse; null before the text has loaded. */
  verseStart: number | null;
  verseEnd: number | null;
  daysInBook: number;
  /** §14 E11, applied — omitted (the default) shows the day count, as before. */
  showDayCount: boolean;
  /** §14 E12, applied — omitted (the default) shows the sitting suffix, as before. */
  showSittingCount: boolean;
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function ArrivalZone({
  today,
  cue,
  book,
  chapter,
  sittingIndex,
  sittingsTotal,
  verseStart,
  verseEnd,
  daysInBook,
  showDayCount,
  showSittingCount,
}: ArrivalZoneProps) {
  // A book's first sitting opens like a book: a headpiece, and BibleProject's
  // overview before you begin (docs/plans/bibleproject-book-videos).
  const firstSitting = chapter === 1 && sittingIndex === 0;
  // §14 E11/E12, applied: the day and sitting counts each show only while on.
  const dayLine = showDayCount ? `${formatDay(today)} · day ${daysInBook} in ${bookName(book)}` : formatDay(today);
  const verses =
    verseStart === null || verseEnd === null
      ? null
      : verseStart === verseEnd
        ? `verse ${verseStart}`
        : `verses ${verseStart}–${verseEnd}`;
  const sitting = showSittingCount && sittingsTotal > 1 ? `sitting ${sittingIndex + 1} of ${sittingsTotal}` : null;
  const subline = [verses, sitting].filter(Boolean).join(' · ');

  // Direction A (docs/plans/reading-screen-and-motion, S06): three short lines
  // and the cue, so the first verse is on the first screen even on a busy day.
  // Read top to bottom: date, title, verses, cue.
  return (
    <View style={styles.zone}>
      {firstSitting && <Ornament kind="head" />}
      <Text style={styles.day}>{dayLine}</Text>
      {firstSitting && <OverviewLink book={book} lead="Before you begin:" />}
      <Text style={styles.chapter} accessibilityRole="header">
        {bookName(book)} {chapter}
      </Text>
      {subline !== '' && <Text style={styles.subline}>{subline}</Text>}
      <Text style={styles.echo}>
        {cue ? `After ${cue.anchor}, in ${cue.place}.` : 'No cue set yet — read when it suits you.'}
      </Text>
      <ArrivalWeft />
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    paddingHorizontal: 32,
    paddingTop: 30,
  },
  day: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
  },
  chapter: {
    fontFamily: tokens.font.display,
    fontWeight: '900',
    fontSize: 34,
    lineHeight: 38,
    color: tokens.color.ink,
    marginTop: 14,
    marginBottom: 4,
  },
  subline: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    color: tokens.color.ink40,
  },
  echo: {
    fontFamily: tokens.font.scriptureItalic,
    fontSize: 16,
    lineHeight: 22,
    color: tokens.color.ink60,
    marginTop: 10,
  },
  weft: {
    height: WEFT_H,
    marginTop: 14,
    marginBottom: 18,
  },
});
