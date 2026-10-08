import { Pressable, StyleSheet, Text, View } from 'react-native';
import { headnoteRange, type ContentsRow, type Headnote } from '../headnote';
import { tokens } from './tokens';

interface ContentsProps {
  rows: ContentsRow[];
  /** Opens a headnote's chapter. Omitted, rows are read-only (e.g. at "You finished"). */
  onOpen?: (headnote: Headnote) => void;
}

/**
 * A book's contents page, made of the reader's headnotes
 * (docs/plans/bibleproject-book-videos): chapter number, the headnote in the
 * app's voice, a dotted leader, the reference. A run of chapters with no
 * headnote shows only its numbers — a gap is information, not a reproach.
 * The line wraps; the reference never truncates.
 */
export function Contents({ rows, onOpen }: ContentsProps) {
  let lastChapter: number | null = null;
  return (
    <View>
      {rows.map((row) => {
        if (row.kind === 'bare') {
          const span = row.from === row.to ? `${row.from}` : `${row.from}–${row.to}`;
          return (
            <View
              key={`bare-${row.from}`}
              style={styles.row}
              accessible
              accessibilityLabel={row.from === row.to ? `Chapter ${row.from}, no headnote` : `Chapters ${row.from} to ${row.to}, no headnote`}
            >
              <Text style={[styles.number, styles.bare]}>{span}</Text>
              <View style={[styles.leader, styles.leaderBare]} />
            </View>
          );
        }
        const h = row.headnote;
        const ref = headnoteRange(h);
        const showNumber = row.chapter !== lastChapter;
        lastChapter = row.chapter;
        const body = (
          <>
            <Text style={styles.number}>{showNumber ? row.chapter : ''}</Text>
            <Text style={styles.line}>{h.text}</Text>
            <View style={styles.leader} />
            <Text style={styles.ref}>{ref}</Text>
          </>
        );
        return onOpen ? (
          <Pressable
            key={h.localDate}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => onOpen(h)}
            accessibilityRole="button"
            accessibilityLabel={`${h.text}. ${ref}`}
            accessibilityHint="Opens the chapter"
          >
            {body}
          </Pressable>
        ) : (
          <View key={h.localDate} style={styles.row} accessible accessibilityLabel={`${h.text}. ${ref}`}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: tokens.space[2],
    paddingVertical: tokens.space[2],
    borderTopWidth: 1,
    borderTopColor: tokens.color.ink15,
  },
  pressed: { opacity: 0.7 },
  number: {
    alignSelf: 'flex-start',
    minWidth: 22,
    fontFamily: tokens.font.mono,
    fontWeight: '600',
    fontSize: 12,
    lineHeight: 22,
    color: tokens.color.ink40,
  },
  bare: {},
  line: {
    flexShrink: 1,
    maxWidth: '72%',
    fontFamily: tokens.font.display,
    fontWeight: '500',
    fontSize: 15,
    lineHeight: 22,
    color: tokens.color.ink,
  },
  // The dotted leader is the flexible filler between the line and its reference.
  leader: {
    flex: 1,
    minWidth: 16,
    marginBottom: 6,
    borderBottomWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: tokens.color.ink40,
  },
  leaderBare: { borderColor: tokens.color.ink15 },
  ref: {
    flexShrink: 0,
    fontFamily: tokens.font.mono,
    fontSize: 12,
    lineHeight: 22,
    color: tokens.color.ink40,
  },
});
