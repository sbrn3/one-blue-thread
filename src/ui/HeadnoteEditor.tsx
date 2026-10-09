import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_HEADNOTE } from '../headnote';
import { ActionButton } from './controls';
import { tokens } from './tokens';

interface HeadnoteEditorProps {
  /** The heading the headnote sits under, e.g. "Philippians 4" — used in the field's label. */
  heading: string;
  /** What the headnote is about, e.g. "About: all of 4:1–23". */
  passageLabel: string;
  initialText: string;
  onSave: (text: string) => void;
  /** Shown only when a saved headnote exists. Confirmed before it runs. */
  onDelete?: () => void;
  /** Opens the verse picker (docs/plans exec S05); omitted hides the link. */
  onChooseVerses?: () => void;
  /** Back to the whole sealed passage; shown only while the headnote is narrowed. */
  onWholePassage?: () => void;
  /** Mirrors the words to the host, so they survive a swap to the verse picker. */
  onTextChange?: (text: string) => void;
}

/**
 * The headnote field (docs/plans/bibleproject-book-videos). Never a Modal of
 * its own: it is a screen inside HeadnoteSheet (the reading flow) and inside
 * the chapter viewer. The field is set the way the headnote will print above
 * its chapter — the app's voice, a madder rule for a mark you made — never in
 * the Scripture face.
 */
export function HeadnoteEditor({ heading, passageLabel, initialText, onSave, onDelete, onChooseVerses, onWholePassage, onTextChange }: HeadnoteEditorProps) {
  const [text, setText] = useState(initialText);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const blank = text.trim().length === 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label} nativeID="headnoteLabel">
        As it will sit above the chapter
      </Text>
      {/* The madder rule is its own bar: Android paints a single-side border
          colour onto every side when the side widths differ. */}
      <View style={styles.fieldWrap}>
        <View style={styles.rule} />
        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t);
            onTextChange?.(t);
          }}
          maxLength={MAX_HEADNOTE}
          multiline
          autoFocus={initialText.length === 0}
          placeholder="One line, in your own words"
          placeholderTextColor={tokens.color.ink40}
          accessibilityLabel={`Headnote for ${heading}`}
          accessibilityLabelledBy="headnoteLabel"
          style={styles.field}
        />
      </View>
      <Text style={styles.count} accessibilityLabel={`${text.length} of ${MAX_HEADNOTE} characters`}>
        {text.length} / {MAX_HEADNOTE}
      </Text>
      <View style={styles.aboutRow}>
        <Text style={styles.about}>{passageLabel}</Text>
        {onChooseVerses && (
          <Pressable accessibilityRole="button" accessibilityLabel="Choose verses" onPress={onChooseVerses} style={styles.inlineLink}>
            <Text style={styles.inlineLinkText}>choose verses</Text>
          </Pressable>
        )}
        {onWholePassage && (
          <Pressable accessibilityRole="button" accessibilityLabel="Use the whole passage" onPress={onWholePassage} style={styles.inlineLink}>
            <Text style={styles.inlineLinkText}>whole passage</Text>
          </Pressable>
        )}
      </View>
      <ActionButton label="Keep it" onPress={() => onSave(text)} disabled={blank} />
      {onDelete && !confirmDelete && (
        <Pressable accessibilityRole="button" accessibilityLabel="Delete this headnote" onPress={() => setConfirmDelete(true)} style={styles.danger}>
          <Text style={styles.dangerText}>Delete</Text>
        </Pressable>
      )}
      {onDelete && confirmDelete && (
        <View style={styles.confirm} accessibilityLiveRegion="polite">
          <Text style={styles.confirmText}>Delete this headnote? This can&apos;t be undone.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Delete the headnote" onPress={onDelete} style={styles.danger}>
            <Text style={styles.dangerText}>Delete</Text>
          </Pressable>
          <ActionButton label="Cancel" variant="link" onPress={() => setConfirmDelete(false)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[3] },
  label: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
  },
  fieldWrap: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: tokens.color.ink15,
    borderRadius: tokens.radius.input,
    overflow: 'hidden',
  },
  rule: { width: 2, backgroundColor: tokens.color.madder },
  field: {
    flex: 1,
    minHeight: 88,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[3],
    fontFamily: tokens.font.display,
    fontSize: 15,
    lineHeight: 22,
    color: tokens.color.ink,
    textAlignVertical: 'top',
  },
  count: { alignSelf: 'flex-end', fontFamily: tokens.font.mono, fontSize: 10, color: tokens.color.ink40 },
  aboutRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: tokens.space[2] },
  about: { fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.ink40 },
  inlineLink: { minHeight: tokens.control.minTarget, justifyContent: 'center' },
  inlineLinkText: { fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.ink40, textDecorationLine: 'underline' },
  danger: {
    minHeight: tokens.control.minTarget,
    borderRadius: tokens.radius.input,
    borderWidth: 1,
    borderColor: tokens.color.madder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { fontFamily: tokens.font.display, fontSize: 15, color: tokens.color.madder },
  confirm: { gap: tokens.space[2] },
  confirmText: { fontFamily: tokens.font.display, fontSize: 14, color: tokens.color.madder },
});
