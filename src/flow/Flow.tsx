import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedRef,
  runOnJS,
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import type { Cue } from '../cue';
import { useCue } from '../cue/useCue';
import { dayCountVisible, sittingCountVisible } from '../lab/arrivalVisibility';
import { getPendingReport, markApplied, type PendingReport } from '../lab/analysis/report';
import { phaseMetrics, type PhaseMetric } from '../lab/analysis/reversal';
import { getPendingLadderResponse, markLadderResponded, type PendingLapseResponse } from '../lab/lapse';
import { gradeProbe, resolveTodaysProbe, type DailyProbe, type ProbeGrade } from '../lab/probe';
import { getProfile } from '../lab/profile';
import { eyeballDates, isSrbaiDue, saveSrbai, type SrbaiAnswers } from '../lab/srbai';
import { buildYearReview, isYearReviewDue, type YearReviewReport } from '../lab/analysis/yearReview';
import { contentsFor, getHeadnote, headnoteRange, latestSeal, removeHeadnote, saveHeadnote, type Headnote } from '../headnote';
import { computeStreak, meta } from '../log/log';
import type { Services } from '../services';
import { useMemoryEpoch } from '../state/memoryEpoch';
import { useSealRehearsal } from '../state/sealRehearsal';
import { useSession } from '../state/session';
import { logicalToday } from '../log/time';
import type { Grade, Passage } from '../log/types';
import { bundledChapterCount } from '../text';
import { bookName } from '../text/canon';
import { RELEASES, WHATS_NEW_SEEN_KEY, latestReleaseId, unseenReleases } from '../whatsNew';
import { ArrivalZone } from './ArrivalZone';
import { LapseZone } from './LapseZone';
import { ProbeZone } from './ProbeZone';
import { RecallZone } from './RecallZone';
import { ScriptureZone, type ScriptureZoneHandle } from './ScriptureZone';
import { StudyHint } from './StudyHint';
import { WhatsNewCard } from './WhatsNewCard';
import { SealZone } from './SealZone';
import { SrbaiZone } from './SrbaiZone';
import { WeaveZone } from './WeaveZone';
import { YearReviewZone } from './YearReviewZone';
import { DismissalZone } from './DismissalZone';
import { HeadnoteSheet, type NarrowedRange } from './HeadnoteSheet';
import { ThreadRail } from './ThreadRail';
import { deriveBolt, type Bolt } from './bolt';
import { isDismissalReady } from './dismissalReadiness';
import { scriptureFitsOnScreen } from './readingProgress';
import { mark, summary } from '../startup/timing';
import { ErrorState } from '../ui/FeedbackState';
import { LaunchWeave } from '../ui/LaunchWeave';
import { VerseContextSheet } from '../study/VerseContextSheet';
import { visibleTermCues } from '../study/selection';

interface FlowProps {
  services: Services;
}

