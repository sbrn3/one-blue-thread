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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Cue } from '../cue';
import { useCue } from '../cue/useCue';
import { WeaveZone } from '../flow/WeaveZone';
import { deriveBolt } from '../flow/bolt';
import { bundledChapterCount } from '../text';
import { getSupportSummary, hasSupportAttention } from '../lab/diagnostics';
import { getProfile } from '../lab/profile';
import { computeStreak, meta } from '../log/log';
import { logicalToday } from '../log/time';
import type { Services } from '../services';
import { useMemoryEpoch } from '../state/memoryEpoch';
import { useSealRehearsal } from '../state/sealRehearsal';
import { ActionButton } from '../ui/controls';
import { fellLinePath, fellLinePoints } from '../ui/fellLine';
import { easing, useMotion } from '../ui/motion';
import { tokens } from '../ui/tokens';
import { ChapterStrip } from './ChapterStrip';
import { ChapterViewer } from './ChapterViewer';
import { CueEditor } from './CueEditor';
import { DisclosureSection } from './DisclosureSection';
import { type HistoryEntry } from './history';
import { HistoryModal } from './HistoryModal';
import { KnotIcon } from './KnotIcon';
import { MemoryModal } from './MemoryModal';
import { MemoryStrip } from './MemoryStrip';
import { MoreSection, type MoreSectionKey } from './MoreSection';

interface KnotProps {
  services: Services;
  /** The reader switched translation — App.tsx rebuilds services so it takes effect. */
  onTranslationChanged: () => void;
}

type SectionKey = 'practice' | 'more';

/**
 * §04 — the knot: the app's sole persistent control, present on every
 * screen. docs/plans/knot-opener-icon: a gear opener over an everyday tier
 * (the compact weave, Practice — open by default — the memory library
 * (docs/plans/recall-settings), and reading history) and
 * one "More" disclosure holding the rare tier, grouped Preferences, Your
 * data, About. The sheet looks and orders itself the same every time:
 * nothing is promoted or auto-expanded; only Support carries a "Needs
 * attention" marker (and lights the gear's dot). Backup state never does.
 */
