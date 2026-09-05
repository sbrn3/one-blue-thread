import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SqlDb } from '../log/db';
import { bookName } from '../text/canon';
import { ActionButton } from '../ui/controls';
import { tokens } from '../ui/tokens';
import { listHistoryPage, matchingBookIds, type HistoryEntry } from './history';

const PAGE_SIZE = 40;

interface HistoryModalProps {
  visible: boolean;
  db: SqlDb;
  reducedMotion: boolean;
  onClose: () => void;
  onSelectEntry: (entry: HistoryEntry) => void;
}

interface Section {
  title: string;
  data: HistoryEntry[];
}

function toSections(entries: HistoryEntry[]): Section[] {
  const out: Section[] = [];
  for (const e of entries) {
    const last = out[out.length - 1];
    if (last && last.title === e.book) last.data.push(e);
    else out.push({ title: e.book, data: [e] });
  }
  return out;
}

/**
 * "Reading history" — a standalone, virtualized, searchable browse of every
 * recorded sealed portion (§04/§21), replacing the unbounded list once
 * mapped directly inside the knot's own sheet. A day records its STARTING
 * portion; a merge-forward day (§21.2) may have folded in more than one
 * chapter, so this never claims "every chapter read".
 */
export function HistoryModal({ visible, db, reducedMotion, onClose, onSelectEntry }: HistoryModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<View>(null);

  const fetchPage = useCallback(
    (reset: boolean) => {
      try {
        const trimmed = query.trim();
        const bookIds = trimmed ? matchingBookIds(trimmed) : undefined;
        const page = listHistoryPage(db, {
          limit: PAGE_SIZE,
          cursor: reset ? undefined : cursor,
          bookIds,
        });
        setEntries((prev) => (reset ? page.entries : [...prev, ...page.entries]));
        setHasMore(page.hasMore);
        setCursor(page.nextCursor);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [db, query, cursor],
  );

  // Re-fetch from the top whenever the modal opens or the search changes —
  // never on every keystroke's re-render of an unrelated dependency.
  useEffect(() => {
    if (!visible) return;
    setEntries([]);
    setCursor(undefined);
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query]);

  const sections = useMemo(() => toSections(entries), [entries]);
  const trimmedQuery = query.trim();
  const showNoResult = trimmedQuery.length > 0 && entries.length === 0 && !error;
  const showEmpty = trimmedQuery.length === 0 && entries.length === 0 && !error;

  const focusClose = useCallback(() => {
    const handle = findNodeHandle(closeRef.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);

  return (
    <Modal visible={visible} animationType={reducedMotion ? 'none' : 'slide'} onRequestClose={onClose} onShow={focusClose}>
      <View style={[styles.wrap, { paddingTop: insets.top, paddingBottom: insets.bottom }]} accessibilityViewIsModal>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Reading history</Text>
          <Pressable ref={closeRef} style={styles.closeRow} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.search}
          placeholder="Search by book…"
          placeholderTextColor={tokens.color.ink40}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          accessibilityLabel="Search reading history by book"
        />

        {error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>Couldn&apos;t load reading history.</Text>
            <ActionButton label="Retry" onPress={() => fetchPage(true)} />
          </View>
        ) : showEmpty ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>Nothing sealed yet.</Text>
          </View>
        ) : showNoResult ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>No book matches &quot;{trimmedQuery}&quot;.</Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.local_date}
            renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{bookName(section.title)}</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => onSelectEntry(item)}
                accessibilityRole="button"
                accessibilityLabel={`${bookName(item.book)} ${item.chapter}, sealed ${item.local_date}`}
              >
                <Text style={styles.rowTitle}>
                  {bookName(item.book)} {item.chapter}
                  {item.sitting != null && item.sitting > 0 ? ` · sitting ${item.sitting + 1}` : ''}
                </Text>
                <Text style={styles.rowDate}>{item.local_date}</Text>
              </Pressable>
            )}
            ListFooterComponent={
              hasMore ? (
                <ActionButton label="Load earlier" variant="secondary" onPress={() => fetchPage(false)} style={styles.loadMore} />
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: tokens.color.paper,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: tokens.font.display,
    fontWeight: '900',
    fontSize: 22,
    color: tokens.color.ink,
  },
  closeRow: {
    minHeight: 44,
    justifyContent: 'center',
  },
  close: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    color: tokens.color.ink40,
  },
  search: {
    borderWidth: 1.5,
    borderColor: tokens.color.ink15,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: tokens.font.display,
    fontSize: 14,
    color: tokens.color.ink,
    marginVertical: 12,
  },
  sectionHeader: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
    backgroundColor: tokens.color.paper,
    paddingVertical: 8,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: tokens.color.ink15,
  },
  rowTitle: {
    fontFamily: tokens.font.display,
    fontSize: 14,
    color: tokens.color.ink,
    flexShrink: 1,
  },
  rowDate: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    color: tokens.color.ink40,
  },
  loadMore: {
    alignSelf: 'center',
    marginVertical: 16,
  },
  center: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: tokens.font.display,
    fontSize: 13,
    color: tokens.color.ink40,
  },
  errorText: {
    fontFamily: tokens.font.display,
    fontSize: 14,
    color: tokens.color.ink60,
  },
});
