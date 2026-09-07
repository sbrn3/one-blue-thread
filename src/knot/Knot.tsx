import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Cue } from '../cue';
import { WeaveZone } from '../flow/WeaveZone';
import { deriveBolt } from '../flow/bolt';
import { bundledChapterCount } from '../text';
import { getSupportSummary, hasSupportAttention, needsAttention } from '../lab/diagnostics';
import { getProfile } from '../lab/profile';
import { computeStreak, meta } from '../log/log';
import { logicalToday } from '../log/time';
import type { Services } from '../services';
import { tokens } from '../ui/tokens';
import { ChapterStrip } from './ChapterStrip';
import { ChapterViewer } from './ChapterViewer';
import { CueEditor } from './CueEditor';
import { DiagnosticsSection } from './DiagnosticsSection';
import { DisclosureSection } from './DisclosureSection';
import { type HistoryEntry } from './history';
import { HistoryModal } from './HistoryModal';
import { BackupSection } from './BackupSection';
import { MoreSection, type MoreSectionKey } from './MoreSection';

interface KnotProps {
  services: Services;
}

type SectionKey = 'practice' | 'more';

/**
 * §04 — the knot: the app's sole persistent control, present on every
 * screen. docs/plans/knot-declutter, direction A: an everyday tier (the
 * compact weave, Practice — open by default — and reading history) over
 * one "More" disclosure holding the rare tier, grouped as Your data
 * (Safekeeping, Starting over), Practice (Partner, Adaptive policy), and
 * About (Origin story, Study library, Support). When Safekeeping or
 * Support needs attention, that section is promoted into the everyday
 * tier already open — re-evaluated every time the knot opens — rather
 * than left one level down inside More. Translation state/provider/copy
 * is untouched here — owned by the separate, parked
 * knot-translation-switch plan.
 */
