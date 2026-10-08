import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, findNodeHandle, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { headnoteRange } from '../headnote';
import { PassagePicker } from '../knot/PassagePicker';
import type { TextProvider } from '../text/provider';
import { HeadnoteEditor } from '../ui/HeadnoteEditor';
import { tokens } from '../ui/tokens';

export interface NarrowedRange {
  chapter: number;
  start: number;
  end: number;
}

interface HeadnoteSheetProps {
  visible: boolean;
  /** "Philippians 4" — the sheet's title and the field's label. */
  heading: string;
  passageLabel: string;
  initialText: string;
  text: TextProvider;
  /** The chapter a headnote may be narrowed within, and where the picker starts; null hides "choose verses". */
  narrowable: { book: string; chapter: number; start: number; end: number } | null;
  onSave: (words: string, narrowed?: NarrowedRange) => void;
  /** Present only when today's headnote already exists. */
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Writing today's headnote, after the seal (docs/plans/bibleproject-book-videos).
 * Its own bottom-sheet Modal, styled as VerseContextSheet, so the field sits
 * outside the reading flow's ScrollView: the keyboard can't cover it and the
 * seal's scroll lock can't trap it. Choosing verses swaps the field for the
 * passage picker — never nested in a ScrollView, whose lists need their own
 * scroll — and the words typed so far survive the swap. Closing without
 * saving keeps nothing.
 */
export function HeadnoteSheet({ visible, heading, passageLabel, initialText, text, narrowable, onSave, onDelete, onClose }: HeadnoteSheetProps) {
  const reducedMotion = useReducedMotion();
  const closeRef = useRef<View>(null);
  const [draft, setDraft] = useState(initialText);
  const [narrowed, setNarrowed] = useState<NarrowedRange | undefined>(undefined);
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setDraft(initialText);
    setNarrowed(undefined);
    setPicking(false);
  }, [visible, initialText]);

  const focusClose = () => {
    const handle = findNodeHandle(closeRef.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  };

  const label = narrowed
    ? `About: ${headnoteRange({ chapter: narrowed.chapter, chapterEnd: null, verseStart: narrowed.start, verseEnd: narrowed.end })}`
    : passageLabel;

  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : tokens.motion.sheet} onShow={focusClose} onRequestClose={picking ? () => setPicking(false) : onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sheet, picking && styles.sheetTall]} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={styles.title}>
              {heading}
            </Text>
            <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Close without saving" style={styles.control} onPress={onClose}>
              <Text style={styles.controlText}>Close</Text>
            </Pressable>
          </View>
          {visible && picking && narrowable ? (
            <View style={styles.picker}>
              <PassagePicker
                mode="headnote"
                text={text}
                initial={narrowed ? { book: narrowable.book, chapter: narrowed.chapter, start: narrowed.start, end: narrowed.end } : narrowable}
                onConfirm={(ref) => {
                  setNarrowed({ chapter: ref.chapter, start: ref.verseStart, end: ref.verseEnd });
                  setPicking(false);
                }}
                onCancel={() => setPicking(false)}
              />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
              {visible && (
                <HeadnoteEditor
                  heading={heading}
                  passageLabel={label}
                  initialText={draft}
                  onTextChange={setDraft}
                  onSave={(words) => onSave(words, narrowed)}
                  onDelete={onDelete}
                  onChooseVerses={narrowable ? () => setPicking(true) : undefined}
                />
              )}
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: tokens.color.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: tokens.color.paper,
    borderTopLeftRadius: tokens.radius.sheet,
    borderTopRightRadius: tokens.radius.sheet,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: tokens.color.ink15,
  },
  // The picker's lists need a bounded height of their own.
  sheetTall: { height: '88%' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[6],
    paddingVertical: tokens.space[3],
    borderBottomWidth: 1,
    borderColor: tokens.color.ink15,
  },
  title: { fontFamily: tokens.font.display, fontSize: 20, fontWeight: '800', color: tokens.color.ink },
  control: { minHeight: tokens.control.minTarget, minWidth: tokens.control.minTarget, justifyContent: 'center', alignItems: 'center' },
  controlText: { fontFamily: tokens.font.display, color: tokens.color.thread, fontWeight: '700' },
  content: { padding: tokens.space[6], paddingBottom: tokens.space[8] },
  picker: { flex: 1, padding: tokens.space[6] },
});
