import { useRef } from 'react';
import { AccessibilityInfo, findNodeHandle, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { HeadnoteEditor } from '../ui/HeadnoteEditor';
import { tokens } from '../ui/tokens';

interface HeadnoteSheetProps {
  visible: boolean;
  /** "Philippians 4" — the sheet's title and the field's label. */
  heading: string;
  passageLabel: string;
  initialText: string;
  onSave: (text: string) => void;
  /** Present only when today's headnote already exists. */
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Writing today's headnote, after the seal (docs/plans/bibleproject-book-videos).
 * Its own bottom-sheet Modal, styled as VerseContextSheet, so the field sits
 * outside the reading flow's ScrollView: the keyboard can't cover it and the
 * seal's scroll lock can't trap it. Closing without saving keeps nothing.
 */
export function HeadnoteSheet({ visible, heading, passageLabel, initialText, onSave, onDelete, onClose }: HeadnoteSheetProps) {
  const reducedMotion = useReducedMotion();
  const closeRef = useRef<View>(null);

  const focusClose = () => {
    const handle = findNodeHandle(closeRef.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  };

  return (
    <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : tokens.motion.sheet} onShow={focusClose} onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.head}>
            <Text accessibilityRole="header" style={styles.title}>
              {heading}
            </Text>
            <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel="Close without saving" style={styles.control} onPress={onClose}>
              <Text style={styles.controlText}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {visible && (
              <HeadnoteEditor
                heading={heading}
                passageLabel={passageLabel}
                initialText={initialText}
                onSave={onSave}
                onDelete={onDelete}
              />
            )}
          </ScrollView>
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
});
