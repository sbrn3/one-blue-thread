import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../ui/tokens';

interface MemoryStripProps {
  due: number;
  total: number;
  onOpen: () => void;
}

/**
 * docs/plans/recall-settings — the everyday-tier row into the memory
 * library (MemoryModal.tsx). Same row pattern as ChapterStrip, and always
 * tappable: the library is where the first passage gets added.
 */
export function MemoryStrip({ due, total, onOpen }: MemoryStripProps) {
  const status = total === 0 ? 'Nothing yet' : `${due} due · ${total} ${total === 1 ? 'passage' : 'passages'}`;
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Memory, ${status}`}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Text style={styles.summary}>Memory</Text>
        <View style={styles.right}>
          <Text style={styles.status}>{status}</Text>
          <Text style={styles.chevron}>▸</Text>
        </View>
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
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  status: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: tokens.color.ink40,
  },
  chevron: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.ink40,
  },
});
