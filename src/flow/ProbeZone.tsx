import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { bookName } from '../text/canon';
import { ActionButton, ChoiceChip } from '../ui/controls';
import { tokens } from '../ui/tokens';
import type { ProbeGrade } from '../lab/probe';

interface ProbeZoneProps {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  getSpanText: () => Promise<string>;
  onGrade: (grade: ProbeGrade) => void;
}

/**
 * §10/E9 — the next-day recall probe. Free recall on a few verses of
 * YESTERDAY's chapter (distinct from RecallZone's Leitner passages),
 * reveal, one of four self-grades. Consequence-free, same guarantee as
 * ordinary recall: grading never touches seal, streak, weave, or dose.
 */
export function ProbeZone({ book, chapter, verseStart, verseEnd, getSpanText, onGrade }: ProbeZoneProps) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [graded, setGraded] = useState(false);

  const single = verseStart === verseEnd;
  const range = single ? `${verseStart}` : `${verseStart}–${verseEnd}`;

  const reveal = async () => {
    try {
      setRevealed(await getSpanText());
    } catch {
      // stay on the prompt; Reveal can be pressed again
    }
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
        Yesterday you read {bookName(book)} {chapter}.{' '}
        {single ? `Do you remember verse ${verseStart}?` : `What do you remember of verses ${range}?`}
      </Text>
      <Text style={styles.reference}>
        {bookName(book)} {chapter}:{range}
      </Text>
      {revealed === null ? (
        <ActionButton label="Reveal" variant="secondary" onPress={() => void reveal()} style={styles.revealBtn} />
      ) : (
        <>
          <Text style={styles.revealed}>{revealed}</Text>
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
    fontFamily: tokens.font.scriptureItalic,
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