// §04 — one flow, no navigation: Arrival → Recall (if due) →
// Scripture → Seal → Weave → Dismissal, one continuous scroll. Weave
// is also reachable any time via the knot (W5), independent of
// today's seal.
export function Flow({ services }: FlowProps) {
  mark('flowRender');
  const { db, log, text, study, memory, notifier, partner } = services;
  const session = useSession();
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [railHeight, setRailHeight] = useState(0);

  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(1);
  const layoutHeight = useSharedValue(1);
  const scriptureTop = useSharedValue(0);
  const scriptureBottom = useSharedValue(0);
  const sealLineY = useSharedValue(-1);
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const readingStartFired = useSharedValue(false);
  const scrollEndFired = useSharedValue(false);

  const [bolt, setBolt] = useState<Bolt>({ book: '', sealed: [] });

  const today = useRef(logicalToday()).current;
  const readingStartLogged = useRef(false);
  const scrollEndLogged = useRef(false);

  useEffect(() => {
    void session.load(db, log, text, today);
  }, [db, log, text, today]);

  const refreshBolt = useCallback(() => {
    setBolt(deriveBolt(db, log, today));
  }, [db, log, today]);

  useEffect(() => {
    if (session.sealedToday) refreshBolt();
  }, [session.sealedToday, refreshBolt]);

  // §15 — reports surface once, after a seal, never before or during
  // reading.
  const [pendingReport, setPendingReport] = useState<PendingReport | null>(null);
  const [reportPhases, setReportPhases] = useState<PhaseMetric[]>([]);
  useEffect(() => {
    if (!session.sealedToday) return;
    const report = getPendingReport(db);
    setPendingReport(report);
    setReportPhases(report ? phaseMetrics(db, report.expId) : []);
  }, [session.sealedToday, db]);

  // §09/§19 — SRBAI + the monthly eyeball, once a month, after a seal.
  const [srbaiDue, setSrbaiDue] = useState(false);
  useEffect(() => {
    if (session.sealedToday) setSrbaiDue(isSrbaiDue(db, today));
  }, [session.sealedToday, db, today]);

  const handleSaveSrbai = useCallback(
    (answers: SrbaiAnswers) => {
      saveSrbai(db, today, answers);
      setSrbaiDue(false); // §04 zone 5 — resolved, so the dismissal gate can clear
    },
    [db, today],
  );

  // §12 R6 "the year" — due exactly once, day 365+.
  const [yearReview, setYearReview] = useState<YearReviewReport | null>(null);
  useEffect(() => {
    if (!session.sealedToday) return;
    const trialStart = meta.get(db, 'trial_start');
    if (!trialStart) return;
    if (isYearReviewDue(db, today, trialStart, meta.get(db, 'year_review_shown') === '1')) {
      setYearReview(buildYearReview(db, today, trialStart));
    }
  }, [session.sealedToday, db, today]);

  const handleDismissYearReview = useCallback(() => {
    meta.set(db, 'year_review_shown', '1');
    setYearReview(null);
  }, [db]);

  const handleApplyReport = useCallback(
    (expId: string) => {
      markApplied(db, expId, true);
      setPendingReport(null);
    },
    [db],
  );
  const handleKeepReport = useCallback(
    (expId: string) => {
      markApplied(db, expId, false);
      setPendingReport(null);
    },
    [db],
  );

  // §11/§12 — the lapse ladder's user-facing tiers. Ungated by
  // sealedToday, unlike a report: this exists precisely because today
  // may not get sealed.
  const [pendingLapse, setPendingLapse] = useState<PendingLapseResponse | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  // One source of truth for the cue: the arrival screen and the knot both
  // edit it, so both read it from the service rather than keeping a copy (#32).
  const cueState = useCue(services.cue);

  useEffect(() => {
    if (session.status !== 'ready') return;
    setPendingLapse(getPendingLadderResponse(db, today));
  }, [session.status, db, today]);

  useEffect(() => {
    void partner.get().then((p) => setPartnerName(p?.name ?? null));
  }, [partner]);

  const handleSaveCue = useCallback(
    (c: Cue) => {
      services.cue.set(c);
    },
    [services.cue],
  );

  const handleExitBook = useCallback(
    (bookId: string) => {
      meta.set(db, 'current_book', bookId);
      meta.set(db, 'current_chapter', '1');
      meta.set(db, 'current_sitting', '0');
      meta.set(db, 'book_started_local_date', today);
      log.write({ type: 'book_start', book: bookId, chapter: 1 });
      void session.load(db, log, text, today);
    },
    [db, log, text, today, session],
  );

  const handlePause = useCallback(() => {
    meta.set(db, 'paused', '1');
  }, [db]);

  const handleKeepNudging = useCallback(() => {
    // No state change — nudging continues exactly as it was.
  }, []);

  const handleHandoff = useCallback(() => {
    void partner.openConversation();
  }, [partner]);

  const handleDismissLapse = useCallback(() => {
    markLadderResponded(db, today);
    setPendingLapse(null);
  }, [db, today]);

  useEffect(() => {
    if (session.status !== 'ready') return;
    // Known simplification: runs once per app open against whatever
    // cue is active then. Editing the cue mid-session (via the knot)
    // doesn't retroactively reschedule notifications already planned
    // for future dates — they catch up on the next open.
    const currentCue = services.cue.current();
    if (currentCue) void notifier.syncWindow(currentCue, today);
  }, [session.status, notifier, services.cue, today]);

  // §14 E4, applied — the completion floor. 'one_verse' only requires
  // reading to have started; the default 'full_chapter' requires
  // having scrolled to the bottom. Mirrors the worklet-side
  // readingStartFired/scrollEndFired shared values into plain React
  // state so SealZone (a JS-thread component) can read them.
  const [hasStartedReading, setHasStartedReading] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  const logReadingStart = useCallback(() => {
    if (readingStartLogged.current) return;
    readingStartLogged.current = true;
    setHasStartedReading(true);
    log.write({ type: 'reading_start', book: session.book, chapter: session.chapter, sitting: session.sittingIndex });
  }, [log, session.book, session.chapter, session.sittingIndex]);

  const logScrollEnd = useCallback(
    (scrollPct: number) => {
      if (scrollEndLogged.current) return;
      scrollEndLogged.current = true;
      setHasReachedEnd(true);
      log.write({
        type: 'scroll_end',
        book: session.book,
        chapter: session.chapter,
        sitting: session.sittingIndex,
        scroll_pct: scrollPct,
      });
    },
    [log, session.book, session.chapter, session.sittingIndex],
  );

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;

    const viewportMid = event.contentOffset.y + layoutHeight.value / 2;
    if (!readingStartFired.value && viewportMid > scriptureTop.value) {
      readingStartFired.value = true;
      runOnJS(logReadingStart)();
    }

    const reachedBottom =
      scriptureBottom.value > 0 && event.contentOffset.y + layoutHeight.value >= scriptureBottom.value;
    if (!scrollEndFired.value && reachedBottom) {
      scrollEndFired.value = true;
      const scrollable = Math.max(1, contentHeight.value - layoutHeight.value);
      runOnJS(logScrollEnd)(Math.min(1, event.contentOffset.y / scrollable));
    }
  });

  // A sitting short enough to fit on screen never scrolls, so the scroll
  // handler above would never mark it started or finished and the seal would
  // stay locked. Judge it from layout instead (src/flow/readingProgress.ts).
  // Plain mirrors of the two heights: a shared value read on the JS thread
  // right after a JS-thread write can still return its previous value.
  const viewportHeightRef = useRef(0);
  const scriptureBottomRef = useRef(0);
  const checkFitsOnScreen = useCallback(() => {
    if (session.sealedToday || (session.sittings[session.sittingIndex]?.length ?? 0) === 0) return;
    if (!scriptureFitsOnScreen(scriptureBottomRef.current, viewportHeightRef.current)) return;
    if (!readingStartFired.value) {
      readingStartFired.value = true;
      logReadingStart();
    }
    if (!scrollEndFired.value) {
      scrollEndFired.value = true;
      logScrollEnd(1);
    }
  }, [session.sealedToday, session.sittings, session.sittingIndex, readingStartFired, scrollEndFired, logReadingStart, logScrollEnd]);

  const handleSeal = useCallback(() => {
    void session.seal(db, log, text, today).then(() => {
      // The session advances to a new sitting/chapter in place (no
      // remount) — rearm the once-per-reading log guards for it.
      readingStartLogged.current = false;
      scrollEndLogged.current = false;
      readingStartFired.value = false;
      scrollEndFired.value = false;
      setHasStartedReading(false);
      setHasReachedEnd(false);
      void notifier.cancelToday(today); // §08 — sealing silences the phone for the rest of the day
      refreshBolt();
    });
  }, [session, db, log, text, today, refreshBolt, readingStartFired, scrollEndFired, notifier]);

  // Dev builds only — "Replay the seal" (knot). The seal and rail show their
  // unsealed look; a completed hold finishes the rehearsal instead of sealing,
  // and a released hold logs nothing. Everything else reads the real day.
  const rehearsal = useSealRehearsal((st) => st.phase);
  const rehearsing = __DEV__ && rehearsal !== 'off';
  const sealShown = rehearsing ? rehearsal === 'sealed' : session.sealedToday;
  useEffect(() => {
    if (!rehearsing || rehearsal !== 'ready') return;
    // Bring the seal line into view to rehearse on.
    const y = Math.max(0, sealLineY.value - layoutHeight.value / 2);
    scrollRef.current?.scrollTo({ y, animated: true });
  }, [rehearsing, rehearsal, sealLineY, layoutHeight, scrollRef]);
  useEffect(() => () => useSealRehearsal.getState().stop(), []);

  const handleHoldCancel = useCallback(() => {
    log.write({ type: 'hold_cancel', book: session.book, chapter: session.chapter, sitting: session.sittingIndex });
  }, [log, session.book, session.chapter, session.sittingIndex]);

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const scriptureRef=useRef<ScriptureZoneHandle>(null);

  const [candidates, setCandidates] = useState<Passage[]>([]);
  const [chapterCandidates, setChapterCandidates] = useState<Passage[]>([]);
  const [contextVerse, setContextVerse] = useState<number | null>(null);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [rangeAnchor, setRangeAnchor] = useState<number | null>(null);
  const [rangePreview, setRangePreview] = useState<{ start:number; end:number } | null>(null);
  const sittingVerses = useMemo(
    () => session.sittings[session.sittingIndex] ?? [],
    [session.sittings, session.sittingIndex],
  );

  // §04 — one-time study-tap hint. ChapterViewer (the knot's recorded-portion
  // viewer) is a separate component entirely, so this never shows there.
  const [studyHintSeen, setStudyHintSeen] = useState(() => meta.get(db, 'study_hint_seen') === '1');
  const handleDismissStudyHint = useCallback(() => {
    meta.set(db, 'study_hint_seen', '1');
    setStudyHintSeen(true);
  }, [db]);

  // What's new after an update — the study hint's sibling, shown in its place
  // (never both at once) until dismissed. Onboarding marks new readers as seen.
  const [whatsNew, setWhatsNew] = useState(() => unseenReleases(RELEASES, meta.get(db, WHATS_NEW_SEEN_KEY)));
  const handleDismissWhatsNew = useCallback(() => {
    const latest = latestReleaseId(RELEASES);
    if (latest !== null) meta.set(db, WHATS_NEW_SEEN_KEY, latest);
    setWhatsNew([]);
  }, [db]);
  const termCues = useMemo(() => study.termsForVerses(sittingVerses, 4), [sittingVerses, study]);
  const contextTarget = contextVerse === null
    ? null
    : { book: session.book, chapter: session.chapter, verse: contextVerse };
  const contextResources = useMemo(
    () => contextTarget ? study.resourcesForVerse(contextTarget) : [],
    [contextTarget?.book, contextTarget?.chapter, contextTarget?.verse, study],
  );
  const contextBookResources = useMemo(
    () => contextTarget ? study.bookResources(session.book) : [],
    [contextTarget?.book, session.book, study],
  );
  const relatedArticles = useMemo(() => {
    if (contextVerse === null) return [];
    return study
      .termsForVerses(sittingVerses.filter((verse) => verse.verse === contextVerse), 4)
      .map((cue) => study.article(cue.articleId))
      .filter((article): article is NonNullable<typeof article> => article !== null);
  }, [contextVerse, sittingVerses, study]);

  // docs/plans/recall-settings — library changes (adds, deletes, learning a
  // mark) bump this so the reading screen re-reads; see memoryEpoch.ts.
  const memoryEpoch = useMemoryEpoch((st) => st.epoch);
  const bumpMemory = useMemoryEpoch((st) => st.bump);
  const setShownToday = useMemoryEpoch((st) => st.setShownToday);

  // The book-end offer: the marks as they stood when the book finished.
  // Learning one keeps it in the list (shown "Learning ✓"); deleting one in
  // the library removes it.
  useEffect(() => {
    setCandidates(session.justFinishedBook ? memory.candidates(session.justFinishedBook) : []);
  }, [session.justFinishedBook, memory]);
  useEffect(() => {
    setCandidates((prev) => {
      if (prev.length === 0) return prev;
      const alive = new Set([...memory.learned(), ...memory.marked()].map((p) => p.id));
      const next = prev.filter((p) => alive.has(p.id));
      return next.length === prev.length ? prev : next;
    });
  }, [memoryEpoch, memory]);
  const learnedIds = useMemo(
    () => new Set(memory.learned().map((p) => p.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memory, memoryEpoch, candidates],
  );

  // §04 zone 5 / §21 — the book-end promotion choice. Reset for every newly
  // finished book so an old resolution can't silently satisfy a new one.
  const [promotionResolved, setPromotionResolved] = useState(false);
  const [promotionMessage, setPromotionMessage] = useState<string | null>(null);
  useEffect(() => {
    setPromotionResolved(false);
    setPromotionMessage(null);
  }, [session.justFinishedBook]);
  // docs/plans/recall-settings — the book end is an offer: learn none, one or
  // several, then Done.
  const handleFinishPromotion = useCallback(() => setPromotionResolved(true), []);

  // docs/plans/bibleproject-book-videos — today's headnote, offered after the
  // seal and never required. Keyed on the seal event itself (its own
  // local_date and passage), never on this screen's mount-time `today` or on
  // the session's book/chapter, which a restart has already moved on. Nothing
  // here logs, and saving never reloads the session.
  const headnoteSeal = useMemo(
    () => (session.sealedToday && !rehearsing ? latestSeal(db) : null),
    [session.sealedToday, rehearsing, db],
  );
  const [headnote, setHeadnote] = useState<Headnote | null>(null);
  const [headnoteOpen, setHeadnoteOpen] = useState(false);
  useEffect(() => {
    setHeadnote(headnoteSeal ? getHeadnote(db, headnoteSeal.localDate) : null);
  }, [headnoteSeal, db]);
  // The merged-forward chapter span is only known in the sealing session,
  // while the session still holds the sealed portion.
  const headnoteChapterEnd =
    headnoteSeal && session.book === headnoteSeal.book && session.chapter === headnoteSeal.chapter
      ? session.portionChapters[session.portionChapters.length - 1] ?? null
      : null;
  const handleSaveHeadnote = useCallback(
    (words: string, narrowed?: NarrowedRange | null) => {
      if (!headnoteSeal) return;
      setHeadnote(saveHeadnote(db, { seal: headnoteSeal, text: words, chapterEnd: headnoteChapterEnd, narrowed }));
      setHeadnoteOpen(false);
    },
    [db, headnoteSeal, headnoteChapterEnd],
  );
  // The finished reading's contents at "You finished" — recomputed when today's
  // headnote changes, so a line kept on the finishing day appears straight
  // away. One-shot by design (justFinishedBook clears on any reload);
  // Reading history is the durable home.
  const finishedContents = useMemo(() => {
    if (!session.justFinishedBook) return null;
    const reading = contentsFor(db, session.justFinishedBook)[0];
    return reading?.hasHeadnotes ? reading.rows : null;
  }, [db, session.justFinishedBook, headnote]);
  const handleDeleteHeadnote = useCallback(() => {
    if (!headnoteSeal) return;
    removeHeadnote(db, headnoteSeal.localDate);
    setHeadnote(null);
    setHeadnoteOpen(false);
  }, [db, headnoteSeal]);

  const refreshChapterCandidates = useCallback(() => {
    setChapterCandidates(memory.candidatesForChapter(session.book, session.chapter));
    // memoryEpoch: a mark learned or deleted in the library refreshes the highlights.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory, session.book, session.chapter, memoryEpoch]);

  useEffect(() => {
    refreshChapterCandidates();
    setContextVerse(null);
    setActiveArticleId(null);
    setRangeAnchor(null);
    setRangePreview(null);
  }, [refreshChapterCandidates]);

  const handleOpenVerse = useCallback((verse: number) => {
    setActiveArticleId(null);
    setContextVerse(verse);
  }, []);
  const handleOpenTerm = useCallback((articleId: string, verse: number) => {
    setActiveArticleId(articleId);
    setContextVerse(verse);
  }, []);
  const dismissContext = useCallback((returnVerse:number|null, preserveRange=false) => {
    setContextVerse(null);
    setActiveArticleId(null);
    setRangePreview(null);
    if(!preserveRange)setRangeAnchor(null);
    if(returnVerse!==null)setTimeout(()=>scriptureRef.current?.focusVerse(returnVerse),100);
  },[]);
  const handleRememberVerse = useCallback(() => {
    if (contextVerse === null) return;
    memory.markCandidate({ book:session.book, chapter:session.chapter, verseStart:contextVerse, verseEnd:contextVerse });
    refreshChapterCandidates();
    dismissContext(contextVerse);
  }, [contextVerse, dismissContext, memory, refreshChapterCandidates, session.book, session.chapter]);
  const handleSelectPassage = useCallback(() => {
    if (contextVerse !== null) setRangeAnchor(contextVerse);
    dismissContext(contextVerse,true);
  }, [contextVerse,dismissContext]);
  const handleSelectEndpoint = useCallback((verse: number) => {
    if (rangeAnchor === null) return;
    setRangePreview({ start:Math.min(rangeAnchor, verse), end:Math.max(rangeAnchor, verse) });
    setContextVerse(verse);
  }, [rangeAnchor]);
  const handleConfirmRange = useCallback(() => {
    if (!rangePreview) return;
    memory.markCandidate({ book:session.book, chapter:session.chapter, verseStart:rangePreview.start, verseEnd:rangePreview.end });
    refreshChapterCandidates();
    dismissContext(contextVerse);
  }, [contextVerse, dismissContext, memory, rangePreview, refreshChapterCandidates, session.book, session.chapter]);
  const handleRemoveCandidate = useCallback((passage: Passage) => {
    memory.unmarkCandidateById(passage.id);
    refreshChapterCandidates();
  }, [memory, refreshChapterCandidates]);

  const handlePromote = useCallback(
    (id: number) => {
      const result = memory.promote(id, today);
      if (result.ok) {
        setPromotionMessage(null);
        bumpMemory();
      } else {
        setPromotionMessage(result.reason === 'duplicate' ? "You're already learning that passage." : 'That passage is gone.');
      }
    },
    [memory, today, bumpMemory],
  );

  const handlePickNextBook = useCallback(
    (bookId: string) => {
      session.pickNextBook(db, bookId);
    },
    [session, db],
  );

  // §04 zone 1b — only if due; the zone does not exist otherwise.
  // docs/plans/recall-settings — up to the reader's daily cap, and the set is
  // frozen for the day: grading a card never pulls the next due one in.
  // On a library change (epoch) the shown cards are re-read — deleted ones
  // go, ones graded in the library go, ones graded here stay (shown done) —
  // and new due cards are added only while fewer than the cap were shown
  // today, so raising the cap adds cards.
  const [dueToday, setDueToday] = useState<Passage[]>([]);
  const recallShownLogged = useRef(false);
  const shownToday = useRef<{ date: string; ids: number[] }>({ date: '', ids: [] });
  const zoneGraded = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (session.status !== 'ready') return;
    if (shownToday.current.date !== today) {
      // Restored from meta so an app restart mid-day keeps the same set.
      let saved: { date: string; ids: number[] } | null = null;
      try {
        saved = JSON.parse(meta.get(db, 'recall_shown_today') ?? 'null');
      } catch {
        saved = null;
      }
      shownToday.current = saved && saved.date === today && Array.isArray(saved.ids) ? saved : { date: today, ids: [] };
      zoneGraded.current = new Set();
      recallShownLogged.current = false;
    }
    const shown = shownToday.current.ids;
    const cap = memory.recallCap();
    for (const p of memory.due(today)) {
      if (shown.length >= cap) break;
      if (!shown.includes(p.id)) shown.push(p.id);
    }
    const byId = new Map(memory.learned().map((p) => [p.id, p]));
    const visible = shown
      .map((id) => byId.get(id))
      .filter((p): p is Passage => !!p && ((p.due_date !== null && p.due_date <= today) || zoneGraded.current.has(p.id)));
    setDueToday(visible);
    setShownToday([...shown]);
    meta.set(db, 'recall_shown_today', JSON.stringify({ date: today, ids: shown }));
    if (visible.length > 0 && !recallShownLogged.current) {
      recallShownLogged.current = true;
      log.write({ type: 'recall_shown' });
    }
  }, [session.status, memory, today, log, db, memoryEpoch, setShownToday]);

  const getVerseText = useCallback(
    async (p: Passage) => {
      const verses = await text.getChapter(p.book, p.chapter);
      return verses
        .filter((v) => v.verse >= p.verse_start && v.verse <= p.verse_end)
        .map((v) => v.text)
        .join(' ');
    },
    [text],
  );

  const handleGradeRecall = useCallback(
    (id: number, grade: Grade) => {
      zoneGraded.current.add(id); // stays on screen as done; deliberately no epoch bump
      memory.grade(id, grade, today);
    },
    [memory, today],
  );

  const handleSkipRecall = useCallback(() => {
    log.write({ type: 'recall_skipped' });
  }, [log]);

  // §10/E9 — the next-day recall probe. Decided (and persisted) once
  // per day; resolveTodaysProbe() is itself idempotent, so re-running
  // this effect never re-rolls it.
  const [probe, setProbe] = useState<DailyProbe | null>(null);
  const probeFiredLogged = useRef(false);

  useEffect(() => {
    if (session.status !== 'ready') return;
    const trialSeed = meta.get(db, 'trial_seed') ?? 'thread-default-seed';
    const probeRate = Number(getProfile(db, 'probeRate') ?? '0.6'); // §14 E9, applied
    const todaysProbe = resolveTodaysProbe(db, today, trialSeed, probeRate);
    setProbe(todaysProbe);
    if (todaysProbe && !probeFiredLogged.current) {
      probeFiredLogged.current = true;
      log.write({ type: 'probe_fired', book: todaysProbe.book, chapter: todaysProbe.chapter });
    }
  }, [session.status, db, today, log]);

  const getProbeSpanText = useCallback(async () => {
    if (!probe) return '';
    const verses = await text.getChapter(probe.book, probe.chapter);
    return verses
      .filter((v) => v.verse >= probe.verseStart && v.verse <= probe.verseEnd)
      .map((v) => v.text)
      .join(' ');
  }, [text, probe]);

  const handleGradeProbe = useCallback(
    (grade: ProbeGrade) => {
      if (!probe) return;
      gradeProbe(db, today, grade);
      log.write({ type: 'probe_graded', book: probe.book, chapter: probe.chapter });
    },
    [db, today, log, probe],
  );

  const handleRetryLoad = useCallback(() => {
    void session.load(db, log, text, today);
  }, [session, db, log, text, today]);

  // The launch weave keeps playing through its own success dissolve even
  // after status flips to 'ready', so it stays mounted one tick longer than
  // the loading state itself.
  const [showLaunch, setShowLaunch] = useState(true);
  const dismissLaunch = useCallback(() => {
    mark('launchDismissed');
    // Release-speed timing: start Metro with EXPO_PUBLIC_DEBUG_STARTUP=1 and
    // read `adb logcat -s ReactNativeJS` (docs/plans/reading-screen-and-motion).
    if (__DEV__ || process.env.EXPO_PUBLIC_DEBUG_STARTUP === '1') console.log('[startup]', JSON.stringify(summary()));
    setShowLaunch(false);
  }, []);
  useEffect(() => {
    if (session.status === 'ready') mark('sessionReady');
  }, [session.status]);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  if (session.status === 'error') {
    return (
      <ErrorState
        message={session.error ?? 'Something went wrong while loading today’s reading.'}
        onRetry={handleRetryLoad}
      />
    );
  }

  if (showLaunch) {
    return (
      <LaunchWeave
        width={windowWidth}
        height={windowHeight}
        done={session.status === 'ready'}
        onDismissed={dismissLaunch}
        onRetry={handleRetryLoad}
      />
    );
  }

  // §14, applied settings — read fresh each render (a plain SQLite
  // read, same pattern as services.cue.current() below) so a report
  // Applied moments ago takes effect on the very next render.
  const sealMode = getProfile(db, 'seal') === 'tap' ? 'tap' : 'hold';
  const floor = getProfile(db, 'floor') === 'one_verse' ? 'one_verse' : 'full_chapter';
  const canSeal = floor === 'one_verse' ? hasStartedReading : hasReachedEnd;
  const streak = getProfile(db, 'streakVisible') === '1' && session.sealedToday ? computeStreak(db, today) : null;
  const showDayCount = dayCountVisible(db, today);
  const showSittingCount = sittingCountVisible(db, today);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom, paddingRight: insets.right },
      ]}
      onLayout={(e) => {
        layoutHeight.value = e.nativeEvent.layout.height;
        setRailHeight(e.nativeEvent.layout.height);
        viewportHeightRef.current = e.nativeEvent.layout.height;
        checkFitsOnScreen();
      }}
    >
      <ThreadRail
        scrollY={scrollY}
        contentHeight={contentHeight}
        layoutHeight={layoutHeight}
        railHeight={railHeight}
        sealLineY={sealLineY}
        viewportTop={insets.top}
        sealed={sealShown}
        reducedMotion={reducedMotion}
      />
      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollEnabled={scrollEnabled}
        onContentSizeChange={(_, h) => (contentHeight.value = h)}
      >
        <ArrivalZone
          today={today}
          cue={cueState}
          book={session.book}
          chapter={session.chapter}
          sittingIndex={session.sittingIndex}
          sittingsTotal={session.sittings.length}
          daysInBook={session.daysInBook}
          showDayCount={showDayCount}
          showSittingCount={showSittingCount}
        />
        {pendingLapse && (
          <LapseZone
            response={pendingLapse.response}
            partnerName={partnerName}
            cue={cueState}
            currentBookId={session.book}
            onSaveCue={handleSaveCue}
            onExitBook={handleExitBook}
            onPause={handlePause}
            onKeepNudging={handleKeepNudging}
            onHandoff={handleHandoff}
            onDismiss={handleDismissLapse}
          />
        )}
        {dueToday.length > 0 && (
          <RecallZone
            passages={dueToday}
            getVerseText={getVerseText}
            onGrade={handleGradeRecall}
            onSkip={handleSkipRecall}
          />
        )}
        {probe && (
          <ProbeZone
            book={probe.book}
            chapter={probe.chapter}
            verseStart={probe.verseStart}
            verseEnd={probe.verseEnd}
            getSpanText={getProbeSpanText}
            onGrade={handleGradeProbe}
          />
        )}
        {sittingVerses.length > 0 && (whatsNew.length > 0
          ? <WhatsNewCard releases={whatsNew} onDismiss={handleDismissWhatsNew} />
          : !studyHintSeen && <StudyHint onDismiss={handleDismissStudyHint} />)}
        <ScriptureZone
          ref={scriptureRef}
          verses={sittingVerses}
          attribution={session.attribution}
          onLayout={(y, height) => {
            scriptureTop.value = y;
            scriptureBottom.value = y + height;
            scriptureBottomRef.current = y + height;
            checkFitsOnScreen();
          }}
          onOpenVerse={handleOpenVerse}
          onOpenTerm={handleOpenTerm}
          onSelectEndpoint={handleSelectEndpoint}
          onCancelSelection={() => setRangeAnchor(null)}
          selectionAnchor={rangeAnchor}
          remembered={chapterCandidates}
          terms={visibleTermCues(termCues, rangeAnchor)}
        />
        <SealZone
          sealed={sealShown}
          reducedMotion={reducedMotion}
          onSeal={rehearsing ? useSealRehearsal.getState().finish : handleSeal}
          onHoldCancel={rehearsing ? () => undefined : handleHoldCancel}
          onScrollLock={(locked) => setScrollEnabled(!locked)}
          sealMode={sealMode}
          canSeal={rehearsing || canSeal}
          floor={floor}
          dayLabel={showDayCount ? session.daysInBook : null}
          onLineLayout={(y) => {
            sealLineY.value = y;
          }}
        />
        {session.sealedToday && (
          <>
            <WeaveZone
              book={bolt.book}
              chapterCount={bundledChapterCount(bolt.book)}
              sealed={bolt.sealed}
              streak={streak}
            />
            {srbaiDue && <SrbaiZone eyeballDates={eyeballDates(db, today)} onSave={handleSaveSrbai} />}
            {yearReview && <YearReviewZone report={yearReview} onDismiss={handleDismissYearReview} />}
            <DismissalZone
              book={session.book}
              chapter={session.chapter}
              chapterCount={bundledChapterCount(session.book)}
              justFinishedBook={session.justFinishedBook}
              candidates={candidates}
              onPromote={handlePromote}
              learnedIds={learnedIds}
              promotionMessage={promotionMessage}
              promotionResolved={promotionResolved}
              onFinishPromotion={handleFinishPromotion}
              needsNextBookPick={session.nextBookNeeded}
              onPickNextBook={handlePickNextBook}
              pendingReport={pendingReport}
              reportPhases={reportPhases}
              onApplyReport={handleApplyReport}
              onKeepReport={handleKeepReport}
              terminalReady={isDismissalReady({
                srbaiDue,
                yearReviewDue: yearReview !== null,
                hasPendingReport: pendingReport !== null,
                needsNextBookPick: session.nextBookNeeded,
                hasPromotionChoice: session.justFinishedBook !== null && candidates.length > 0,
                promotionResolved,
              })}
              canWriteHeadnote={headnoteSeal !== null}
              headnote={headnote}
              onWriteHeadnote={() => setHeadnoteOpen(true)}
              finishedContents={finishedContents}
            />
          </>
        )}
      </Animated.ScrollView>
      {headnoteSeal && (
        <HeadnoteSheet
          visible={headnoteOpen}
          heading={`${bookName(headnoteSeal.book)} ${headnoteSeal.chapter}`}
          passageLabel={`About: ${headnoteRange(
            headnote ?? {
              chapter: headnoteSeal.chapter,
              chapterEnd: headnoteChapterEnd,
              verseStart: headnoteSeal.verseFirst,
              verseEnd: headnoteSeal.verseLast,
            },
          )}`}
          initialText={headnote?.text ?? ''}
          text={text}
          narrowable={(() => {
            const start = headnote?.verseStart ?? headnoteSeal.verseFirst ?? 1;
            return { book: headnoteSeal.book, chapter: headnoteSeal.chapter, start, end: headnote?.verseEnd ?? headnoteSeal.verseLast ?? start };
          })()}
          narrowedAtOpen={
            !!headnote &&
            (headnote.chapter !== headnoteSeal.chapter || headnote.verseStart !== headnoteSeal.verseFirst || headnote.verseEnd !== headnoteSeal.verseLast)
          }
          onSave={handleSaveHeadnote}
          onDelete={headnote ? handleDeleteHeadnote : undefined}
          onClose={() => setHeadnoteOpen(false)}
        />
      )}
      <VerseContextSheet
        verse={contextTarget}
        resources={contextResources}
        bookResources={contextBookResources}
        related={relatedArticles}
        activeArticle={activeArticleId ? study.article(activeArticleId) : null}
        remembered={contextVerse === null ? [] : chapterCandidates.filter((passage) => contextVerse >= passage.verse_start && contextVerse <= passage.verse_end)}
        preview={rangePreview}
        onClose={() => dismissContext(contextVerse)}
        onRememberVerse={handleRememberVerse}
        onSelectPassage={handleSelectPassage}
        onConfirmRange={handleConfirmRange}
        onRemove={handleRemoveCandidate}
        onOpenArticle={setActiveArticleId}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingLeft: 30 },
});
