import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AmendmentEntry } from '../lab/analysis/amendments';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface DiagnosticsSectionProps {
  diagnosticsText: string;
  amendments: AmendmentEntry[];
}

/**
 * §19/§20 "support with zero telemetry" — copy-diagnostics is the
 * whole support channel; nothing about this app phones home. The
 * amendment log alongside it is the changelog: what the app learned
 * and what you changed in response.
 */
export function DiagnosticsSection({ diagnosticsText, amendments }: DiagnosticsSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void Clipboard.setStringAsync(diagnosticsText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <View style={styles.wrap}>
      <ActionButton
        label={copied ? 'Copied' : 'Copy diagnostics'}
        variant="secondary"
        onPress={handleCopy}
        style={styles.copyBtn}
      />

      {amendments.length > 0 && (
        <View style={styles.log}>
          {amendments
            .slice()
            .reverse()
            .map((a, i) => (
              <Text key={`${a.ts}-${i}`} style={styles.logEntry}>
                {new Date(a.ts).toISOString().slice(0, 10)} — {a.text}
              </Text>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  copyBtn: {
    alignSelf: 'flex-start',
  },
  log: { gap: 4 },
  logEntry: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    lineHeight: 16,
    color: tokens.color.ink40,
  },
});
