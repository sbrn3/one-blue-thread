import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../ui/tokens';

interface ChapterStripProps {
  hasHistory: boolean;
  onOpen: () => void;
}

/**
 * §04 — the trigger into "Reading history" (HistoryModal.tsx), which owns
 * the actual virtualized, searchable, paginated list. Gating your own data
 * behind the daily ritual would be user-hostile, so this is reachable any
 * time, not just after sealing.
 *
 * docs/plans/knot-declutter, direction A — sits in the everyday tier as a
 * row, not an ActionButton, so it reads as one list with the weave and the
 * cue rather than as a form control among prose.
 */
export function ChapterStrip({ hasHistory, onOpen }: ChapterStripProps) {
  if (!hasHistory) {
    return (
      <View style={styles.wrap}>
        <View style={styles.row}>
          <Text style={styles.emptyLabel}>Nothing sealed yet.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel="Reading history"
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Text style={styles.summary}>Reading history</Text>
        <Text style={styles.chevron}>▸</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: tokens.color.ink15,
  },
  row: {
    minHeight: tokens.control.minTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  rowPressed: {
    opacity: 0.7,
  },
  summary: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 15,
    color: tokens.color.ink,
  },
  emptyLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink40,
  },
  chevron: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.ink40,
  },
});
