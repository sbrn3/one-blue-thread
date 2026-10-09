import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, findNodeHandle, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScriptureZone } from '../flow/ScriptureZone';
import { getHeadnote, headnoteRange, removeHeadnote, saveHeadnote, sealById, type Headnote, type SealRef } from '../headnote';
import type { SqlDb } from '../log/db';
import { useHeadnoteEpoch } from '../state/headnoteEpoch';
import type { HistoryEntry } from './history';
import type { TextProvider, Verse } from '../text/provider';
import { bookName } from '../text/canon';
import { ActionButton } from '../ui/controls';
import { HeadnoteEditor } from '../ui/HeadnoteEditor';
import { PassagePicker } from './PassagePicker';
import { tokens } from '../ui/tokens';

interface ChapterViewerProps {
  /** Null closes the viewer. Reading history's own state (search/pagination) lives in HistoryModal and is untouched by this opening or closing. */
  entry: HistoryEntry | null;
  text: TextProvider;
  /** For the day's headnote, shown above the chapter (docs/plans/bibleproject-book-videos). */
  db: SqlDb;
  reducedMotion: boolean;
  onClose: () => void;
}

type LoadState = { status: 'loading' } | { status: 'ready'; verses: Verse[] } | { status: 'error'; message: string };

/**
 * A recorded portion's viewer — loading/error/Retry around the async
 * chapter fetch, same reduced-motion/safe-area/modal-isolation/focus
 * pattern as the knot itself.
 */
