import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Grade, Passage } from '../log/types';
import { bookName } from '../text/canon';
import { ActionButton, ChoiceChip } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface RecallZoneProps {
  passages: Passage[]; // already capped at DAILY_RECALL_CAP by the caller
  getVerseText: (p: Passage) => Promise<string>;
  onGrade: (id: number, grade: Grade) => void;
  onSkip: () => void;
}

function reference(p: Passage): string {
  const range = p.verse_start === p.verse_end ? `${p.verse_start}` : `${p.verse_start}-${p.verse_end}`;
  return `${bookName(p.book)} ${p.chapter}:${range}`;
}

/**
 * §04 zone 1b / §21 — up to 2 memory passages. Reference shown; you
 * recall, reveal, self-grade. Skippable in one tap; a failed recall
 * (grading "lost") is consequence-free — Memory.grade() has no
 * import capable of touching seal, streak, weave, or dose (§13.6).
 * The caller doesn't render this zone at all when nothing is due —
 * there is deliberately no empty state.
 */
export function RecallZone({ passages, getVerseText, onGrade, onSkip }: RecallZoneProps) {
  const [revealedText, setRevealedText] = useState<Record<number, string>>({});
  const [done, setDone] = useState<Set<number>>(new Set());
  const [skipped, setSkipped] = useState(false);

  const remaining = passages.filter((p) => !done.has(p.id));

  const reveal = async (p: Passage) => {
    const text = await getVerseText(p);
    setRevealedText((prev) => ({ ...prev, [p.id]: text }));
  };

  const grade = (p: Passage, g: Grade) => {
    onGrade(p.id, g);
    setDone((prev) => new Set(prev).add(p.id));
  };

  const skipAll = () => {
    onSkip();
    setSkipped(true);
  };

  if (skipped || remaining.length === 0) {
    return (
      <View style={styles.zone}>
        <Text style={styles.done}>Recall done for today.</Text>
      </View>
    );
  }

  return (
    <View style={styles.zone}>
      {remaining.map((p) => (
        <View key={p.id} style={styles.card}>
          <Text style={styles.reference}>{reference(p)}</Text>
          {revealedText[p.id] === undefined ? (
            <ActionButton label="Reveal" variant="secondary" onPress={() => void reveal(p)} style={styles.revealBtn} />
          ) : (
            <>
              <Text style={styles.revealed}>{revealedText[p.id]}</Text>
              <View style={styles.gradeRow}>
                <ChoiceChip label="Held it" onPress={() => grade(p, 'held')} />
                <ChoiceChip label="Partly" onPress={() => grade(p, 'partial')} />
                <ChoiceChip label="Lost it" onPress={() => grade(p, 'lost')} />
              </View>
            </>
          )}
        </View>
      ))}
      <ActionButton
        label="Skip"
        variant="link"
        onPress={skipAll}
        accessibilityHint="Skip recall for today"
        style={styles.skipBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    gap: 16,
  },
  card: {
    gap: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.ink15,
  },
  reference: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    letterSpacing: 0.5,
    color: tokens.color.ink40,
  },
  revealBtn: {
    alignSelf: 'flex-start',
  },
  revealed: {
    fontFamily: tokens.font.scripture,
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 27,
    color: tokens.color.ink,
  },
  gradeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skipBtn: {
    alignSelf: 'flex-start',
  },
  done: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink40,
  },
});
