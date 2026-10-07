import { StyleSheet, Text, View } from 'react-native';
import type { Release } from '../whatsNew';
import { tokens } from '../ui/tokens';

interface WhatsNewHistoryProps {
  releases: readonly Release[];
}

/** Every "What's new" note, newest first, so a dismissed card is never lost. */
export function WhatsNewHistory({ releases }: WhatsNewHistoryProps) {
  return (
    <View style={styles.wrap}>
      {releases.map((release) => (
        <View key={release.id} style={styles.release}>
          <Text style={styles.id}>{release.id}</Text>
          {release.lines.map((line, i) => (
            <Text key={i} style={styles.line}>
              · {line}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[3] },
  release: { gap: tokens.space[1] },
  id: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    color: tokens.color.ink40,
  },
  line: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    lineHeight: 18,
    color: tokens.color.ink60,
  },
});
