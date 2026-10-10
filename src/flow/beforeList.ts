// "Before you read": everything due before the reading, folded into one list
// between the arrival header and Scripture (docs/plans/reading-screen-and-motion,
// S06, Direction A). Pure, so the order and the open/closed defaults are tested.
//
// The lapse and yesterday's probe start open (owner, 2026-10-08), so the lab's
// E9 measurement sees the same probe the old screen showed. Memory and what's
// new start folded.
import { bookName } from '../text/canon';

export type BeforeKind = 'lapse' | 'probe' | 'memory' | 'whatsNew';

export const BEFORE_ORDER: readonly BeforeKind[] = ['lapse', 'probe', 'memory', 'whatsNew'];

export interface BeforeItem {
  kind: BeforeKind;
  title: string;
  detail: string;
  /** The row's right-hand label while folded. */
  action: string;
  startsOpen: boolean;
  /** Finished today (graded, skipped, answered, dismissed): a quiet row with no body. */
  done: boolean;
}

export interface BeforeInput {
  lapse: 'one_question' | 'offramp' | 'dormant' | null;
  probe: { book: string; chapter: number; verseStart: number; verseEnd: number } | null;
  due: { book: string; chapter: number; verse_start: number; verse_end: number }[];
  /** Lines of what's new still to read; 0 once dismissed. */
  whatsNewLines: number;
}

function ref(book: string, chapter: number, start: number, end: number): string {
  return `${bookName(book)} ${chapter}:${start === end ? start : `${start}–${end}`}`;
}

const LAPSE_DETAIL: Record<NonNullable<BeforeInput['lapse']>, string> = {
  one_question: 'One question, asked once',
  offramp: "It's been a couple of weeks",
  dormant: "I'll be here",
};

const DONE_DETAIL: Record<BeforeKind, string> = {
  lapse: 'Answered',
  probe: 'Done for today',
  memory: 'Done for today',
  whatsNew: 'Read',
};

export function buildBeforeYouRead({ lapse, probe, due, whatsNewLines }: BeforeInput): BeforeItem[] {
  const items: BeforeItem[] = [];
  if (lapse) {
    items.push({ kind: 'lapse', title: 'A check-in', detail: LAPSE_DETAIL[lapse], action: 'Open', startsOpen: true, done: false });
  }
  if (probe) {
    items.push({
      kind: 'probe',
      // Not "Recall": that word belongs to the memory passages.
      title: "Yesterday's reading",
      detail: ref(probe.book, probe.chapter, probe.verseStart, probe.verseEnd),
      action: 'Open',
      startsOpen: true,
      done: false,
    });
  }
  if (due.length > 0) {
    const refs = due.map((p) => ref(p.book, p.chapter, p.verse_start, p.verse_end));
    items.push({
      kind: 'memory',
      title: `${due.length} ${due.length === 1 ? 'passage' : 'passages'} to keep`,
      detail: refs.length > 2 ? `${refs.slice(0, 2).join(' · ')} · +${refs.length - 2}` : refs.join(' · '),
      action: 'Review',
      startsOpen: false,
      done: false,
    });
  }
  if (whatsNewLines > 0) {
    items.push({
      kind: 'whatsNew',
      title: 'New in this update',
      detail: `${whatsNewLines} ${whatsNewLines === 1 ? 'note' : 'notes'} · until you dismiss them`,
      action: 'Read',
      startsOpen: false,
      done: false,
    });
  }
  return items;
}

/**
 * Today's list with finished items kept in place as done rows. A dismissed
 * lapse or what's new leaves the input, but its row stays (done) for the rest
 * of the day, so nothing below it jumps up.
 */
export function withFinished(current: BeforeItem[], finished: Partial<Record<BeforeKind, BeforeItem>>): BeforeItem[] {
  return BEFORE_ORDER.flatMap((kind) => {
    const done = finished[kind];
    if (done) return [{ ...done, detail: DONE_DETAIL[kind], startsOpen: false, done: true }];
    const item = current.find((i) => i.kind === kind);
    return item ? [item] : [];
  });
}
