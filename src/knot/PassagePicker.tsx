import { useCallback, useEffect, useMemo, useState, useRef, type MutableRefObject } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { PassageRef } from '../memory/memory';
import { bookName, type Book } from '../text/canon';
import { bundledChapterCount } from '../text';
import type { TextProvider, Verse } from '../text/provider';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';
import { EMPTY_SEL, filterBooks, isSelected, rangeLabel, selectedRange, tapVerse, type RangeSel } from './passageRange';

// 'headnote' (docs/plans/bibleproject-book-videos): narrow a headnote to verses
// of its own chapter — always opened with `initial`, so back cancels instead of
// walking up to another chapter, and none of the memory copy shows.
export type PickerMode = 'add' | 'edit' | 'learn' | 'headnote';

interface PassagePickerProps {
  mode: PickerMode;
  text: TextProvider;
  /** edit / learn open straight on the verses step with this range selected. */
  initial?: { book: string; chapter: number; start: number; end: number };
  /** A refusal from the caller (duplicate, invalid, gone) — shown above the confirm button. */
  message?: string | null;
  onConfirm: (ref: PassageRef) => void;
  onCancel: () => void;
  /** Called when the reader changes chapter or selection — lets the caller clear a stale refusal. */
  onSelectionChange?: () => void;
  /** Set to this picker's own step-back, so the host's hardware back steps through the picker. */
  backRef?: MutableRefObject<(() => void) | null>;
}

type Step = { kind: 'books' } | { kind: 'chapters'; book: string } | { kind: 'verses'; book: string; chapter: number };

const CONFIRM: Record<PickerMode, string> = { add: 'Add', edit: 'Save', learn: 'Learn', headnote: 'Use these verses' };
const TITLE: Record<PickerMode, string> = { add: 'Add a passage', edit: 'Edit verses', learn: 'Learn this', headnote: 'Which verses?' };

/**
 * docs/plans/recall-settings — the memory library's passage picker and
 * range editor (mockup.html#picker). Book → chapter → tap a first and a
 * last verse, with a live reference line before confirming. Ranges stay
 * inside one chapter. Rendered as a screen inside MemoryModal, never as its
 * own Modal (test/ui-contracts.test.ts).
 */
