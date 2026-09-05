import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../ui/tokens';
import { ORIGIN_CONTEXT } from './index';
import { ORIGIN_PASSAGE } from './origin';

interface BrandOriginProps {
  heading?: string;
}

/** The complete source of the name. Each verse remains separately navigable. */
export function BrandOrigin({ heading = 'Why this name' }: BrandOriginProps) {
  return (
    <View style={styles.wrap}>
      <Text accessibilityRole="header" style={styles.heading}>
        {heading}
      </Text>
      <Text style={styles.reference}>{ORIGIN_PASSAGE.reference}</Text>
      <View style={styles.passage}>
        {ORIGIN_PASSAGE.verses.map(({ verse, text }) => (
          <Text key={verse} style={styles.verse}>
            <Text style={styles.verseNumber}>{verse} </Text>
            {text}
          </Text>
        ))}
      </View>
      <Text style={styles.attribution}>{ORIGIN_PASSAGE.attribution}</Text>
      <Text style={styles.context}>{ORIGIN_CONTEXT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  heading: {
    fontFamily: tokens.font.display,
    fontWeight: '800',
    fontSize: 21,
    color: tokens.color.ink,
  },
  reference: {
    fontFamily: tokens.font.mono,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: tokens.color.thread,
  },
  passage: { gap: tokens.space[2], marginTop: tokens.space[2] },
  verse: {
    fontFamily: tokens.font.scripture,
    fontSize: 17,
    lineHeight: 27,
    color: tokens.color.ink,
  },
  verseNumber: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    color: tokens.color.thread,
  },
  attribution: {
    fontFamily: tokens.font.mono,
    fontSize: 10,
    lineHeight: 15,
    color: tokens.color.ink40,
    marginTop: tokens.space[2],
  },
  context: {
    fontFamily: tokens.font.display,
    fontSize: 13,
    lineHeight: 20,
    color: tokens.color.ink60,
    marginTop: tokens.space[3],
  },
});
