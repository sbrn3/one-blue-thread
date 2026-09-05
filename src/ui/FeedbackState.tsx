import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from './tokens';

interface ErrorStateProps {
  /** Calm, already-allowlisted copy — never raw error text/stack traces. */
  message: string;
  onRetry: () => void;
}

/**
 * The root-level "no route is blank" fallback (docs/plans/app-quality-foundations).
 * Presentational only — no database/service import, so it can render even
 * when the thing that failed was constructing those services.
 */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.title}>Couldn’t load today’s reading</Text>
      <Text style={styles.message}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        accessibilityRole="button"
        accessibilityLabel="Retry"
      >
        <Text style={styles.retryLabel}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
    backgroundColor: tokens.color.paper,
  },
  title: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 19,
    color: tokens.color.ink,
    textAlign: 'center',
  },
  message: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.ink60,
    textAlign: 'center',
  },
  retry: {
    marginTop: 8,
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: tokens.color.thread,
  },
  retryPressed: {
    opacity: 0.85,
  },
  retryLabel: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 15,
    color: tokens.color.paper,
  },
});
