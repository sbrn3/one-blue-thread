import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../ui/tokens';

interface DisclosureSectionProps {
  summary: string;
  /** A short line under the summary — e.g. "Last snapshot: 2 days ago". */
  status?: string;
  /** Shows a restrained attention dot next to the chevron — never alarmist copy. */
  attention?: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * Direction A's quiet accordion primitive (docs/plans/app-quality-foundations).
 * The parent owns open state so a section needing attention (Safekeeping,
 * Support) can be opened by default without this component guessing why.
 */
export function DisclosureSection({ summary, status, attention = false, expanded, onToggle, children }: DisclosureSectionProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={summary}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <View style={styles.headerText}>
          <Text style={styles.summary}>{summary}</Text>
          {status && <Text style={styles.status}>{status}</Text>}
        </View>
        <View style={styles.headerRight}>
          {attention && <View style={styles.attentionDot} accessibilityLabel="Needs attention" />}
          <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
        </View>
      </Pressable>
      {expanded && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: tokens.color.ink15,
  },
  header: {
    minHeight: tokens.control.minTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  headerPressed: {
    opacity: 0.7,
  },
  headerText: {
    flexShrink: 1,
    gap: 2,
  },
  summary: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 15,
    color: tokens.color.ink,
  },
  status: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: tokens.color.ink40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attentionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.color.madder,
  },
  chevron: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    color: tokens.color.ink40,
  },
  body: {
    paddingBottom: 16,
  },
});
