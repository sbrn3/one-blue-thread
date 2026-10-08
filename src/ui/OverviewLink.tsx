import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { overviewsFor, type Overview } from '../study/overviews';
import { bookName } from '../text/canon';
import { tokens } from './tokens';

interface OverviewLinkProps {
  book: string;
  /** Leading words before the link, e.g. "Before you begin:". Empty for none. */
  lead: string;
}

function linkLabel(o: Overview, multiPart: boolean): string {
  if (multiPart) return `Part ${o.part} ↗`;
  return o.covers ? `BibleProject's overview of ${o.covers} ↗` : "BibleProject's overview ↗";
}

/**
 * BibleProject's overview of a book (docs/plans/bibleproject-book-videos) —
 * attributed human commentary, opened in the browser, never embedded. Two-part
 * books show both parts. If no browser opens, the address is shown to type,
 * the KeyGuide pattern.
 */
export function OverviewLink({ book, lead }: OverviewLinkProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const overviews = overviewsFor(book);
  if (overviews.length === 0) return null;
  const multiPart = overviews.length > 1;

  const open = (url: string) => {
    setFailedUrl(null);
    Linking.openURL(url).catch(() => setFailedUrl(url));
  };

  return (
    <View style={styles.wrap}>
      {(lead || multiPart) && (
        <Text style={styles.lead}>
          {lead}
          {lead && multiPart ? ' ' : ''}
          {multiPart ? "BibleProject's overview, in two parts:" : ''}
        </Text>
      )}
      <View style={styles.row}>
        {overviews.map((o) => (
          <Pressable
            key={o.url}
            accessibilityRole="link"
            accessibilityLabel={`Open BibleProject's overview of ${o.covers ?? bookName(book)}${o.part ? `, part ${o.part}` : ''}`}
            onPress={() => open(o.url)}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>{linkLabel(o, multiPart)}</Text>
          </Pressable>
        ))}
      </View>
      {failedUrl && <Text style={styles.lead}>Couldn&apos;t open a browser — visit {failedUrl}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: tokens.space[4] },
  lead: {
    fontFamily: tokens.font.display,
    fontSize: 13,
    lineHeight: 19,
    color: tokens.color.ink40,
  },
  link: { minHeight: tokens.control.minTarget, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  linkText: {
    fontFamily: tokens.font.display,
    fontWeight: '600',
    fontSize: 14,
    color: tokens.color.ink40,
    textDecorationLine: 'underline',
  },
});