export function ChapterViewer({ entry, text, db, reducedMotion, onClose }: ChapterViewerProps) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const closeRef = useRef<View>(null);
  // The headnote kept on this entry's day, if it is about this chapter — set
  // above the text the way a printed Bible sets a chapter's headnote. Editing
  // is a screen inside this viewer, never a second Modal.
  const [headnote, setHeadnote] = useState<Headnote | null>(null);
  const bumpHeadnotes = useHeadnoteEpoch((st) => st.bump);
  const [editing, setEditing] = useState(false);
  // Choosing verses swaps the editor for the picker (its lists can't nest in a
  // ScrollView); the words typed so far are kept here across the swap.
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  // A chosen range waits for "Keep it", as in the reading flow's sheet:
  // undefined keeps the headnote's passage, null returns to the whole passage.
  const [narrowed, setNarrowed] = useState<{ start: number; end: number } | null | undefined>(undefined);
  useEffect(() => {
    setEditing(false);
    setPicking(false);
    setNarrowed(undefined);
    const h = entry ? getHeadnote(db, entry.local_date) : null;
    setHeadnote(h && entry && h.book === entry.book && h.chapter === entry.chapter ? h : null);
  }, [db, entry]);
  // The seal the headnote followed carries the whole sealed passage; fall back
  // to the headnote's own passage if that event is somehow missing.
  const sealOf = (h: Headnote): SealRef =>
    sealById(db, h.sealEventId) ?? { id: h.sealEventId, localDate: h.localDate, book: h.book, chapter: h.chapter, verseFirst: h.verseStart, verseLast: h.verseEnd };
  const startEditing = () => {
    setDraft(null);
    setNarrowed(undefined);
    setPicking(false);
    setEditing(true);
  };
  const saveEdit = (words: string) => {
    if (!headnote) return;
    const range = narrowed === undefined ? undefined : narrowed === null ? null : { chapter: headnote.chapter, ...narrowed };
    setHeadnote(saveHeadnote(db, { seal: sealOf(headnote), text: words, narrowed: range }));
    bumpHeadnotes();
    setEditing(false);
  };
  const isNarrowed = (h: Headnote) => {
    const sealed = sealOf(h);
    return h.chapter !== sealed.chapter || h.verseStart !== sealed.verseFirst || h.verseEnd !== sealed.verseLast;
  };
  const editLabel = (h: Headnote) =>
    narrowed === null
      ? 'About: the whole passage you read'
      : narrowed
        ? `About: ${headnoteRange({ chapter: h.chapter, chapterEnd: null, verseStart: narrowed.start, verseEnd: narrowed.end })}`
        : `About: ${headnoteRange(h)}`;
  // Hardware back steps out one level: picker → editor → chapter → close.
  const back = () => {
    if (picking) setPicking(false);
    else if (editing) setEditing(false);
    else onClose();
  };
  const deleteHeadnote = () => {
    if (!headnote) return;
    removeHeadnote(db, headnote.localDate);
    bumpHeadnotes();
    setHeadnote(null);
    setEditing(false);
  };

  const load = useCallback(() => {
    if (!entry) return;
    setState({ status: 'loading' });
    text
      .getChapter(entry.book, entry.chapter)
      .then((verses) => setState({ status: 'ready', verses }))
      .catch((e: unknown) => setState({ status: 'error', message: e instanceof Error ? e.message : String(e) }));
  }, [entry, text]);

  useEffect(() => {
    if (entry) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry?.book, entry?.chapter]);

  const focusClose = useCallback(() => {
    const handle = findNodeHandle(closeRef.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);

  return (
    <Modal visible={entry !== null} animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={back} onShow={focusClose}>
      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]} accessibilityViewIsModal>
        <Pressable ref={closeRef} style={styles.closeRow} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.close}>Close</Text>
        </Pressable>
        {entry && editing && headnote && picking ? (
          <View style={styles.picker}>
            <PassagePicker
              mode="headnote"
              text={text}
              initial={{
                book: headnote.book,
                chapter: headnote.chapter,
                start: narrowed?.start ?? headnote.verseStart ?? 1,
                end: narrowed?.end ?? headnote.verseEnd ?? headnote.verseStart ?? 1,
              }}
              onConfirm={(ref) => {
                setNarrowed({ start: ref.verseStart, end: ref.verseEnd });
                setPicking(false);
              }}
              onCancel={() => setPicking(false)}
            />
          </View>
        ) : entry && editing && headnote ? (
          <KeyboardAvoidingView style={styles.editorWrap} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.editor} keyboardShouldPersistTaps="handled">
              <HeadnoteEditor
                heading={`${bookName(entry.book)} ${entry.chapter}`}
                passageLabel={editLabel(headnote)}
                initialText={draft ?? headnote.text}
                onTextChange={setDraft}
                onSave={saveEdit}
                onDelete={deleteHeadnote}
                onChooseVerses={() => setPicking(true)}
                onWholePassage={(narrowed === undefined ? isNarrowed(headnote) : narrowed !== null) ? () => setNarrowed(null) : undefined}
              />
              <ActionButton label="Cancel" variant="link" onPress={() => setEditing(false)} />
            </ScrollView>
          </KeyboardAvoidingView>
        ) : entry && (
          <>
            {headnote && (
              <View style={styles.headnote}>
                <Text style={styles.headnoteText}>{headnote.text}</Text>
                <ActionButton label="Edit headnote" variant="link" onPress={startEditing} style={styles.editLink} />
              </View>
            )}
            <Text style={styles.title}>
              {bookName(entry.book)} {entry.chapter}
            </Text>
            {state.status === 'loading' && (
              <View style={styles.center}>
                <ActivityIndicator color={tokens.color.thread} />
              </View>
            )}
            {state.status === 'error' && (
              <View style={styles.center}>
                <Text style={styles.errorText}>Couldn&apos;t load this chapter.</Text>
                <ActionButton label="Retry" onPress={load} />
              </View>
            )}
            {state.status === 'ready' && (
              <ScrollView>
                <ScriptureZone
                  verses={state.verses}
                  attribution={text.attribution()}
                  highlight={headnote && headnote.verseStart != null && headnote.verseEnd != null ? { start: headnote.verseStart, end: headnote.verseEnd } : entry.highlight}
                />
              </ScrollView>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: tokens.color.paper,
  },
  closeRow: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  close: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    color: tokens.color.ink40,
  },
  headnote: {
    marginHorizontal: 32,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: tokens.color.madder,
    paddingLeft: 12,
  },
  headnoteText: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    lineHeight: 22,
    color: tokens.color.ink60,
  },
  editLink: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  editorWrap: { flex: 1 },
  editor: { padding: 24, gap: 8 },
  picker: { flex: 1, padding: 24 },
  title: {
    fontFamily: tokens.font.display,
    fontWeight: '900',
    fontSize: 28,
    color: tokens.color.ink,
    paddingHorizontal: 32,
  },
  center: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  errorText: {
    fontFamily: tokens.font.display,
    fontSize: 14,
    color: tokens.color.ink60,
  },
});
