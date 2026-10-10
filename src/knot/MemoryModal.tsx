import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { AccessibilityInfo, findNodeHandle, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecallZone } from '../flow/RecallZone';
import type { Grade, Passage } from '../log/types';
import { effectiveRung, ladderStep } from '../memory/ladder';
import { MAX_RECALL_CAP } from '../memory/leitner';
import type { Memory, PassageRef, PassageResult } from '../memory/memory';
import { useMemoryEpoch } from '../state/memoryEpoch';
import { bookName } from '../text/canon';
import type { TextProvider, Verse } from '../text/provider';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';
import { groupMarks, markedLabel } from './markGroups';
import { PassagePicker, type PickerMode } from './PassagePicker';

interface MemoryModalProps {
  visible: boolean;
  memory: Memory;
  text: TextProvider;
  today: string;
  onClose: () => void;
}

type Screen =
  | { kind: 'list' }
  | { kind: 'passage'; id: number }
  | { kind: 'picker'; mode: PickerMode; id?: number; initial?: { book: string; chapter: number; start: number; end: number } }
  | { kind: 'review'; passages: Passage[] };

const STEP_WORDS = ['', 'a few key words hidden', 'about half the key words hidden', 'nearly all the key words hidden', 'the whole passage hidden'];

function reference(p: Pick<Passage, 'book' | 'chapter' | 'verse_start' | 'verse_end'>): string {
  const range = p.verse_start === p.verse_end ? `${p.verse_start}` : `${p.verse_start}–${p.verse_end}`;
  return `${bookName(p.book)} ${p.chapter}:${range}`;
}

