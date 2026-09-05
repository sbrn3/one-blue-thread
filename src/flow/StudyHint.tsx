import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../ui/tokens';

interface StudyHintProps {
  onDismiss: () => void;
}

/**
 * §04 — a one-time, restrained hint that verse taps do something. No
 * animation, no event, no analytics signal, and no dependency on the study
 * feature itself beyond the copy — it exists purely so a first-time reader
 * doesn't have to guess.
 */
export function StudyHint({ onDismiss }: StudyHintProps) {
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text style={styles.text}>Tap a verse for study notes or to remember it.</Text>
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss this hint"
        style={({ pressed }) => [styles.dismiss, pressed && styles.dismissPressed]}
        hitSlop={8}
      >
        <Text style={styles.dismissLabel}>Got it</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginHorizontal: 32,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: tokens.color.ink15,
  },
  text: {
    flexShrink: 1,
    fontFamily: tokens.font.display,
    fontSize: 13,
    color: tokens.color.ink60,
  },
  dismiss: {
    minHeight: tokens.control.minTarget,
    minWidth: tokens.control.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissPressed: {
    opacity: 0.7,
  },
  dismissLabel: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 13,
    color: tokens.color.thread,
  },
});
