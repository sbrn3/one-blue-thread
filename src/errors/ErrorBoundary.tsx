import * as Clipboard from 'expo-clipboard';
import { Component, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../ui/tokens';
import { getBootstrapDiagnostics, logBootstrapError } from './index';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * §19 error log — the root boundary. It is mounted OUTSIDE AppRuntime (see
 * App.tsx) specifically so it also catches openDb()/createServices() failing
 * synchronously during AppRuntime's own render, not just failures deeper in
 * the tree — before this, a failed database open had no boundary above it at
 * all. It never requires a database: bootstrap failures go through
 * logBootstrapError, which keeps a bounded in-memory copy for "Copy startup
 * details" regardless of whether a database exists yet.
 *
 * Must be a class component; React has no hook equivalent for
 * getDerivedStateFromError/componentDidCatch.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    logBootstrapError(error.message, info.componentStack ?? error.stack ?? null);
  }

  // Clearing the caught error remounts only this boundary's children
  // (AppRuntime), because React discards the failed subtree entirely on
  // catch — the next render of `children` is a fresh mount, re-running
  // useMemo(() => openDb(), []) and everything downstream of it.
  retry = (): void => {
    this.setState({ error: null });
  };

  copyDetails = (): void => {
    const details = getBootstrapDiagnostics()
      .map((e) => `${new Date(e.ts).toISOString()} ${e.message}`)
      .join('\n');
    void Clipboard.setStringAsync(details || 'No startup details recorded.');
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Something went wrong.</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          <Pressable
            onPress={this.retry}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text style={styles.buttonLabel}>Retry</Text>
          </Pressable>
          <Pressable
            onPress={this.copyDetails}
            style={({ pressed }) => [styles.linkButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Copy startup details"
          >
            <Text style={styles.linkLabel}>Copy startup details</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: tokens.color.paper,
  },
  title: {
    fontFamily: tokens.font.display,
    fontWeight: '900',
    fontSize: 20,
    color: tokens.color.ink,
  },
  message: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    color: tokens.color.ink60,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    minHeight: tokens.control.minTarget,
    minWidth: tokens.control.minTarget,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.input,
    backgroundColor: tokens.color.thread,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 15,
    color: tokens.color.paper,
  },
  linkButton: {
    minHeight: tokens.control.minTarget,
    minWidth: tokens.control.minTarget,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink40,
    textDecorationLine: 'underline',
  },
});
