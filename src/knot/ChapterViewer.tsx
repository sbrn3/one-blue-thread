import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, findNodeHandle, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScriptureZone } from '../flow/ScriptureZone';
import type { HistoryEntry } from './history';
import type { TextProvider, Verse } from '../text/provider';
import { bookName } from '../text/canon';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';

interface ChapterViewerProps {
  /** Null closes the viewer. Reading history's own state (search/pagination) lives in HistoryModal and is untouched by this opening or closing. */
  entry: HistoryEntry | null;
  text: TextProvider;
  reducedMotion: boolean;
  onClose: () => void;
}

type LoadState = { status: 'loading' } | { status: 'ready'; verses: Verse[] } | { status: 'error'; message: string };

/**
 * A recorded portion's viewer — loading/error/Retry around the async
 * chapter fetch, same reduced-motion/safe-area/modal-isolation/focus
 * pattern as the knot itself.
 */
export function ChapterViewer({ entry, text, reducedMotion, onClose }: ChapterViewerProps) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const closeRef = useRef<View>(null);

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
    <Modal visible={entry !== null} animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={onClose} onShow={focusClose}>
      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]} accessibilityViewIsModal>
        <Pressable ref={closeRef} style={styles.closeRow} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={styles.close}>Close</Text>
        </Pressable>
        {entry && (
          <>
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
                <ScriptureZone verses={state.verses} attribution={text.attribution()} />
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
