import { StyleSheet, Text, View } from 'react-native';
import type { Cue } from '../cue';
import { bookName } from '../text/canon';
import { tokens } from '../ui/tokens';

interface ArrivalZoneProps {
  today: string; // 'YYYY-MM-DD'
  cue: Cue | null;
  book: string;
  chapter: number;
  sittingIndex: number;
  sittingsTotal: number;
  daysInBook: number;
  /** §14 E11, applied — omitted (the default) shows the day count, as before. */
  showDayCount: boolean;
  /** §14 E12, applied — omitted (the default) shows the sitting suffix, as before. */
  showSittingCount: boolean;
}

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function ArrivalZone({
  today,
  cue,
  book,
  chapter,
  sittingIndex,
  sittingsTotal,
  daysInBook,
  showDayCount,
  showSittingCount,
}: ArrivalZoneProps) {
  const chapterLabel =
    showSittingCount && sittingsTotal > 1
      ? `${bookName(book)} ${chapter} · sitting ${sittingIndex + 1} of ${sittingsTotal}`
      : `${bookName(book)} ${chapter}`;

  return (
    <View style={styles.zone}>
      <Text style={styles.day}>{formatDay(today)}</Text>
      <Text style={styles.echo}>
        {cue ? `After ${cue.anchor}, in ${cue.place}.` : 'No cue set yet — read when it suits you.'}
      </Text>
      <Text style={styles.chapter}>{chapterLabel}</Text>
      {showDayCount && (
        <Text style={styles.progress}>
          Day {daysInBook} in {bookName(book)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    minHeight: 400,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 12,
  },
  day: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
  },
  echo: {
    fontFamily: tokens.font.scripture,
    fontStyle: 'italic',
    fontSize: 19,
    lineHeight: 28,
    color: tokens.color.ink60,
  },
  chapter: {
    fontFamily: tokens.font.display,
    fontWeight: '900',
    fontSize: 34,
    color: tokens.color.ink,
    marginTop: 16,
  },
  progress: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink40,
  },
});
