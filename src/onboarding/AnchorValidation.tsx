import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChoiceChip } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface AnchorValidationProps {
  onResult: (validated: boolean) => void;
}

const QUESTIONS = ['Did this happen yesterday?', 'The day before?', 'The day before that?'];

/**
 * §05 — three taps, eight seconds. Catches the dominant onboarding
 * failure mode: an anchor that sounds concrete ("in the morning")
 * but isn't actually an event that happens every day. Fewer than 3/3
 * means the anchor isn't stable enough to hang a habit on; the user
 * can still keep it, but it's stored validated=false.
 */
export function AnchorValidation({ onResult }: AnchorValidationProps) {
  const [answers, setAnswers] = useState<Array<boolean | null>>([null, null, null]);

  const answer = (i: number, value: boolean) => {
    const next = [...answers];
    next[i] = value;
    setAnswers(next);
    if (next.every((a) => a !== null)) {
      onResult(next.every(Boolean));
    }
  };

  const allAnswered = answers.every((a) => a !== null);
  const score = answers.filter(Boolean).length;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Is this actually stable?</Text>
      {QUESTIONS.map((q, i) => (
        <View key={q} style={styles.row}>
          <Text style={styles.question}>{q}</Text>
          <View style={styles.yn}>
            <ChoiceChip label="Yes" selected={answers[i] === true} onPress={() => answer(i, true)} />
            <ChoiceChip
              label="No"
              selected={answers[i] === false}
              onPress={() => answer(i, false)}
              style={answers[i] === false ? styles.ynNoSelected : undefined}
            />
          </View>
        </View>
      ))}
      {allAnswered && (
        <Text style={[styles.verdict, score === 3 ? styles.verdictPass : styles.verdictFail]}>
          {score === 3
            ? '✓ Stable. This is something that actually happens — good anchor.'
            : `✗ Only ${score} of 3. This doesn't happen reliably enough to hang a habit on — try something that happens every day.`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: tokens.color.dyeSoft,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  label: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: tokens.color.thread,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  question: {
    fontFamily: tokens.font.display,
    fontSize: 13.5,
    color: tokens.color.ink,
    flexShrink: 1,
  },
  yn: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  ynNoSelected: { backgroundColor: tokens.color.madder },
  verdict: {
    marginTop: 8,
    fontFamily: tokens.font.display,
    fontSize: 13,
    lineHeight: 19,
  },
  verdictPass: { color: tokens.color.thread, fontWeight: '500' },
  verdictFail: { color: tokens.color.madder },
});
