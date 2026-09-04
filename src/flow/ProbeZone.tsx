import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { bookName } from '../text/canon';
import { ActionButton, ChoiceChip } from '../ui/controls';
import { tokens } from '../ui/tokens';
import type { ProbeGrade } from '../lab/probe';

interface ProbeZoneProps {
  book: string;
  chapter: number;
  getChapterText: () => Promise<string>;
  onGrade: (grade: ProbeGrade) => void;
}

/**
 * §10/E9 — the next-day recall probe. Free recall on YESTERDAY's
 * chapter (distinct from RecallZone's Leitner passages), reveal, one
 * of four self-grades. Consequence-free, same guarantee as ordinary
 * recall: grading never touches seal, streak, weave, or dose.
 */
export function ProbeZone({ book, chapter, getChapterText, onGrade }: ProbeZoneProps) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [graded, setGraded] = useState(false);

  const reveal = async () => {
    setRevealed(await getChapterText());
  };

  const grade = (g: ProbeGrade) => {
    onGrade(g);
    setGraded(true);
  };

  if (graded) {
    return (
      <View style={styles.zone}>
        <Text style={styles.done}>Probe done for today.</Text>
      </View>
    );
  }

  return (
    <View style={styles.zone}>
      <Text style={styles.prompt}>
        Yesterday you read {bookName(book)} {chapter}. What do you remember?
      </Text>
      {revealed === null ? (
        <ActionButton label="Reveal" variant="secondary" onPress={() => void reveal()} style={styles.revealBtn} />
      ) : (
        <>
          <Text style={styles.revealed} numberOfLines={6}>
            {revealed}
          </Text>
          <View style={styles.gradeRow}>
            <ChoiceChip label="Held it" onPress={() => grade('held')} />
            <ChoiceChip label="Partly" onPress={() => grade('partial')} />
            <ChoiceChip label="Lost it" onPress={() => grade('lost')} />
          </View>
        </>
      )}
      <ActionButton
        label="Skip"
        variant="link"
        onPress={() => grade('skipped')}
        accessibilityHint="Skip today's probe"
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
  prompt: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.ink,
  },
  revealBtn: {
    alignSelf: 'flex-start',
  },
  revealed: {
    fontFamily: tokens.font.scripture,
    fontStyle: 'italic',
    fontSize: 17,
    lineHeight: 26,
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
