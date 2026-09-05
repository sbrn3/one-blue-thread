import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatDiagnosticsForSharing, type SupportSummary } from '../lab/diagnostics';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface DiagnosticsSectionProps {
  summary: SupportSummary;
}

/**
 * §19/§20 "support with zero telemetry" — copy-diagnostics is the whole
 * support channel; nothing about this app phones home. The preview below
 * is rendered from the exact same string Copy places on the clipboard
 * (formatDiagnosticsForSharing), so there is never a gap between what is
 * shown and what is actually shared.
 */
export function DiagnosticsSection({ summary }: DiagnosticsSectionProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const payload = formatDiagnosticsForSharing(summary);

  const handleCopy = () => {
    setCopyFailed(false);
    Clipboard.setStringAsync(payload)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => setCopyFailed(true));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>Nothing is sent automatically.</Text>

      <ScrollView style={styles.previewBox} nestedScrollEnabled>
        <Text style={styles.preview}>{payload}</Text>
      </ScrollView>

      <ActionButton
        label={copied ? 'Copied' : 'Copy diagnostics'}
        variant="secondary"
        onPress={handleCopy}
        style={styles.copyBtn}
      />
      {copied && (
        <Text style={styles.liveStatus} accessibilityLiveRegion="polite" accessibilityRole="text">
          Copied to clipboard.
        </Text>
      )}
      {copyFailed && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>Couldn&apos;t copy diagnostics.</Text>
          <ActionButton label="Retry" variant="link" onPress={handleCopy} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  lead: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 13,
    color: tokens.color.ink,
  },
  previewBox: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: tokens.color.ink15,
    borderRadius: tokens.radius.input,
    padding: 10,
  },
  preview: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    lineHeight: 16,
    color: tokens.color.ink60,
  },
  copyBtn: {
    alignSelf: 'flex-start',
  },
  liveStatus: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: tokens.color.thread,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: tokens.color.madder,
  },
});
