import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { headnoteReference, type ContentsRow, type Headnote } from '../headnote';
import type { PendingReport } from '../lab/analysis/report';
import type { PhaseMetric } from '../lab/analysis/reversal';
import type { Passage } from '../log/types';
import { bookName } from '../text/canon';
import { BookPicker } from '../ui/BookPicker';
import { Contents } from '../ui/Contents';
import { ActionButton } from '../ui/controls';
import { Ornament } from '../ui/Ornament';
import { OverviewLink } from '../ui/OverviewLink';
import { tokens } from '../ui/tokens';
import { ReportPrompt } from './ReportPrompt';

interface DismissalZoneProps {
  book: string;
  chapter: number;
  chapterCount: number;
  justFinishedBook: string | null;
  /** Unpromoted candidates from the just-finished book (§21) — offered once, at book end. */
  candidates: Passage[];
  onPromote: (id: number) => void;
  /** Offered marks already being learned — shown "Learning ✓" (docs/plans/recall-settings: pick none, one or several). */
  learnedIds: Set<number>;
  /** A refused "Learn this" (already learning that range, or the mark is gone). */
  promotionMessage: string | null;
  /** True once the reader tapped Done — hides the prompt. */
  promotionResolved: boolean;
  onFinishPromotion: () => void;
  /** True whenever the next-book queue is empty (§04) — persists across days until picked, not gated by justFinishedBook. */
  needsNextBookPick: boolean;
  onPickNextBook: (bookId: string) => void;
  /** §15 — a completed experiment's report, not yet responded to. */
  pendingReport: PendingReport | null;
  /** §10 W10 — the phase-by-phase chart alongside the pending report, if any. */
  reportPhases: PhaseMetric[];
  onApplyReport: (expId: string) => void;
  onKeepReport: (expId: string) => void;
  /** §04 zone 5 — see dismissalReadiness.ts. Only once true may "Now close the app" render. */
  terminalReady: boolean;
  /** Today's seal exists, so a headnote can be offered (docs/plans/bibleproject-book-videos). Optional: it never gates terminalReady. */
  canWriteHeadnote: boolean;
  /** Today's headnote, once kept. */
  headnote: Headnote | null;
  onWriteHeadnote: () => void;
  /** The just-finished reading's contents, when it has any headnotes; null shows none (no empty list, no nudge). */
  finishedContents: ContentsRow[] | null;
}

function reference(book: string, p: Passage): string {
  const range = p.verse_start === p.verse_end ? `${p.verse_start}` : `${p.verse_start}-${p.verse_end}`;
  return `${bookName(book)} ${p.chapter}:${range}`;
}

