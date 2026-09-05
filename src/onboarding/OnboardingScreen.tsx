import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface OnboardingScreenProps {
  step: string; // "1 of 6 · The anchor"
  title: string;
  sub?: string;
  children?: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
}

/** Shared layout for every onboarding screen (§05) — step label, heading, body, primary CTA, optional skip. */
export function OnboardingScreen({
  step,
  title,
  sub,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  onSkip,
  skipLabel,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.step}>{step}</Text>
        <Text style={styles.title}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        {children}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(32, insets.bottom) }]}>
        <ActionButton
          label={primaryLabel}
          onPress={onPrimary}
          disabled={primaryDisabled}
          style={styles.primaryBtn}
        />
        {onSkip ? (
          <ActionButton
            label={skipLabel ?? 'Skip'}
            variant="link"
            onPress={onSkip}
            style={styles.skipBtn}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: tokens.color.paper },
  content: { paddingHorizontal: 32, paddingTop: 64, paddingBottom: 48, gap: 4 },
  step: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: tokens.color.thread,
    marginBottom: 12,
  },
  title: {
    fontFamily: tokens.font.display,
    fontWeight: '900',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: tokens.color.ink,
    marginBottom: 12,
  },
  sub: {
    fontFamily: tokens.font.scripture,
    fontSize: 16,
    lineHeight: 24,
    color: tokens.color.ink40,
    marginBottom: 22,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    paddingTop: 12,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 16,
  },
  skipBtn: { marginTop: 14 },
});
