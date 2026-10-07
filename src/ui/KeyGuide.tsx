import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Provider } from '../text/translationService';
import { tokens } from './tokens';

// Signup pages and steps verified against api.bible (FAQ, API key guide) and
// api.esv.org/docs (2026-10-07). Shared by onboarding and the knot so the two
// can't drift (docs/plans/translation-key-guide).
const KEY_GUIDE: Record<Provider, { url: string; host: string; steps: string[] }> = {
  niv: {
    url: 'https://api.bible/sign-up/starter',
    host: 'api.bible',
    steps: [
      'Create a free Starter account at api.bible (non-commercial use only).',
      'In your dashboard, click Plan, edit your plan, and add the NIV as one of your Bibles.',
      'Copy the API key from the top-right of your dashboard and paste it below.',
    ],
  },
  esv: {
    url: 'https://api.esv.org/account/create-application/',
    host: 'api.esv.org',
    steps: [
      "Sign in or create an account at api.esv.org — you'll be asked to accept Crossway's statement of faith.",
      'Create an API application; any name and description will do.',
      "Copy the application's key and paste it below.",
    ],
  },
};

interface KeyGuideProps {
  provider: Provider;
}

/** Why a key is needed, how to get one, and a link to the publisher's signup page. */
export function KeyGuide({ provider }: KeyGuideProps) {
  const [linkFailed, setLinkFailed] = useState(false);
  const guide = KEY_GUIDE[provider];

  const open = () => {
    setLinkFailed(false);
    Linking.openURL(guide.url).catch(() => setLinkFailed(true));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.body}>The publisher licenses this translation, so you&apos;ll need your own key — it&apos;s free.</Text>
      {guide.steps.map((step, i) => (
        <Text key={step} style={styles.body}>
          {i + 1}. {step}
        </Text>
      ))}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open ${guide.host} to get a key`}
        onPress={open}
        style={styles.link}
      >
        <Text style={styles.linkText}>Open {guide.host}</Text>
      </Pressable>
      {linkFailed && <Text style={styles.body}>Couldn&apos;t open a browser — visit {guide.url}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  body: {
    fontFamily: tokens.font.display,
    fontSize: 12,
    lineHeight: 18,
    color: tokens.color.ink60,
  },
  link: { alignSelf: 'flex-start', minHeight: tokens.control.minTarget, justifyContent: 'center' },
  linkText: { fontFamily: tokens.font.display, fontWeight: '700', fontSize: 13, color: tokens.color.thread },
});