// §04 zone 5 — deliberately terminal. Engagement is not the goal;
// the reading is, and it happens off-screen. Book-end promotion
// (§21, W5): of everything marked while reading this book, choose
// exactly one to carry forward into the Leitner schedule. The
// next-book queue (§04) is refilled by the user here, never
// auto-picked — a finished book must not become a decision point,
// but it also must not become the app's decision instead of yours.
export function DismissalZone({
  book,
  chapter,
  chapterCount,
  justFinishedBook,
  candidates,
  onPromote,
  learnedIds,
  promotionMessage,
  promotionResolved,
  onFinishPromotion,
  needsNextBookPick,
  onPickNextBook,
  pendingReport,
  reportPhases,
  onApplyReport,
  onKeepReport,
  terminalReady,
  canWriteHeadnote,
  headnote,
  onWriteHeadnote,
  finishedContents,
}: DismissalZoneProps) {
  const [pending, setPending] = useState<string | null>(null);
  const pct = chapterCount > 0 ? Math.round((chapter / chapterCount) * 100) : 0;

  return (
    <View style={styles.zone}>
      {justFinishedBook ? (
        <>
          <Text style={styles.finished}>You finished {bookName(justFinishedBook)}.</Text>
          {finishedContents && (
            <View style={styles.contentsBlock}>
              <Text style={styles.bookName} accessibilityRole="header">
                {bookName(justFinishedBook)}
              </Text>
              <Text style={styles.promoteLabel}>Contents</Text>
              <Contents rows={finishedContents} />
              <View style={styles.tailpiece}>
                <Ornament kind="tail" />
              </View>
            </View>
          )}
          <OverviewLink book={justFinishedBook} lead="And now," />
        </>
      ) : (
        <Text style={styles.progress}>
          {bookName(book)} · {pct}% through
        </Text>
      )}

      {canWriteHeadnote && !headnote && (
        <View style={styles.promoteBlock}>
          <Text style={styles.promoteLabel}>A line for today?</Text>
          <ActionButton label="Write a headnote" variant="secondary" onPress={onWriteHeadnote} />
        </View>
      )}
      {canWriteHeadnote && headnote && (
        <View style={styles.headnoteBlock}>
          <Text style={styles.headnote}>{headnote.text}</Text>
          <View style={styles.headnoteMeta}>
            <Text style={styles.headnoteRef}>{headnoteReference(headnote)}</Text>
            <ActionButton label="Edit" variant="link" onPress={onWriteHeadnote} />
          </View>
        </View>
      )}

      {justFinishedBook && candidates.length > 0 && !promotionResolved && (
        <View style={styles.promoteBlock}>
          <Text style={styles.promoteLabel}>Learn any of what you marked?</Text>
          {candidates.map((p) => {
            const learning = learnedIds.has(p.id);
            const ref = reference(justFinishedBook, p);
            return (
              <Pressable
                key={p.id}
                style={[styles.candidateRow, learning && styles.candidateLearning]}
                onPress={() => onPromote(p.id)}
                disabled={learning}
                accessibilityRole="button"
                accessibilityState={{ disabled: learning }}
                accessibilityLabel={learning ? `${ref}, learning` : `Learn ${ref}`}
              >
                <Text style={styles.candidateText}>
                  {ref}
                  {learning ? '  · Learning ✓' : '  · Learn this'}
                </Text>
              </Pressable>
            );
          })}
          {promotionMessage ? <Text style={styles.promotionMessage}>{promotionMessage}</Text> : null}
          <ActionButton label="Done" variant="secondary" onPress={onFinishPromotion} />
        </View>
      )}

      {needsNextBookPick && (
        <View style={styles.queueBlock}>
          <Text style={styles.promoteLabel}>What&apos;s next, after {bookName(book)}?</Text>
          <BookPicker excludeId={book} selected={pending} onSelect={setPending} />
          {pending && (
            <ActionButton
              label={`Queue ${bookName(pending)}`}
              onPress={() => onPickNextBook(pending)}
              style={styles.queueBtn}
            />
          )}
        </View>
      )}

      {pendingReport && (
        <ReportPrompt
          recommendation={pendingReport.recommendation}
          reportText={pendingReport.reportText}
          phases={reportPhases}
          onApply={() => onApplyReport(pendingReport.expId)}
          onKeep={() => onKeepReport(pendingReport.expId)}
        />
      )}

      {terminalReady && <Text style={styles.close}>Now close the app.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  zone: {
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 16,
  },
  progress: {
    fontFamily: tokens.font.mono,
    fontSize: 13,
    color: tokens.color.ink40,
  },
  finished: {
    fontFamily: tokens.font.display,
    fontWeight: '700',
    fontSize: 18,
    color: tokens.color.thread,
    textAlign: 'center',
  },
  promoteBlock: {
    width: '100%',
    gap: 8,
    alignItems: 'center',
  },
  promoteLabel: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.ink40,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  candidateRow: {
    minHeight: 48,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.color.ink15,
  },
  candidateText: {
    fontFamily: tokens.font.display,
    fontSize: 14,
    color: tokens.color.ink,
  },
  candidateLearning: {
    backgroundColor: tokens.color.dyeSoft,
    borderColor: tokens.color.thread,
  },
  promotionMessage: {
    fontFamily: tokens.font.mono,
    fontSize: 12,
    color: tokens.color.madder,
  },
  // The finished reading's contents page — the book returned in the reader's words.
  contentsBlock: { alignSelf: 'stretch', gap: tokens.space[2] },
  bookName: {
    fontFamily: tokens.font.display,
    fontWeight: '900',
    fontSize: 34,
    lineHeight: 38,
    color: tokens.color.thread,
  },
  tailpiece: { alignItems: 'center', paddingTop: tokens.space[2] },
  // Today's headnote: the reader's words in the app's voice (never the
  // Scripture face), with a madder rule — a mark you made.
  headnoteBlock: {
    alignSelf: 'stretch',
    gap: tokens.space[1],
    borderLeftWidth: 2,
    borderLeftColor: tokens.color.madder,
    paddingLeft: tokens.space[3],
  },
  headnote: {
    fontFamily: tokens.font.display,
    fontSize: 15,
    lineHeight: 22,
    color: tokens.color.ink,
  },
  headnoteMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headnoteRef: { fontFamily: tokens.font.mono, fontSize: 12, color: tokens.color.ink40, flexShrink: 1 },
  queueBlock: {
    width: '100%',
    gap: 8,
  },
  queueBtn: {
    marginTop: 8,
    alignSelf: 'center',
  },
  close: {
    fontFamily: tokens.font.scripture,
    fontStyle: 'italic',
    fontSize: 20,
    color: tokens.color.ink60,
  },
});