export function Knot({ services }: KnotProps) {
  const { db, log, text, cue, backup } = services;
  const today = useRef(logicalToday()).current;
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [cueState, setCueState] = useState<Cue | null>(() => cue.current());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<HistoryEntry | null>(null);
  const [paused, setPaused] = useState(() => meta.get(db, 'paused') === '1');

  // The everyday tier's own two disclosures: Practice, and the "More" door
  // into the rare tier below.
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    practice: true,
    more: false,
  });
  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // The rare tier's seven items, all closed by default — MoreSection owns
  // rendering them; this is only the open/closed record, same contract as
  // DisclosureSection everywhere else in the knot.
  const [moreSections, setMoreSections] = useState<Record<MoreSectionKey, boolean>>({
    safekeeping: false,
    reset: false,
    partner: false,
    adaptive: false,
    origin: false,
    study: false,
    support: false,
  });
  const toggleMoreSection = useCallback((key: MoreSectionKey) => {
    setMoreSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Safekeeping or Support needing attention is promoted into the everyday
  // tier, already open — re-evaluated every time the knot opens, exactly
  // like the flat accordion did before. MoreSection is told which one (if
  // any) so it can leave that item out of its own group and never render
  // it twice. Support takes priority when both need attention: a support
  // item generally means something the reader cannot act on from
  // Safekeeping alone (an invariant failure, a recent local error).
  const [promoted, setPromoted] = useState<'safekeeping' | 'support' | null>(null);

  const openerRef = useRef<View>(null);
  const closeRef = useRef<View>(null);

  // docs/plans/knot-declutter — the opener's dot, readable on the reading
  // screen with the knot closed. Deliberately NOT backup.status()/
  // getSupportSummary(db) run unconditionally here: those are read again,
  // in full, once the knot is actually open (below). This is the cheap
  // hasSupportAttention() probe plus the same backup.status() the knot
  // already calls on open — status() is itself a bounded meta read, so it
  // is not the risk; getSupportSummary()'s unbounded amendment log is.
  const [openerAttention, setOpenerAttention] = useState(false);
  const refreshOpenerAttention = useCallback(() => {
    const status = backup.status();
    setOpenerAttention(
      status.snapshotAttentionNeeded || status.externalAttentionNeeded || hasSupportAttention(db),
    );
  }, [backup, db]);
  useEffect(refreshOpenerAttention, [refreshOpenerAttention]);

  // Same derivation the flow uses. The knot reaches the weave independently of
  // today's seal, so this must be correct on an unsealed day too.
  const bolt = useMemo(
    () => (open ? deriveBolt(db, log, today) : { book: '', sealed: [] }),
    [open, db, log, today],
  );

  // Cheap existence check only — HistoryModal owns the actual paginated
  // query (src/knot/history.ts) once opened.
  const hasHistory = useMemo(() => {
    if (!open) return false;
    return db.all(`SELECT 1 FROM days WHERE sealed = 1 AND book IS NOT NULL LIMIT 1`).length > 0;
  }, [open, db]);

  // Re-read on every open, not just once — a foreground snapshot or a prior
  // Support-worthy error may have happened since the knot was last opened.
  const backupStatus = useMemo(() => (open ? backup.status() : null), [open, backup]);
  const supportSummary = useMemo(() => (open ? getSupportSummary(db) : null), [open, db]);

  // knot_open logs only when the knot itself opens (handleOpen below) — not
  // again here when a history row is chosen from within an already-open knot.
  const handleSelectHistoryEntry = useCallback((entry: HistoryEntry) => {
    setViewingEntry(entry);
  }, []);

  const handleCueSave = useCallback(
    (next: Cue) => {
      cue.set(next);
      setCueState(next);
    },
    [cue],
  );

  const focusCloseControl = useCallback(() => {
    const handle = findNodeHandle(closeRef.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);

  const restoreOpenerFocus = useCallback(() => {
    const handle = findNodeHandle(openerRef.current);
    if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
  }, []);

  const handleOpen = () => {
    log.write({ type: 'knot_open' });
    const status = backup.status();
    const support = getSupportSummary(db);
    const safekeepingAttention = status.snapshotAttentionNeeded || status.externalAttentionNeeded;
    const supportAttention = needsAttention(support);
    // Support takes priority when both need attention — see the state's
    // own comment above for why.
    const next = supportAttention ? 'support' : safekeepingAttention ? 'safekeeping' : null;
    setPromoted(next);
    setMoreSections((prev) => ({
      ...prev,
      safekeeping: safekeepingAttention,
      support: supportAttention,
    }));
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    restoreOpenerFocus();
    // Whatever needed attention may have just been resolved (or a new
    // thing may have surfaced) while the knot was open — re-read for the
    // opener's dot rather than leaving it showing a stale answer.
    refreshOpenerAttention();
  };

  const handleResume = () => {
    meta.set(db, 'paused', '0');
    setPaused(false);
  };

  return (
    <>
      <Pressable
        ref={openerRef}
        style={styles.button}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={
          openerAttention
            ? 'Open the knot: weave, practice, and settings — needs attention'
            : 'Open the knot: weave, practice, and settings'
        }
      >
        {/* The dot is decorative at rest (ink40) and becomes the real
            madder attention signal when openerAttention is true — but the
            accessible name above always carries the same information in
            words, so the dot is never the sole carrier of meaning. */}
        <View style={[styles.buttonDot, openerAttention && styles.buttonDotAttention]} />
        <Text style={styles.buttonLabel}>Knot</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType={reducedMotion ? 'none' : 'slide'}
        transparent
        onRequestClose={handleClose}
        onShow={focusCloseControl}
      >
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]} accessibilityViewIsModal>
            <Pressable
              ref={closeRef}
              style={styles.closeRow}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.close}>Close</Text>
            </Pressable>
            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
              {paused && (
                <View style={styles.pausedBanner}>
                  <Text style={styles.pausedText}>Notifications are paused.</Text>
                  <Pressable onPress={handleResume}>
                    <Text style={styles.resumeLabel}>Resume</Text>
                  </Pressable>
                </View>
              )}

              {/* Promoted out of the rare tier for this open only, already
                  expanded — never also rendered inside More (see its
                  `promoted` prop below). Not `nested`: this is the everyday
                  tier now, not a group item. */}
              {promoted === 'safekeeping' && (
                <DisclosureSection
                  summary="Safekeeping"
                  status="Needs attention"
                  attention
                  expanded={moreSections.safekeeping}
                  onToggle={() => toggleMoreSection('safekeeping')}
                >
                  <BackupSection backup={backup} />
                </DisclosureSection>
              )}
              {promoted === 'support' && supportSummary && (
                <DisclosureSection
                  summary="Support"
                  status="Needs attention"
                  attention
                  expanded={moreSections.support}
                  onToggle={() => toggleMoreSection('support')}
                >
                  <DiagnosticsSection summary={supportSummary} />
                </DisclosureSection>
              )}

              <WeaveZone
                book={bolt.book}
                chapterCount={bundledChapterCount(bolt.book)}
                sealed={bolt.sealed}
                streak={getProfile(db, 'streakVisible') === '1' ? computeStreak(db, today) : null}
                compact
              />

              <DisclosureSection
                summary="Practice"
                expanded={openSections.practice}
                onToggle={() => toggleSection('practice')}
              >
                <CueEditor cue={cueState} onSave={handleCueSave} />
              </DisclosureSection>

              <ChapterStrip hasHistory={hasHistory} onOpen={() => setHistoryOpen(true)} />

              <DisclosureSection
                summary="More"
                status="Safekeeping, partner, support, starting over"
                expanded={openSections.more}
                onToggle={() => toggleSection('more')}
              >
                <MoreSection
                  services={services}
                  db={db}
                  log={log}
                  today={today}
                  openSections={moreSections}
                  onToggle={toggleMoreSection}
                  backupStatus={backupStatus}
                  supportSummary={supportSummary}
                  viewingEntry={viewingEntry}
                  promoted={promoted}
                />
              </DisclosureSection>
            </ScrollView>

            {/* Siblings of the ScrollView, not children of it — rendered inside the
                knot's own modal tree so opening either is never a second Modal
                stacked on top of an already-open one (the "taps open nothing"
                failure; see test/ui-contracts.test.ts). */}
            <HistoryModal
              visible={historyOpen}
              db={db}
              reducedMotion={reducedMotion}
              onClose={() => setHistoryOpen(false)}
              onSelectEntry={handleSelectHistoryEntry}
            />

            <ChapterViewer entry={viewingEntry} text={text} reducedMotion={reducedMotion} onClose={() => setViewingEntry(null)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 56,
    right: 20,
    minHeight: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.ink15,
    // Translucent, not opaque paper, so the pill still holds its shape
    // over scripture without becoming a solid card on the reading screen.
    backgroundColor: 'rgba(244, 241, 233, 0.72)',
    justifyContent: 'center',
    zIndex: 200,
  },
  buttonDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.color.ink40,
  },
  buttonDotAttention: {
    backgroundColor: tokens.color.madder,
  },
  buttonLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    letterSpacing: 0.5,
    color: tokens.color.ink40,
  },
  backdrop: {
    flex: 1,
    backgroundColor: tokens.color.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: tokens.color.paper,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 12,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 4,
  },
  closeRow: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  close: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    color: tokens.color.ink40,
  },
  pausedBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.color.ink15,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  pausedText: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink60,
  },
  resumeLabel: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 13,
    color: tokens.color.thread,
  },
});
