import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SRBAI_QUESTIONS, type SrbaiAnswers } from '../lab/srbai';
import { ActionButton, ChoiceChip } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface SrbaiZoneProps {
  eyeballDates: string[];
  onSave: (answers: SrbaiAnswers) => void;
}

const SCALE = [1, 2, 3, 4, 5];

function LikertRow({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View style={styles.likertRow}>
      {SCALE.map((n) => (
        <ChoiceChip
          key={n}
          label={`${n}`}
          selected={value === n}
          onPress={() => onChange(n)}
          accessibilityHint={`${n} of 5`}
          style={styles.likertDot}
        />
      ))}
    </View>
  );
}

/**
 * §09/§19 — once a month: the SRBAI-initiation questions, one line
 * of free reflection, and the plain eyeball list of dates the app
 * believes you read. ~30 seconds; the only signal in the app that's
 * just asked rather than inferred from logs.
 */
export function SrbaiZone({ eyeballDates, onSave }: SrbaiZoneProps) {
  const [answers, setAnswers] = useState<[number | null, number | null, number | null, number | null]>([
    null,
    null,
    null,
    null,
  ]);
  const [reflection, setReflection] = useState('');
  const [showEyeball, setShowEyeball] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSave = answers.every((a) => a !== null);

  const setAnswer = (i: number, v: number) => {
    setAnswers((prev) => {
      const next = [...prev] as typeof prev;
      next[i] = v;
      return next;
    });
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      q1: answers[0]!,
      q2: answers[1]!,
      q3: answers[2]!,
      q4: answers[3]!,
      reflection: reflection.trim(),
    });
    setSaved(true);
  };

  if (saved) {
    return (
      <View style={styles.zone}>
        <Text style={styles.done}>Thanks — see you next month.</Text>
      </View>
    );
  }

  return (
    <View style={styles.zone}>
      <Text style={styles.label}>Once a month · ~30 seconds</Text>
      {SRBAI_QUESTIONS.map((q, i) => (
        <View key={q} style={styles.question}>
          <Text style={styles.questionText}>{q}</Text>
          <LikertRow value={answers[i]} onChange={(v) => setAnswer(i, v)} />
        </View>
      ))}
      <Text style={styles.scaleHint}>1 = strongly disagree · 5 = strongly agree</Text>

      <TextInput
        style={styles.reflectionInput}
        value={reflection}
        onChangeText={setReflection}
        placeholder="One line — anything stayed with you this month?"
        placeholderTextColor={tokens.color.ink40}
        multiline
      />

      <ActionButton
        label={`${showEyeball ? 'Hide' : 'Show'} the ${eyeballDates.length} day${eyeballDates.length === 1 ? '' : 's'} it thinks you read this month`}
        variant="link"
        onPress={() => setShowEyeball((v) => !v)}
        style={styles.eyeballToggle}
      />
      {showEyeball && (
        <View style={styles.eyeballList}>
          {eyeballDates.length === 0 ? (
            <Text style={styles.eyeballDate}>Nothing this month.</Text>
          ) : (
            eyeballDates.map((d) => (
              <Text key={d} style={styles.eyeballDate}>
                {d}
              </Text>
            ))
          )}
        </View>
      )}

      <ActionButton label="Save" onPress={handleSave} disabled={!canSave} style={styles.saveBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.ink15,
  },
  label: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
  },
  question: { gap: 8 },
  questionText: {
    fontFamily: tokens.font.scripture,
    fontSize: 15,
    lineHeight: 22,
    color: tokens.color.ink,
  },
  likertRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  likertDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 0,
  },
  scaleHint: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: tokens.color.ink40,
  },
  reflectionInput: {
    fontFamily: tokens.font.scripture,
    fontSize: 15,
    color: tokens.color.ink,
    borderWidth: 1,
    borderColor: tokens.color.ink15,
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  eyeballToggle: {
    alignSelf: 'flex-start',
  },
  eyeballList: {
    gap: 2,
  },
  eyeballDate: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink60,
  },
  saveBtn: {
    alignSelf: 'flex-start',
  },
  done: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink40,
  },
});
