import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Release } from '../whatsNew';
import { tokens } from '../ui/tokens';

interface WhatsNewCardProps {
  releases: Release[];
  onDismiss: () => void;
}

/**
 * The study hint's sibling: a quiet, flat note above the day's reading after
 * an update. Never a modal, no animation, no event — dismissed once for good.
 * Every note stays readable in the knot (More › About › What's new).
 */
export function WhatsNewCard({ releases, onDismiss }: WhatsNewCardProps) {
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <Text style={styles.heading}>New in this update</Text>
      {releases.flatMap((release) =>
        release.lines.map((line, i) => (
          <Text key={`${release.id}-${i}`} style={styles.line}>
            · {line}
          </Text>
        )),
      )}
      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss what's new"
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
    gap: 4,
    marginHorizontal: 32,
    marginBottom: 12,
    paddingTop: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: tokens.color.ink15,
  },
  heading: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 13,
    color: tokens.color.ink60,
  },
  line: {
    fontFamily: tokens.font.display,
    fontSize: 13,
    color: tokens.color.ink60,
  },
  dismiss: {
    alignSelf: 'flex-end',
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