export function Knot({ services, onTranslationChanged }: KnotProps) {
  const { db, log, text, cue } = services;
  const today = useRef(logicalToday()).current;
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const cueState = useCue(cue);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const rehearsalPhase = useSealRehearsal((st) => st.phase);
  const [viewingEntry, setViewingEntry] = useState<HistoryEntry | null>(null);
  // Bumped when the chapter viewer closes, so a book's contents re-read a headnote edited there.
  const [historyEpoch, setHistoryEpoch] = useState(0);
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

  // The rare tier's items, all closed by default — MoreSection owns
  // rendering them; this is only the open/closed record, same contract as
  // DisclosureSection everywhere else in the knot.
  const [moreSections, setMoreSections] = useState<Record<MoreSectionKey, boolean>>({
    translation: false,
    safekeeping: false,
    reset: false,
    partner: false,
    seal: false,
    adaptive: false,
    origin: false,
    study: false,
    support: false,
    whatsNew: false,
  });
  const toggleMoreSection = useCallback((key: MoreSectionKey) => {
    setMoreSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // The unravel hold (ResetSection, inside More) needs the sheet's own
  // ScrollView to get out of the way for its duration, exactly like the
  // seal's hold needs Flow's — see SealZone.tsx's onScrollLock. Without
  // this the ScrollView's native responder can steal the touch mid-hold on
  // a real device, snapping the animation back to 0 almost as soon as it
  // starts.
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const openerRef = useRef<View>(null);
  const closeRef = useRef<View>(null);

  // The gear's dot, readable on the reading screen with the knot closed.
  // Support problems only — backup state never raises it. Deliberately the
  // cheap hasSupportAttention() probe, not getSupportSummary(db), whose
  // unbounded amendment log is read once the knot is actually open (below).
  const [openerAttention, setOpenerAttention] = useState(false);
  const refreshOpenerAttention = useCallback(() => {
    setOpenerAttention(hasSupportAttention(db));
  }, [db]);
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

  // The Memory row's counts — re-read on open and whenever the library or
  // the reading screen changes a passage (the epoch).
  const memoryEpoch = useMemoryEpoch((st) => st.epoch);
  const memoryCounts = useMemo(() => {
    if (!open) return { due: 0, total: 0 };
    const learned = services.memory.learned();
    return { due: learned.filter((p) => p.due_date !== null && p.due_date <= today).length, total: learned.length };
  }, [open, services.memory, today, memoryEpoch]);

  // Re-read on every open — a Support-worthy error may have happened since
  // the knot was last opened.
  const supportSummary = useMemo(() => (open ? getSupportSummary(db) : null), [open, db]);

  // knot_open logs only when the knot itself opens (handleOpen below) — not
  // again here when a history row is chosen from within an already-open knot.
  const handleSelectHistoryEntry = useCallback((entry: HistoryEntry) => {
    setViewingEntry(entry);
  }, []);

  const handleCueSave = useCallback(
    (next: Cue) => {
      cue.set(next);
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
    // Every row starts closed on every open — the sheet is the same each time.
    setMoreSections((prev) => {
      const closed = { ...prev };
      for (const key of Object.keys(closed) as MoreSectionKey[]) closed[key] = false;
      return closed;
    });
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
        style={[styles.button, { top: 56 + insets.top, right: 20 + insets.right }]}
        onPress={handleOpen}
        accessibilityRole="button"
        accessibilityLabel={
          openerAttention
            ? 'Open settings: weave, practice, and more — needs attention'
            : 'Open settings: weave, practice, and more'
        }
      >
        <KnotIcon />
        {/* The badge appears only when something needs attention — the
            accessible name above always carries the same information in
            words, so the dot is never the sole carrier of meaning. */}
        {openerAttention && <View style={styles.buttonBadge} />}
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
          {/* An Android <Modal> is a separate native window, so the app's root
              GestureHandlerRootView does not reach it: without its own here,
              ResetSection's long-press never fires. */}
          <GestureHandlerRootView style={styles.gestureRoot}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]} accessibilityViewIsModal>
            <Selvedge />
            <Pressable
              ref={closeRef}
              style={styles.closeRow}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.close}>Close</Text>
            </Pressable>
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={scrollEnabled}
            >
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
                insetX={KNOT_PAD_X * 2}
              />

              <DisclosureSection
                summary="Practice"
                expanded={openSections.practice}
                onToggle={() => toggleSection('practice')}
              >
                <CueEditor cue={cueState} onSave={handleCueSave} />
              </DisclosureSection>
              <HeadingWeft index={0} />

              <MemoryStrip due={memoryCounts.due} total={memoryCounts.total} onOpen={() => setMemoryOpen(true)} />
              <HeadingWeft index={1} />

              <ChapterStrip hasHistory={hasHistory} onOpen={() => setHistoryOpen(true)} />
              <HeadingWeft index={2} />

              <DisclosureSection
                summary="More"
                status="Preferences, your data, about"
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
                  supportSummary={supportSummary}
                  onTranslationChanged={onTranslationChanged}
                  viewingEntry={viewingEntry}
                  onScrollLock={(locked) => setScrollEnabled(!locked)}
                />
              </DisclosureSection>
              <HeadingWeft index={3} />

              {/* Dev builds only: re-watch the seal's hold, animation and art
                  without sealing anything (src/state/sealRehearsal.ts). */}
              {__DEV__ && (
                <View style={styles.devRow}>
                  <ActionButton
                    label={rehearsalPhase === 'off' ? 'Replay the seal (dev)' : 'Stop replaying the seal (dev)'}
                    variant="quiet"
                    accessibilityHint="Shows today's seal unsealed so the hold can be watched again. Nothing is saved."
                    onPress={() => {
                      if (rehearsalPhase === 'off') {
                        useSealRehearsal.getState().start();
                        handleClose();
                      } else {
                        useSealRehearsal.getState().stop();
                      }
                    }}
                  />
                </View>
              )}
            </ScrollView>

            {/* Siblings of the ScrollView, not children of it — rendered inside the
                knot's own modal tree so opening either is never a second Modal
                stacked on top of an already-open one (the "taps open nothing"
                failure; see test/ui-contracts.test.ts). */}
            <HistoryModal
              visible={historyOpen}
              db={db}
              onClose={() => setHistoryOpen(false)}
              onSelectEntry={handleSelectHistoryEntry}
              refreshKey={historyEpoch}
            />

            <MemoryModal
              visible={memoryOpen}
              memory={services.memory}
              text={text}
              today={today}
              onClose={() => setMemoryOpen(false)}
            />

            <ChapterViewer
              entry={viewingEntry}
              text={text}
              db={db}
              onClose={() => {
                setViewingEntry(null);
                setHistoryEpoch((n) => n + 1);
              }}
            />
          </View>
          </GestureHandlerRootView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const KNOT_PAD_X = 24;

// S09 (docs/plans/reading-screen-and-motion): the knot comes off the beam.
// The sheet's top edge is a selvedge (warp ticks over one dyed thread), and as
// it opens a light weft draws under each everyday-tier row, 45 ms apart. The
// rows themselves never fade. Reduce motion: drawn still.
const SELVEDGE_H = 12;
const SELVEDGE_TICK = 8;
const HEADING_WEFT_H = 6;
const HEADING_WEFT_STAGGER_MS = 45;
// fellLine stops 16 px short of the width it is given.
const FELL_END_INSET = 16;

function Selvedge() {
  const [width, setWidth] = useState(0);
  const ticks = Math.max(0, Math.floor(width / SELVEDGE_TICK));
  return (
    <View
      style={styles.selvedge}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 && (
        <Svg width={width} height={SELVEDGE_H}>
          {Array.from({ length: ticks }, (_, i) => (
            <Line
              key={i}
              x1={i * SELVEDGE_TICK + SELVEDGE_TICK / 2}
              y1={0}
              x2={i * SELVEDGE_TICK + SELVEDGE_TICK / 2}
              y2={SELVEDGE_H - 4}
              stroke={tokens.color.warp}
              strokeWidth={1}
              strokeOpacity={0.55}
            />
          ))}
          <Line x1={0} y1={SELVEDGE_H - 2.5} x2={width} y2={SELVEDGE_H - 2.5} stroke={tokens.color.thread} strokeWidth={3} />
        </Svg>
      )}
    </View>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

function HeadingWeft({ index }: { index: number }) {
  const { reduced, ms } = useMotion();
  const [width, setWidth] = useState(0);
  const d = useMemo(() => fellLinePath(width + FELL_END_INSET, 0, 0.9, HEADING_WEFT_H / 2), [width]);
  const length = useMemo(() => {
    const pts = fellLinePoints(width + FELL_END_INSET, 0, 0.9, HEADING_WEFT_H / 2);
    let len = 0;
    for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    return Math.ceil(len) + 1;
  }, [width]);
  const drawn = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (width <= 0 || reduced) return;
    drawn.value = withDelay(
      index * HEADING_WEFT_STAGGER_MS,
      withTiming(1, { duration: ms('stitchMs'), easing: easing('outCubic') }),
    );
    // Once per open: the sheet's contents mount each time it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width > 0]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
  return (
    <View
      style={styles.headingWeft}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {width > 0 && (
        <Svg width={width} height={HEADING_WEFT_H}>
          <AnimatedPath
            d={d}
            stroke={tokens.color.thread}
            strokeWidth={1.5}
            strokeOpacity={0.5}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={length}
            animatedProps={props}
          />
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  devRow: {
    borderTopWidth: 1,
    borderTopColor: tokens.color.ink15,
    paddingTop: 12,
    alignItems: 'flex-start',
  },
  button: {
    position: 'absolute',
    // top/right are overridden inline with insets.top/insets.right added in
    // — a display cutout or curved-edge screen on the right can otherwise
    // clip the opener (issue #30).
    top: 56,
    right: 20,
    width: tokens.control.minTarget,
    height: tokens.control.minTarget,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.color.ink15,
    // Translucent, not opaque paper, so the gear still holds its shape
    // over scripture without becoming a solid card on the reading screen.
    backgroundColor: 'rgba(244, 241, 233, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  buttonBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: tokens.color.madder,
  },
  gestureRoot: {
    flex: 1,
    justifyContent: 'flex-end',
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
  selvedge: {
    height: SELVEDGE_H,
    marginHorizontal: 20, // clear of the sheet's rounded corners
  },
  headingWeft: {
    height: HEADING_WEFT_H,
    marginVertical: 2,
  },
  sheetContent: {
    paddingHorizontal: KNOT_PAD_X,
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
