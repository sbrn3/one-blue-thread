import { StyleSheet, Text, View } from 'react-native';
import type { PhaseMetric } from '../lab/analysis/reversal';
import { PHASE_DAYS } from '../lab/phases';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';
import { PhaseChart } from './PhaseChart';

interface ReportPromptProps {
  recommendation: string;
  reportText: string;
  phases?: PhaseMetric[];
  onApply: () => void;
  onKeep: () => void;
}

/**
 * §15 report anatomy — a verdict, a confidence level, and one
 * concrete change the app is asking permission to make. Surfaces
 * once, after a seal (§15), never before or during reading. "Keep
 * as is" is a legitimate answer, not a wrong one — the engine advises,
 * it does not govern.
 */
export function ReportPrompt({ recommendation, reportText, phases, onApply, onKeep }: ReportPromptProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>A report is ready</Text>
      {phases && phases.length > 0 && <PhaseChart phases={phases} totalDays={PHASE_DAYS} />}
      <Text style={styles.mono}>{reportText}</Text>
      <Text style={styles.recommendation}>{recommendation}</Text>
      <View style={styles.buttons}>
        <ActionButton label="Apply" onPress={onApply} />
        <ActionButton label="Keep as is" variant="secondary" onPress={onKeep} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: tokens.color.dyeSoft,
    borderRadius: 12,
    padding: 18,
    gap: 12,
  },
  label: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: tokens.color.thread,
  },
  mono: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    lineHeight: 18,
    color: tokens.color.ink,
  },
  recommendation: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 14,
    color: tokens.color.ink,
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
