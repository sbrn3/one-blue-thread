import { StyleSheet, Text, View } from 'react-native';
import type { Cue } from '../cue';
import { bookName } from '../text/canon';
import { Ornament } from '../ui/Ornament';
import { OverviewLink } from '../ui/OverviewLink';
import { tokens } from '../ui/tokens';

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
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    paddingHorizontal: 32,
    paddingTop: 30,
    paddingBottom: 18,
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
});
