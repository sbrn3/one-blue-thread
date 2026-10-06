import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Grade, Passage } from '../log/types';
import { toCloze } from '../memory/cloze';
import type { ClozeToken } from '../memory/cloze';
import { effectiveRung, hintStyle, ladderStep } from '../memory/ladder';
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

/** What a hidden word shows: a ruled gap of underscores, or its first letter plus dashes. */
function hiddenLabel(t: Extract<ClozeToken, { hidden: true }>, style: 'stub' | 'gap' | 'none'): string {
  if (style === 'stub') return `${t.lead}${t.stub}${'–'.repeat(Math.max(2, t.width - 1))}${t.trail}`;
  return `${t.lead}${'_'.repeat(Math.max(3, t.width))}${t.trail}`;
}

/** One label for the whole paragraph — a nested-Text tree is read as a single node. */
function paragraphLabel(clozeTokens: ClozeToken[], style: 'stub' | 'gap' | 'none'): string {
  return clozeTokens
    .map((t) => (!t.hidden ? t.text : style === 'stub' ? `blank, starts with ${t.stub}` : 'blank'))
    .join(' ');
}

/**
 * §04 zone 1b / §21 — up to 2 memory passages. Each is a cloze card:
 * some key words hidden (more as the passage is held), or the whole
 * passage at the top of the ladder. You recall, reveal, self-grade.
 * Skippable in one tap; a failed recall (grading "lost") is
 * consequence-free — Memory.grade() has no import capable of touching
 * seal, streak, weave, or dose (§13.6). The caller doesn't render this
 * zone at all when nothing is due — there is deliberately no empty state.
 * (docs/plans/recall-cloze-ladder)
 */
export function RecallZone({ passages, getVerseText, onGrade, onSkip }: RecallZoneProps) {
  const [texts, setTexts] = useState<Record<number, string>>({});
  const [revealedIds, setRevealedIds] = useState<Set<number>>(new Set());
  const [done, setDone] = useState<Set<number>>(new Set());
  const [skipped, setSkipped] = useState(false);
  const loading = useRef<Set<number>>(new Set());

  const remaining = passages.filter((p) => !done.has(p.id));

  // Load each passage's text up front so the cloze card can be drawn;
  // a failed load just leaves the plain reference-only card.
  const load = async (p: Passage): Promise<string | null> => {
    try {
      return await getVerseText(p);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    for (const p of passages) {
      if (texts[p.id] !== undefined || loading.current.has(p.id)) continue;
      loading.current.add(p.id);
      void load(p).then((t) => {
        loading.current.delete(p.id);
        if (t !== null) setTexts((prev) => ({ ...prev, [p.id]: t }));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passages]);

  // Memoized so a re-render never re-picks the hidden words.
  const clozes = useMemo(() => {
    const out: Record<number, ClozeToken[] | null> = {};
    for (const p of passages) {
      const t = texts[p.id];
      out[p.id] = t === undefined ? null : toCloze(t, effectiveRung(p.rung, p.box), p.id);
    }
    return out;
  }, [passages, texts]);

  const reveal = async (p: Passage) => {
    if (texts[p.id] === undefined) {
      const t = (await load(p)) ?? (await load(p)); // one retry
      if (t === null) return; // stay on the card; Reveal can be pressed again
      setTexts((prev) => ({ ...prev, [p.id]: t }));
    }
    setRevealedIds((prev) => new Set(prev).add(p.id));
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
      {remaining.map((p) => {
        const rung = effectiveRung(p.rung, p.box);
        const step = ladderStep(rung);
        const style = hintStyle(rung);
        const cloze = clozes[p.id];
        const isRevealed = revealedIds.has(p.id);
        return (
          <View key={p.id} style={styles.card}>
            <View style={styles.refRow}>
              <Text style={styles.reference}>{reference(p)}</Text>
              <View style={styles.bars} accessible accessibilityLabel={`Step ${step} of 4`}>
                {[1, 2, 3, 4].map((n) => (
                  <View key={n} style={[styles.bar, n <= step && styles.barOn]} />
                ))}
              </View>
            </View>
            {!isRevealed && cloze && (
              <Text style={styles.revealed} accessibilityLabel={paragraphLabel(cloze, style)}>
                {cloze.map((t, i) => (
                  <Text key={i}>
                    {i > 0 ? ' ' : ''}
                    {t.hidden ? <Text style={[styles.hint, style === 'stub' && styles.stub]}>{hiddenLabel(t, style)}</Text> : t.text}
                  </Text>
                ))}
              </Text>
            )}
            {!isRevealed && !cloze && texts[p.id] !== undefined && (
              <Text style={styles.fromMemory}>Say it from memory</Text>
            )}
            {isRevealed ? (
              <>
                <Text style={styles.revealed}>
                  {cloze
                    ? cloze.map((t, i) => (
                        <Text key={i}>
                          {i > 0 ? ' ' : ''}
                          {t.hidden ? <Text style={styles.hint}>{t.text}</Text> : t.text}
                        </Text>
                      ))
                    : texts[p.id]}
                </Text>
                <View style={styles.gradeRow}>
                  <ChoiceChip label="Held it" onPress={() => grade(p, 'held')} />
                  <ChoiceChip label="Partly" onPress={() => grade(p, 'partial')} />
                  <ChoiceChip label="Lost it" onPress={() => grade(p, 'lost')} />
                </View>
              </>
            ) : (
              <ActionButton label="Reveal" variant="secondary" onPress={() => void reveal(p)} style={styles.revealBtn} />
            )}
          </View>
        );
      })}
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
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reference: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    letterSpacing: 0.5,
    color: tokens.color.ink40,
  },
  bars: {
    flexDirection: 'row',
    gap: 3,
  },
  bar: {
    width: 14,
    height: 3,
    backgroundColor: tokens.color.ink15,
  },
  barOn: {
    backgroundColor: tokens.color.thread,
  },
  fromMemory: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink40,
  },
  hint: {
    color: tokens.color.thread,
  },
  stub: {
    fontWeight: '600',
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