function daysUntil(today: string, date: string | null): number {
  if (!date) return 0;
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

function dueLabel(today: string, date: string | null): string {
  const n = daysUntil(today, date);
  if (n <= 0) return 'due today';
  if (n === 1) return 'tomorrow';
  return `in ${n} days`;
}

function refusal(r: PassageResult, label: string): string | null {
  if (r.ok) return null;
  if (r.reason === 'duplicate') return `You're already learning ${label}.`;
  if (r.reason === 'invalid') return 'Pick a first and last verse.';
  return 'That passage is gone.';
}

function Bars({ step }: { step: number }) {
  return (
    <View style={styles.bars} accessible accessibilityLabel={`Step ${step} of 4`}>
      {[1, 2, 3, 4].map((n) => (
        <View key={n} style={[styles.bar, n <= step && styles.barOn]} />
      ))}
    </View>
  );
}

/**
 * docs/plans/recall-settings, direction A (mockup.html#option-a) — the
 * memory library: every passage you're learning and every verse you've
 * marked, the daily cap, Review now, and a page per passage to practise,
 * edit, start over or delete it. One Modal, rendered as a sibling inside the
 * knot's modal tree; the passage page, picker and review are screens inside
 * it, never a second Modal (test/ui-contracts.test.ts). Nothing here can
 * touch seal, streak, weave, dose or the experiments — it only calls Memory.
 */
export function MemoryModal({ visible, memory, text, today, onClose }: MemoryModalProps) {
  const insets = useSafeAreaInsets();
  const bump = useMemoryEpoch((s) => s.bump);
  const shownToday = useMemoryEpoch((s) => s.shownToday);
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [tick, setTick] = useState(0);
  const [confirm, setConfirm] = useState<'reset' | 'delete' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pageText, setPageText] = useState<{ key: string; text: string | null; failed: boolean } | null>(null);
  const chapters = useRef(new Map<string, Verse[]>());
  const headingRef = useRef<Text>(null);
  const pickerBack = useRef<(() => void) | null>(null);

  const learned = useMemo(() => (visible ? memory.learned() : []), [visible, memory, tick]);
  const marked = useMemo(() => (visible ? memory.marked() : []), [visible, memory, tick]);
  const markGroups = useMemo(() => groupMarks(marked), [marked]);
  const cap = useMemo(() => memory.recallCap(), [memory, tick]);
  const due = learned.filter((p) => daysUntil(today, p.due_date) <= 0);

  const changed = useCallback(() => {
    setTick((t) => t + 1);
    bump();
  }, [bump]);

  const go = useCallback((next: Screen) => {
    setConfirm(null);
    setMessage(null);
    setScreen(next);
  }, []);

  // Each visit starts on the list.
  useEffect(() => {
    if (visible) {
      setScreen({ kind: 'list' });
      setTick((t) => t + 1);
    }
  }, [visible]);

  // Move screen-reader focus to the new screen's heading.
  useEffect(() => {
    if (!visible) return;
    const handle = headingRef.current ? findNodeHandle(headingRef.current) : null;
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, [screen.kind, visible]);

  // One fetch per chapter for the session — the list never loads text.
  const chapterText = useCallback(
    async (p: Pick<Passage, 'book' | 'chapter' | 'verse_start' | 'verse_end'>): Promise<string> => {
      const key = `${p.book}:${p.chapter}`;
      let verses = chapters.current.get(key);
      if (!verses) {
        verses = await text.getChapter(p.book, p.chapter);
        chapters.current.set(key, verses);
      }
      return verses
        .filter((v) => v.verse >= p.verse_start && v.verse <= p.verse_end)
        .map((v) => v.text)
        .join(' ');
    },
    [text],
  );

  const current = screen.kind === 'passage' ? [...learned, ...marked].find((p) => p.id === screen.id) ?? null : null;
  const currentKey = current ? `${current.id}:${current.verse_start}-${current.verse_end}` : null;
  useEffect(() => {
    if (!current || !currentKey) return;
    let live = true;
    setPageText({ key: currentKey, text: null, failed: false });
    chapterText(current)
      .then((t) => live && setPageText({ key: currentKey, text: t, failed: false }))
      .catch(() => live && setPageText({ key: currentKey, text: null, failed: true }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentKey]);

  const back = useCallback(() => {
    if (screen.kind === 'list') onClose();
    else if (screen.kind === 'picker' && pickerBack.current) pickerBack.current();
    else if (screen.kind === 'picker' && screen.mode === 'edit' && screen.id !== undefined) go({ kind: 'passage', id: screen.id });
    else go({ kind: 'list' });
  }, [screen, onClose, go]);

  const startReview = (ids: Passage[]) => go({ kind: 'review', passages: ids });
  const reviewNow = () => {
    const shown = new Set(shownToday);
    startReview([...due.filter((p) => !shown.has(p.id)), ...due.filter((p) => shown.has(p.id))]);
  };

  const onConfirmPicker = (ref: PassageRef) => {
    if (screen.kind !== 'picker') return;
    const label = reference({ book: ref.book, chapter: ref.chapter, verse_start: ref.verseStart, verse_end: ref.verseEnd });
    let result: PassageResult;
    if (screen.mode === 'add') result = memory.add(ref, today);
    else if (screen.mode === 'edit' && screen.id !== undefined) result = memory.editRange(screen.id, ref.verseStart, ref.verseEnd);
    else if (screen.mode === 'learn' && screen.id !== undefined) {
      result = memory.learnRange(screen.id, ref.verseStart, ref.verseEnd, today);
    } else return;
    const why = refusal(result, label);
    if (why) {
      setMessage(why);
      return;
    }
    changed();
    if (screen.mode === 'edit' && screen.id !== undefined) go({ kind: 'passage', id: screen.id });
    else go({ kind: 'list' });
  };

  const setCap = (n: number) => {
    memory.setRecallCap(n);
    changed();
  };

  const gradeInReview = (id: number, g: Grade) => {
    memory.grade(id, g, today);
    changed();
  };

  const header = (title: string, action: string, onAction: () => void, label?: string) => (
    <View style={styles.headerRow}>
      <Text ref={headingRef} style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Pressable style={styles.headerBtn} onPress={onAction} accessibilityRole="button" accessibilityLabel={label ?? action}>
        <Text style={styles.headerBtnText}>{action}</Text>
      </Pressable>
    </View>
  );

  return (
    <Sheet visible={visible} onRequestClose={back}>
      <View style={[styles.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]} accessibilityViewIsModal>
        {screen.kind === 'list' && (
          <ScrollView contentContainerStyle={styles.scroll}>
            {header('Memory', 'Close', onClose)}

            <View style={styles.capRow}>
              <Text style={styles.capText}>Each day, show</Text>
              <View
                style={styles.stepper}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Passages shown each day"
                accessibilityValue={{ min: 1, max: MAX_RECALL_CAP, now: cap, text: String(cap) }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(e) => setCap(cap + (e.nativeEvent.actionName === 'increment' ? 1 : -1))}
              >
                <Pressable style={styles.stepBtn} onPress={() => setCap(cap - 1)} disabled={cap <= 1} importantForAccessibility="no">
                  <Text style={[styles.stepGlyph, cap <= 1 && styles.dim]}>−</Text>
                </Pressable>
                <Text style={styles.stepValue}>{cap}</Text>
                <Pressable style={styles.stepBtn} onPress={() => setCap(cap + 1)} disabled={cap >= MAX_RECALL_CAP} importantForAccessibility="no">
                  <Text style={[styles.stepGlyph, cap >= MAX_RECALL_CAP && styles.dim]}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.toolbar}>
              {due.length > 0 && <ActionButton label={`Review now · ${due.length} due`} onPress={reviewNow} />}
              <ActionButton label="Add a passage" variant="secondary" onPress={() => go({ kind: 'picker', mode: 'add' })} />
            </View>

            <Text style={styles.label}>Learning · {learned.length}</Text>
            {learned.length === 0 && (
              <Text style={styles.empty}>Nothing learned yet. Add a passage, or mark a verse while reading.</Text>
            )}
            {learned.map((p) => {
              const when = dueLabel(today, p.due_date);
              return (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  onPress={() => go({ kind: 'passage', id: p.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`${reference(p)}, step ${ladderStep(effectiveRung(p.rung, p.box))} of 4, ${when}`}
                >
                  <Text style={styles.ref}>{reference(p)}</Text>
                  <View style={styles.rowMeta}>
                    <Bars step={ladderStep(effectiveRung(p.rung, p.box))} />
                    <Text style={[styles.when, when === 'due today' && styles.whenDue]}>{when}</Text>
                  </View>
                </Pressable>
              );
            })}

            {marked.length > 0 && <Text style={styles.label}>Marked · {marked.length}</Text>}
            {markGroups.map((g) => (
              <View key={g.book}>
                <Text style={styles.bookHeading} accessibilityRole="header">
                  {bookName(g.book)}
                </Text>
                {g.marks.map((p) => (
                  <View key={p.id} style={styles.row}>
                    <Pressable
                      style={styles.markRef}
                      onPress={() => go({ kind: 'passage', id: p.id })}
                      accessibilityRole="button"
                      accessibilityLabel={`Marked, ${reference(p)}, ${markedLabel(p.marked_at)}`}
                    >
                      <Text style={styles.ref}>
                        <Text style={styles.markDot}>● </Text>
                        {reference(p)}
                      </Text>
                      <Text style={styles.when}>{markedLabel(p.marked_at)}</Text>
                    </Pressable>
                    <ActionButton
                      label="Learn this"
                      variant="secondary"
                      onPress={() =>
                        go({
                          kind: 'picker',
                          mode: 'learn',
                          id: p.id,
                          initial: { book: p.book, chapter: p.chapter, start: p.verse_start, end: p.verse_end },
                        })
                      }
                    />
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        )}

        {screen.kind === 'passage' && (
          <ScrollView contentContainerStyle={styles.scroll}>
            {header(current ? reference(current) : 'Memory', '‹ Memory', () => go({ kind: 'list' }), 'Back to Memory')}
            {!current ? (
              <Text style={styles.empty}>That passage is gone.</Text>
            ) : (
              <>
                {current.promoted_at !== null && <Bars step={ladderStep(effectiveRung(current.rung, current.box))} />}
                {pageText?.key === currentKey && pageText.failed ? (
                  <Text style={styles.message}>Couldn&apos;t load the text. It will show when you practise.</Text>
                ) : (
                  <Text style={styles.passageText}>{(pageText?.key === currentKey && pageText.text) || 'Loading…'}</Text>
                )}
                {text.attribution() ? <Text style={styles.attribution}>{text.attribution()}</Text> : null}
                <View style={styles.facts}>
                  {current.promoted_at !== null ? (
                    <>
                      <Text style={styles.fact}>
                        Step {ladderStep(effectiveRung(current.rung, current.box))} of 4 — {STEP_WORDS[ladderStep(effectiveRung(current.rung, current.box))]}
                      </Text>
                      <Text style={styles.fact}>Next due {dueLabel(today, current.due_date)}</Text>
                    </>
                  ) : (
                    <Text style={styles.fact}>Marked, not learning yet</Text>
                  )}
                  <Text style={styles.fact}>
                    {current.source === 'added' ? 'Added from the picker' : `Marked while reading ${bookName(current.book)} ${current.chapter}`}
                  </Text>
                </View>

                {confirm === null && (
                  <View style={styles.stack}>
                    {current.promoted_at !== null ? (
                      <ActionButton label="Practise now" onPress={() => startReview([current])} />
                    ) : (
                      <ActionButton
                        label="Learn this"
                        onPress={() =>
                          go({
                            kind: 'picker',
                            mode: 'learn',
                            id: current.id,
                            initial: { book: current.book, chapter: current.chapter, start: current.verse_start, end: current.verse_end },
                          })
                        }
                      />
                    )}
                    <ActionButton
                      label="Edit verses"
                      variant="secondary"
                      onPress={() =>
                        go({
                          kind: 'picker',
                          mode: 'edit',
                          id: current.id,
                          initial: { book: current.book, chapter: current.chapter, start: current.verse_start, end: current.verse_end },
                        })
                      }
                    />
                    {current.promoted_at !== null && (
                      <ActionButton label="Start over" variant="secondary" onPress={() => setConfirm('reset')} />
                    )}
                    <Pressable style={styles.danger} onPress={() => setConfirm('delete')} accessibilityRole="button" accessibilityLabel="Delete">
                      <Text style={styles.dangerText}>Delete</Text>
                    </Pressable>
                  </View>
                )}

                {confirm === 'reset' && (
                  <View style={styles.confirm}>
                    <Text style={styles.confirmText}>Start over? Its schedule goes back to the beginning.</Text>
                    <View style={styles.toolbar}>
                      <ActionButton
                        label="Start over"
                        onPress={() => {
                          memory.reset(current.id, today);
                          setConfirm(null);
                          changed();
                        }}
                      />
                      <ActionButton label="Cancel" variant="link" onPress={() => setConfirm(null)} />
                    </View>
                  </View>
                )}

                {confirm === 'delete' && (
                  <View style={styles.confirm}>
                    <Text style={[styles.confirmText, styles.dangerCopy]}>Delete {reference(current)}? This can&apos;t be undone.</Text>
                    <View style={styles.toolbar}>
                      <Pressable
                        style={styles.danger}
                        onPress={() => {
                          memory.remove(current.id);
                          changed();
                          go({ kind: 'list' });
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${reference(current)}`}
                      >
                        <Text style={styles.dangerText}>Delete</Text>
                      </Pressable>
                      <ActionButton label="Cancel" variant="link" onPress={() => setConfirm(null)} />
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        )}

        {screen.kind === 'picker' && (
          <View style={styles.pickerWrap}>
            <PassagePicker
              mode={screen.mode}
              text={text}
              initial={screen.initial}
              message={message}
              onSelectionChange={() => setMessage(null)}
              backRef={pickerBack}
              onConfirm={onConfirmPicker}
              onCancel={() => (screen.mode === 'edit' && screen.id !== undefined ? go({ kind: 'passage', id: screen.id }) : go({ kind: 'list' }))}
            />
          </View>
        )}

        {screen.kind === 'review' && (
          <ScrollView contentContainerStyle={styles.scroll}>
            {header('Review', '‹ Memory', () => go({ kind: 'list' }), 'Back to Memory')}
            <RecallZone
              passages={screen.passages}
              getVerseText={chapterText}
              onGrade={gradeInReview}
              onSkip={() => go({ kind: 'list' })}
              doneLabel="All reviewed."
              flush
            />
            <ActionButton label="Back to Memory" variant="secondary" onPress={() => go({ kind: 'list' })} />
          </ScrollView>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: tokens.color.paper,
    paddingHorizontal: 24,
  },
  scroll: {
    paddingBottom: 40,
    gap: 4,
  },
  pickerWrap: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  title: {
    flex: 1,
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 22,
    color: tokens.color.ink,
  },
  headerBtn: {
    minHeight: tokens.control.minTarget,
    minWidth: tokens.control.minTarget,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerBtnText: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    color: tokens.color.ink40,
  },
  capRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  capText: {
    fontFamily: tokens.font.display,
    fontSize: 14,
    color: tokens.color.ink,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.color.ink15,
    borderRadius: tokens.radius.input,
  },
  stepBtn: {
    minWidth: tokens.control.minTarget,
    minHeight: tokens.control.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepGlyph: {
    fontFamily: tokens.font.display,
    fontSize: 18,
    color: tokens.color.thread,
  },
  dim: {
    color: tokens.color.ink15,
  },
  stepValue: {
    minWidth: 28,
    textAlign: 'center',
    fontFamily: tokens.font.mono,
    fontSize: 14,
    color: tokens.color.ink,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
    paddingTop: 18,
    paddingBottom: 6,
  },
  empty: {
    fontFamily: tokens.font.display,
    fontSize: 14,
    color: tokens.color.ink40,
    paddingVertical: 8,
  },
  row: {
    minHeight: tokens.control.minTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: tokens.color.ink15,
  },
  pressed: {
    opacity: 0.7,
  },
  ref: {
    flexShrink: 1,
    fontFamily: tokens.font.mono,
    fontSize: 13,
    letterSpacing: 0.5,
    color: tokens.color.ink,
  },
  markRef: {
    flex: 1,
    minHeight: tokens.control.minTarget,
    justifyContent: 'center',
  },
  bookHeading: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 14,
    color: tokens.color.ink,
    paddingTop: 12,
    paddingBottom: 4,
  },
  markDot: {
    color: tokens.color.madder,
  },
  rowMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  when: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: tokens.color.ink40,
  },
  whenDue: {
    color: tokens.color.thread,
    fontWeight: '600',
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
  passageText: {
    fontFamily: tokens.font.scriptureItalic,
    fontSize: 18,
    lineHeight: 27,
    color: tokens.color.ink,
    paddingVertical: 8,
  },
  attribution: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    color: tokens.color.ink40,
  },
  facts: {
    gap: 4,
    paddingVertical: 12,
  },
  fact: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink40,
  },
  stack: {
    gap: 8,
  },
  danger: {
    minHeight: tokens.control.minTarget,
    paddingHorizontal: 18,
    borderRadius: tokens.radius.input,
    borderWidth: 1,
    borderColor: tokens.color.madder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.madder,
  },
  confirm: {
    gap: 8,
    paddingTop: 4,
  },
  confirmText: {
    fontFamily: tokens.font.display,
    fontSize: 14,
    color: tokens.color.ink,
  },
  dangerCopy: {
    color: tokens.color.madder,
  },
  message: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.madder,
  },
});