export function PassagePicker({ mode, text, initial, message, onConfirm, onCancel, onSelectionChange, backRef }: PassagePickerProps) {
  const [step, setStep] = useState<Step>(
    initial ? { kind: 'verses', book: initial.book, chapter: initial.chapter } : { kind: 'books' },
  );
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState<RangeSel>(initial ? { start: initial.start, end: initial.end } : EMPTY_SEL);
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const listRef = useRef<FlatList<Verse>>(null);
  // Opening on a range scrolls to it once the verses arrive. Not via
  // initialScrollIndex: with varying row heights, a re-render after a tap
  // (extraData) could leave that list blank until it was scrolled.
  const scrolledToInitial = useRef(false);

  const books = useMemo(() => filterBooks(query).filter((b) => bundledChapterCount(b.id) > 0), [query]);

  const versesKey = step.kind === 'verses' ? `${step.book}:${step.chapter}` : null;
  useEffect(() => {
    if (step.kind !== 'verses') return;
    let live = true;
    setVerses(null);
    setLoadError(false);
    text
      .getChapter(step.book, step.chapter)
      .then((v) => {
        if (live) setVerses(v);
      })
      .catch(() => {
        if (live) setLoadError(true);
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versesKey, attempt, text]);

  useEffect(() => {
    if (!initial || !verses || scrolledToInitial.current) return;
    scrolledToInitial.current = true;
    const index = Math.max(0, Math.min(initial.start - 2, verses.length - 1));
    if (index > 0) setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses]);

  const back = useCallback(() => {
    if (step.kind === 'verses' && !initial) {
      setSel(EMPTY_SEL);
      setStep({ kind: 'chapters', book: step.book });
    } else if (step.kind === 'chapters') setStep({ kind: 'books' });
    else onCancel();
  }, [step, initial, onCancel]);

  useEffect(() => {
    if (!backRef) return;
    backRef.current = back;
    return () => {
      backRef.current = null;
    };
  }, [back, backRef]);

  // A refusal belongs to the range it refused.
  const stepKey = step.kind === 'verses' ? `${step.book}:${step.chapter}` : step.kind;
  useEffect(() => {
    onSelectionChange?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, sel.start, sel.end]);

  const range = selectedRange(sel);
  const confirm = () => {
    if (step.kind !== 'verses' || !range) return;
    onConfirm({ book: step.book, chapter: step.chapter, verseStart: range.start, verseEnd: range.end });
  };

  const backLabel = step.kind === 'books' || initial ? 'Cancel' : step.kind === 'chapters' ? '‹ Books' : '‹ Chapters';
  const heading =
    step.kind === 'books' ? TITLE[mode] : step.kind === 'chapters' ? bookName(step.book) : `${bookName(step.book)} ${step.chapter}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title} accessibilityRole="header">
          {heading}
        </Text>
        <Pressable style={styles.headerBtn} onPress={back} accessibilityRole="button" accessibilityLabel={backLabel.replace('‹ ', 'Back to ')}>
          <Text style={styles.headerBtnText}>{backLabel}</Text>
        </Pressable>
      </View>

      {step.kind === 'books' && (
        <>
          <TextInput
            style={styles.search}
            placeholder="Find a book…"
            placeholderTextColor={tokens.color.ink40}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            accessibilityLabel="Find a book"
          />
          <FlatList
            data={books}
            keyExtractor={(b: Book) => b.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                onPress={() => setStep({ kind: 'chapters', book: item.id })}
                accessibilityRole="button"
                accessibilityLabel={item.name}
              >
                <Text style={styles.rowText}>{item.name}</Text>
                <Text style={styles.chevron}>▸</Text>
              </Pressable>
            )}
            ListEmptyComponent={<Text style={styles.quiet}>No book matches.</Text>}
          />
        </>
      )}

      {step.kind === 'chapters' && (
        <View style={styles.grid}>
          {Array.from({ length: bundledChapterCount(step.book) }, (_, i) => i + 1).map((ch) => (
            <Pressable
              key={ch}
              style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
              onPress={() => {
                setSel(EMPTY_SEL);
                setStep({ kind: 'verses', book: step.book, chapter: ch });
              }}
              accessibilityRole="button"
              accessibilityLabel={`Chapter ${ch}`}
            >
              <Text style={styles.cellText}>{ch}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {step.kind === 'verses' && (
        <>
          <Text style={styles.quiet}>Tap the first verse, then the last.</Text>
          {loadError ? (
            <View style={styles.center}>
              <Text style={styles.message}>Couldn&apos;t load this chapter.</Text>
              <ActionButton label="Retry" onPress={() => setAttempt((a) => a + 1)} />
            </View>
          ) : verses === null ? (
            <Text style={styles.quiet}>Loading…</Text>
          ) : (
            <FlatList
              data={verses}
              keyExtractor={(v) => String(v.verse)}
              style={styles.list}
              extraData={sel}
              initialNumToRender={initial ? Math.min(verses.length, initial.end + 10) : 20}
              onScrollToIndexFailed={({ index, averageItemLength }) => {
                listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: false });
                setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 50);
              }}
              ref={listRef}
              renderItem={({ item }) => {
                const on = isSelected(sel, item.verse);
                return (
                  <Pressable
                    style={[styles.verse, on && styles.verseOn]}
                    onPress={() => setSel((s) => tapVerse(s, item.verse))}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`Verse ${item.verse}${on ? ', selected' : ''}. ${item.text}`}
                  >
                    <Text style={styles.verseText}>
                      <Text style={styles.verseNum}>{item.verse} </Text>
                      {item.text}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}
          <View style={styles.footer}>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            {mode === 'edit' ? <Text style={styles.quiet}>Editing keeps its schedule; the ladder steps back one.</Text> : null}
            <View style={styles.footerRow}>
              <Text style={styles.reference}>{rangeLabel(bookName(step.book), step.chapter, sel)}</Text>
              <ActionButton label={CONFIRM[mode]} onPress={confirm} disabled={!range} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  search: {
    minHeight: tokens.control.minTarget,
    borderWidth: 1,
    borderColor: tokens.color.ink15,
    borderRadius: tokens.radius.input,
    paddingHorizontal: 14,
    fontFamily: tokens.font.display,
    fontSize: 14,
    color: tokens.color.ink,
  },
  row: {
    minHeight: tokens.control.minTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: tokens.color.ink15,
  },
  pressed: {
    opacity: 0.7,
  },
  rowText: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.ink,
  },
  chevron: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.ink40,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cell: {
    width: tokens.control.minTarget + 2,
    height: tokens.control.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.color.ink15,
    borderRadius: 8,
  },
  cellText: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    color: tokens.color.ink,
  },
  list: {
    flex: 1,
  },
  verse: {
    minHeight: tokens.control.minTarget,
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  verseOn: {
    backgroundColor: tokens.color.markSoft,
    borderLeftWidth: 2,
    borderLeftColor: tokens.color.thread,
  },
  verseText: {
    fontFamily: tokens.font.scripture,
    fontSize: 16,
    lineHeight: 25,
    color: tokens.color.ink,
  },
  verseNum: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    color: tokens.color.ink40,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: tokens.color.ink15,
    paddingTop: 10,
    gap: 6,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reference: {
    flex: 1,
    fontFamily: tokens.font.mono,
    fontSize: 13,
    letterSpacing: 0.5,
    color: tokens.color.ink,
  },
  quiet: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink40,
  },
  message: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.madder,
  },
  center: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
});
