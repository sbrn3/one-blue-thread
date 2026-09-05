import { StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../ui/controls';
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
 */
export function ChapterStrip({ hasHistory, onOpen }: ChapterStripProps) {
  if (!hasHistory) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyLabel}>Nothing sealed yet.</Text>
      </View>
    );
  }

  return <ActionButton label="Reading history" variant="secondary" onPress={onOpen} style={styles.button} />;
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 12 },
  emptyLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink40,
  },
  button: {
    alignSelf: 'flex-start',
  },
});
