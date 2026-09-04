import { forwardRef, useImperativeHandle, useRef, type ReactNode } from 'react';
import { AccessibilityInfo, findNodeHandle, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import type { Passage } from '../log/types';
import type { TermCue } from '../study';
import type { Verse } from '../text/provider';
import { tokens } from '../ui/tokens';

interface ScriptureZoneProps {
  verses: Verse[];
  attribution: string | null;
  onLayout?: (y: number, height: number) => void;
  onOpenVerse?: (verse: number) => void;
  onOpenTerm?: (articleId: string, verse: number) => void;
  onSelectEndpoint?: (verse: number) => void;
  onCancelSelection?: () => void;
  selectionAnchor?: number | null;
  terms?: TermCue[];
  remembered?: Passage[];
}

export interface ScriptureZoneHandle { focusVerse:(verse:number)=>void }

export const ScriptureZone = forwardRef<ScriptureZoneHandle,ScriptureZoneProps>(function ScriptureZone({
  verses,
  attribution,
  onLayout,
  onOpenVerse,
  onOpenTerm,
  onSelectEndpoint,
  onCancelSelection,
  selectionAnchor = null,
  terms = [],
  remembered = [],
}, ref) {
  const verseRefs=useRef(new Map<number,View>());
  useImperativeHandle(ref,()=>({focusVerse:(verse)=>{const handle=findNodeHandle(verseRefs.current.get(verse)??null);if(handle)AccessibilityInfo.setAccessibilityFocus(handle);}}),[]);
  const renderVerseText = (verse: Verse): ReactNode[] => {
    const matches = terms.filter((term) => term.verse === verse.verse).sort((a, b) => a.start - b.start);
    const nodes: ReactNode[] = [];
    let cursor = 0;

    matches.forEach((term, index) => {
      if (term.start > cursor) nodes.push(verse.text.slice(cursor, term.start));
      nodes.push(
        <Text
          key={`${term.articleId}-${index}`}
          accessibilityRole="link"
          accessibilityHint="Opens a Tyndale Bible Dictionary article"
          style={styles.term}
          onPress={(event: GestureResponderEvent) => {
            event.stopPropagation();
            onOpenTerm?.(term.articleId, verse.verse);
          }}
        >
          {verse.text.slice(term.start, term.end)}
        </Text>,
      );
      cursor = term.end;
    });

    if (cursor < verse.text.length) nodes.push(verse.text.slice(cursor));
    return nodes;
  };

  return (
    <View
      style={styles.zone}
      onLayout={(event) => onLayout?.(event.nativeEvent.layout.y, event.nativeEvent.layout.height)}
    >
      {selectionAnchor !== null ? (
        <View accessibilityLiveRegion="polite" style={styles.selectionBanner}>
          <Text style={styles.selectionText}>Verse {selectionAnchor} selected · tap the last verse</Text>
          <Pressable accessibilityRole="button" style={styles.cancel} onPress={onCancelSelection}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {verses.map((verse) => {
        const marked = remembered.some(
          (passage) => verse.verse >= passage.verse_start && verse.verse <= passage.verse_end,
        );
        const selecting = selectionAnchor !== null && onSelectEndpoint;
        return (
          <Pressable
            key={verse.verse}
            ref={(node)=>{if(node)verseRefs.current.set(verse.verse,node);else verseRefs.current.delete(verse.verse);}}
            accessibilityRole="button"
            accessibilityLabel={`Verse ${verse.verse}, ${verse.text}`}
            accessibilityHint={selecting ? 'Select as the end of the passage' : 'Open study context'}
            onPress={selecting ? () => onSelectEndpoint(verse.verse) : onOpenVerse ? () => onOpenVerse(verse.verse) : undefined}
            disabled={!selecting && !onOpenVerse}
          >
            <Text style={[styles.paragraph, marked && styles.marked, selectionAnchor === verse.verse && styles.anchor]}>
              <Text style={styles.verseNum}>{verse.verse} </Text>
              {renderVerseText(verse)}
            </Text>
          </Pressable>
        );
      })}

      {attribution ? <Text style={styles.attribution}>{attribution}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  zone: { paddingHorizontal: 32, paddingVertical: 24, gap: 18 },
  paragraph: { fontFamily: tokens.font.scripture, fontSize: 19, lineHeight: 30, color: tokens.color.ink },
  marked: { backgroundColor: 'rgba(31, 63, 255, 0.08)' },
  anchor: { borderBottomWidth: 1, borderBottomColor: tokens.color.thread },
  verseNum: { fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.ink40 },
  term: {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: tokens.color.thread,
  },
  selectionBanner: {
    borderWidth: 1,
    borderColor: tokens.color.thread,
    borderRadius: 12,
    paddingLeft: 12,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectionText: { fontFamily: tokens.font.display, color: tokens.color.thread, fontWeight: '700' },
  cancel: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontFamily: tokens.font.display, color: tokens.color.thread, fontWeight: '800' },
  attribution: {
    marginTop: 24,
    fontFamily: tokens.font.mono,
    fontSize: 11,
    lineHeight: 16,
    color: tokens.color.ink40,
  },
});
