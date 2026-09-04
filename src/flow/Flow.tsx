import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import type { Cue } from '../cue';
import { getPendingReport, markApplied, type PendingReport } from '../lab/analysis/report';
import { phaseMetrics, type PhaseMetric } from '../lab/analysis/reversal';
import { getPendingLadderResponse, markLadderResponded, type PendingLapseResponse } from '../lab/lapse';
import { gradeProbe, resolveTodaysProbe, type DailyProbe, type ProbeGrade } from '../lab/probe';
import { getProfile } from '../lab/profile';
import { eyeballDates, isSrbaiDue, saveSrbai, type SrbaiAnswers } from '../lab/srbai';
import { buildYearReview, isYearReviewDue, type YearReviewReport } from '../lab/analysis/yearReview';
import { computeStreak, meta } from '../log/log';
import type { Services } from '../services';
import { useSession } from '../state/session';
import { logicalToday } from '../log/time';
import type { Grade, Passage } from '../log/types';
import { DAILY_RECALL_CAP } from '../memory/leitner';
import { bundledChapterCount } from '../text';
import { ArrivalZone } from './ArrivalZone';
import { LapseZone } from './LapseZone';
import { ProbeZone } from './ProbeZone';
import { RecallZone } from './RecallZone';
import { ScriptureZone, type ScriptureZoneHandle } from './ScriptureZone';
import { SealZone } from './SealZone';
import { SrbaiZone } from './SrbaiZone';
import { WeaveZone } from './WeaveZone';
import { YearReviewZone } from './YearReviewZone';
import { DismissalZone } from './DismissalZone';
import { ThreadRail } from './ThreadRail';
import { deriveBolt, type Bolt } from './bolt';
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
  const { db, log, text, study, memory, notifier, partner } = services;
  const session = useSession();
  const reducedMotion = useReducedMotion();

  const scrollY = useSharedValue(0);
  const contentHeight = useSharedValue(1);
  const layoutHeight = useSharedValue(1);
  const scriptureTop = useSharedValue(0);
  const scriptureBottom = useSharedValue(0);
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

  useEffect(() => {
    if (session.loading) return;
    setPendingLapse(getPendingLadderResponse(db, today));
  }, [session.loading, db, today]);

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
    if (session.loading) return;
    // Known simplification: runs once per app open against whatever
    // cue is active then. Editing the cue mid-session (via the knot)
    // doesn't retroactively reschedule notifications already planned
    // for future dates — they catch up on the next open.
    const currentCue = services.cue.current();
    if (currentCue) void notifier.syncWindow(currentCue, today);
  }, [session.loading, notifier, services.cue, today]);

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

  useEffect(() => {
    setCandidates(session.justFinishedBook ? memory.candidates(session.justFinishedBook) : []);
  }, [session.justFinishedBook, memory]);

  const refreshChapterCandidates = useCallback(() => {
    setChapterCandidates(memory.candidatesForChapter(session.book, session.chapter));
  }, [memory, session.book, session.chapter]);

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
      memory.promote(id, today);
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    },
    [memory, today],
  );

  const handlePickNextBook = useCallback(
    (bookId: string) => {
      session.pickNextBook(db, bookId);
    },
    [session, db],
  );

  // §04 zone 1b — only if due; the zone does not exist otherwise.
  const [dueToday, setDueToday] = useState<Passage[]>([]);
  const recallShownLogged = useRef(false);

  useEffect(() => {
    if (session.loading) return;
    const due = memory.due(today).slice(0, DAILY_RECALL_CAP);
    setDueToday(due);
    if (due.length > 0 && !recallShownLogged.current) {
      recallShownLogged.current = true;
      log.write({ type: 'recall_shown' });
    }
  }, [session.loading, memory, today, log]);

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
    if (session.loading) return;
    const trialSeed = meta.get(db, 'trial_seed') ?? 'thread-default-seed';
    const probeRate = Number(getProfile(db, 'probeRate') ?? '0.6'); // §14 E9, applied
    const todaysProbe = resolveTodaysProbe(db, today, trialSeed, probeRate);
    setProbe(todaysProbe);
    if (todaysProbe && !probeFiredLogged.current) {
      probeFiredLogged.current = true;
      log.write({ type: 'probe_fired', book: todaysProbe.book, chapter: todaysProbe.chapter });
    }
  }, [session.loading, db, today, log]);

  const getProbeChapterText = useCallback(async () => {
    if (!probe) return '';
    const verses = await text.getChapter(probe.book, probe.chapter);
    return verses.map((v) => v.text).join(' ');
  }, [text, probe]);

  const handleGradeProbe = useCallback(
    (grade: ProbeGrade) => {
      if (!probe) return;
      gradeProbe(db, today, grade);
      log.write({ type: 'probe_graded', book: probe.book, chapter: probe.chapter });
    },
    [db, today, log, probe],
  );

  if (session.loading) return null;

  // §14, applied settings — read fresh each render (a plain SQLite
  // read, same pattern as services.cue.current() below) so a report
  // Applied moments ago takes effect on the very next render.
  const sealMode = getProfile(db, 'seal') === 'tap' ? 'tap' : 'hold';
  const floor = getProfile(db, 'floor') === 'one_verse' ? 'one_verse' : 'full_chapter';
  const canSeal = floor === 'one_verse' ? hasStartedReading : hasReachedEnd;
  const streak = getProfile(db, 'streakVisible') === '1' && session.sealedToday ? computeStreak(db, today) : null;

  return (
    <View style={styles.container} onLayout={(e) => (layoutHeight.value = e.nativeEvent.layout.height)}>
      <ThreadRail
        scrollY={scrollY}
        contentHeight={contentHeight}
        layoutHeight={layoutHeight}
        reducedMotion={reducedMotion}
      />
      <Animated.ScrollView
        style={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        scrollEnabled={scrollEnabled}
        onContentSizeChange={(_, h) => (contentHeight.value = h)}
      >
        <ArrivalZone
          today={today}
          cue={services.cue.current()}
          book={session.book}
          chapter={session.chapter}
          sittingIndex={session.sittingIndex}
          sittingsTotal={session.sittings.length}
          daysInBook={session.daysInBook}
        />
        {pendingLapse && (
          <LapseZone
            response={pendingLapse.response}
            partnerName={partnerName}
            cue={services.cue.current()}
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
            getChapterText={getProbeChapterText}
            onGrade={handleGradeProbe}
          />
        )}
        <ScriptureZone
          ref={scriptureRef}
          verses={sittingVerses}
          attribution={session.attribution}
          onLayout={(y, height) => {
            scriptureTop.value = y;
            scriptureBottom.value = y + height;
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
          sealed={session.sealedToday}
          reducedMotion={reducedMotion}
          onSeal={handleSeal}
          onHoldCancel={handleHoldCancel}
          onScrollLock={(locked) => setScrollEnabled(!locked)}
          sealMode={sealMode}
          canSeal={canSeal}
        />
        {session.sealedToday && (
          <>
            <WeaveZone
              book={bolt.book}
              chapterCount={bundledChapterCount(bolt.book)}
              sealed={bolt.sealed}
              streak={streak}
            />
            <DismissalZone
              book={session.book}
              chapter={session.chapter}
              chapterCount={bundledChapterCount(session.book)}
              justFinishedBook={session.justFinishedBook}
              candidates={candidates}
              onPromote={handlePromote}
              needsNextBookPick={session.nextBookNeeded}
              onPickNextBook={handlePickNextBook}
              pendingReport={pendingReport}
              reportPhases={reportPhases}
              onApplyReport={handleApplyReport}
              onKeepReport={handleKeepReport}
            />
            {srbaiDue && <SrbaiZone eyeballDates={eyeballDates(db, today)} onSave={handleSaveSrbai} />}
            {yearReview && <YearReviewZone report={yearReview} onDismiss={handleDismissYearReview} />}
          </>
        )}
      </Animated.ScrollView>
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
  scroll: { flex: 1, paddingLeft: 12 },
});
