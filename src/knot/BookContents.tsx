import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { contentsFor, type Headnote } from '../headnote';
import type { SqlDb } from '../log/db';
import { bookName } from '../text/canon';
import { Contents } from '../ui/Contents';
import { Ornament } from '../ui/Ornament';
import { OverviewLink } from '../ui/OverviewLink';
import { tokens } from '../ui/tokens';

interface BookContentsProps {
  db: SqlDb;
  book: string;
  /** Bumped by the knot when a headnote may have changed (the chapter viewer closed). */
  refreshKey: number;
  onBack: () => void;
  onOpen: (headnote: Headnote) => void;
}

function monthYear(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/**
 * Reading history → a book (docs/plans/bibleproject-book-videos): its
 * overview and its contents, one per reading, newest first. A screen inside
 * HistoryModal, never a Modal of its own (test/ui-contracts.test.ts).
 */
export function BookContents({ db, book, refreshKey, onBack, onOpen }: BookContentsProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const readings = useMemo(() => contentsFor(db, book), [db, book, refreshKey]);
  const withHeadnotes = readings.filter((r) => r.hasHeadnotes);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to reading history" style={styles.back}>
          <Text style={styles.backText}>‹ History</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Ornament kind="head" />
        <Text style={styles.book} accessibilityRole="header">
          {bookName(book)}
        </Text>
        <OverviewLink book={book} lead="" />
        {withHeadnotes.length === 0 ? (
          <Text style={styles.empty}>No headnotes in {bookName(book)} yet.</Text>
        ) : (
          withHeadnotes.map((r, i) => (
            <View key={`${r.startedOn}-${i}`} style={styles.reading}>
              <Text style={styles.label}>
                Contents · {monthYear(r.startedOn)}
                {i > 0 ? ' · earlier reading' : r.finished ? '' : ' · reading now'}
              </Text>
              <Contents rows={r.rows} onOpen={onOpen} />
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: tokens.space[2] },
  back: { minHeight: tokens.control.minTarget, justifyContent: 'center' },
  backText: { fontFamily: tokens.font.mono, fontSize: 13, color: tokens.color.ink40 },
  scroll: { paddingBottom: tokens.space[12], gap: tokens.space[2] },
  book: {
    fontFamily: tokens.font.display,
    fontWeight: '900',
    fontSize: 34,
    lineHeight: 38,
    color: tokens.color.thread,
  },
  reading: { marginTop: tokens.space[4], gap: tokens.space[2] },
  label: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
  },
  empty: { fontFamily: tokens.font.display, fontSize: 14, color: tokens.color.ink40, paddingVertical: tokens.space[4] },
});
