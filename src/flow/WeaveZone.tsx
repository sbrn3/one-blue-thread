import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Cloth } from '../ui/Cloth';
import { dyeFor } from '../ui/dye';
import { bookName } from '../text/canon';
import { tokens } from '../ui/tokens';

interface WeaveZoneProps {
  /** Book id — names the cloth and picks its dye. */
  book: string;
  /** The book's chapter count: the width of the bolt in warp threads. */
  chapterCount: number;
  /** One entry per calendar day since the book started; true = a day read. */
  sealed: boolean[];
  /** §14 E3, applied — omitted/null (the default) shows no count, as before. */
  streak?: number | null;
}

/**
 * §04 zone 4 — the current book as a bolt of woven cloth.
 *
 * The warp is the book: one thread per chapter, strung before you start. Each
 * day you read passes the weft through once. A day you missed leaves bare warp
 * you can see through, and the warp across a gap goes slack — a mirror, not a
 * threat (§01, §02). No fire icons and no loss-aversion copy; the mirror shows
 * no numbers by default, and E3 governs whether a streak count appears at all.
 *
 * Replaces the calendar-month grid: the zone now answers "how is this book
 * going" rather than "how was this month".
 */
export function WeaveZone({ book, chapterCount, sealed, streak }: WeaveZoneProps) {
  const [width, setWidth] = useState(0);
  const days = sealed.length;
  const read = sealed.filter(Boolean).length;

  return (
    <View style={styles.zone} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>
          {bookName(book)} · {chapterCount} {chapterCount === 1 ? 'chapter' : 'chapters'}
        </Text>
        {streak != null && (
          <Text style={styles.streak}>
            {streak} day{streak === 1 ? '' : 's'}
          </Text>
        )}
      </View>
      {width > 0 && (
        <Cloth
          width={width}
          maxHeight={CLOTH_MAX_HEIGHT}
          chapterCount={chapterCount}
          sealed={sealed}
          dye={dyeFor(book)}
        />
      )}
      <Text style={styles.caption}>
        {read} of {days} day{days === 1 ? '' : 's'} woven
      </Text>
    </View>
  );
}

const CLOTH_MAX_HEIGHT = 520;

const styles = StyleSheet.create({
  zone: {
    paddingHorizontal: 32,
    paddingVertical: 40,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  label: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
    flexShrink: 1,
  },
  streak: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    letterSpacing: 0.5,
    color: tokens.color.thread,
  },
  caption: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 0.5,
    color: tokens.color.ink40,
  },
});
