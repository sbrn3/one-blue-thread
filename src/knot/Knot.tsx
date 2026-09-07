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
import { AdaptiveSection } from './AdaptiveSection';
import { BackupSection } from './BackupSection';
import { ChapterStrip } from './ChapterStrip';
import { ChapterViewer } from './ChapterViewer';
import { CueEditor } from './CueEditor';
import { DiagnosticsSection } from './DiagnosticsSection';
import { DisclosureSection } from './DisclosureSection';
import { type HistoryEntry } from './history';
import { HistoryModal } from './HistoryModal';
import { PartnerSection } from './PartnerSection';
import { ResetSection } from './ResetSection';
import { DictionaryLibrary } from '../study/DictionaryLibrary';
import { BrandOrigin } from '../brand/BrandOrigin';

interface KnotProps {
  services: Services;
}

type SectionKey = 'practice' | 'reading' | 'safekeeping' | 'partner' | 'support' | 'app';

/**
 * §04 — the knot: the app's sole persistent control, present on every
 * screen. Direction A's quiet accordion (docs/plans/app-quality-foundations):
 * today's compact weave, then Practice (open by default), Reading & Study,
 * Safekeeping, Partner, Support, and App disclosures — Safekeeping and
 * Support open themselves when they need attention, re-evaluated every time
 * the knot opens. Translation state/provider/copy is untouched here — owned
 * by the separate, parked knot-translation-switch plan.
 */
export function Knot({ services }: KnotProps) {
  const { db, log, text, study, cue, backup, partner } = services;
  const today = useRef(logicalToday()).current;
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [cueState, setCueState] = useState<Cue | null>(() => cue.current());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<HistoryEntry | null>(null);
  const [paused, setPaused] = useState(() => meta.get(db, 'paused') === '1');

  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    practice: true,
    reading: false,
    safekeeping: false,
    partner: false,
    support: false,
    app: false,
  });
  const toggleSection = useCallback((key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

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
    setOpenSections((prev) => ({
      ...prev,
      safekeeping: status.snapshotAttentionNeeded || status.externalAttentionNeeded,
      support: needsAttention(support),
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

              <DisclosureSection
                summary="Reading & Study"
                expanded={openSections.reading}
                onToggle={() => toggleSection('reading')}
              >
                <Text style={styles.sectionLabel}>Chapters read</Text>
                <ChapterStrip hasHistory={hasHistory} onOpen={() => setHistoryOpen(true)} />
                <Text style={styles.sectionLabel}>Study library</Text>
                <DictionaryLibrary
                  study={study}
                  book={viewingEntry?.book ?? meta.get(db, 'current_book') ?? 'genesis'}
                />
              </DisclosureSection>

              <DisclosureSection
                summary="Safekeeping"
                status={
                  backupStatus?.snapshotAttentionNeeded || backupStatus?.externalAttentionNeeded
                    ? 'Needs attention'
                    : undefined
                }
                attention={backupStatus?.snapshotAttentionNeeded || backupStatus?.externalAttentionNeeded}
                expanded={openSections.safekeeping}
                onToggle={() => toggleSection('safekeeping')}
              >
                <BackupSection backup={backup} />
              </DisclosureSection>

              <DisclosureSection
                summary="Partner"
                expanded={openSections.partner}
                onToggle={() => toggleSection('partner')}
              >
                <PartnerSection partner={partner} />
              </DisclosureSection>

              <DisclosureSection
                summary="Support"
                status={supportSummary && needsAttention(supportSummary) ? 'Needs attention' : undefined}
                attention={supportSummary ? needsAttention(supportSummary) : false}
                expanded={openSections.support}
                onToggle={() => toggleSection('support')}
              >
                {supportSummary && <DiagnosticsSection summary={supportSummary} />}
              </DisclosureSection>

              <DisclosureSection summary="App" expanded={openSections.app} onToggle={() => toggleSection('app')}>
                <BrandOrigin />
                <Text style={styles.sectionLabel}>Adaptive policy</Text>
                <AdaptiveSection db={db} today={today} />
                <ResetSection db={db} log={log} />
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
  sectionLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: tokens.color.ink40,
    marginTop: 12,
    marginBottom: 4,
  },
});
