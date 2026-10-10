import { describe, expect, it } from 'vitest';
import { buildBeforeYouRead, withFinished, type BeforeInput } from '../src/flow/beforeList';

const NONE: BeforeInput = { lapse: null, probe: null, due: [], whatsNewLines: 0 };
const PROBE = { book: 'romans', chapter: 7, verseStart: 24, verseEnd: 25 };
const DUE = [
  { book: 'psalms', chapter: 119, verse_start: 105, verse_end: 105 },
  { book: 'philippians', chapter: 2, verse_start: 5, verse_end: 8 },
];
const ALL: BeforeInput = { lapse: 'one_question', probe: PROBE, due: DUE, whatsNewLines: 2 };

describe('Before you read (S06)', () => {
  it('renders nothing on a quiet day', () => {
    expect(buildBeforeYouRead(NONE)).toEqual([]);
  });

  it('orders lapse, probe, memory, then what is new', () => {
    expect(buildBeforeYouRead(ALL).map((i) => i.kind)).toEqual(['lapse', 'probe', 'memory', 'whatsNew']);
  });

  it('opens the lapse and the probe, and folds memory and what is new', () => {
    const open = Object.fromEntries(buildBeforeYouRead(ALL).map((i) => [i.kind, i.startsOpen]));
    expect(open).toEqual({ lapse: true, probe: true, memory: false, whatsNew: false });
  });

  it('titles the probe "Yesterday\'s reading" with its span, never "Recall"', () => {
    const [probe] = buildBeforeYouRead({ ...NONE, probe: PROBE });
    expect(probe.title).toBe("Yesterday's reading");
    expect(probe.detail).toBe('Romans 7:24–25');
    expect(buildBeforeYouRead(ALL).some((i) => /recall/i.test(i.title))).toBe(false);
  });

  it('has no probe on day 1', () => {
    expect(buildBeforeYouRead({ ...ALL, probe: null }).map((i) => i.kind)).toEqual(['lapse', 'memory', 'whatsNew']);
  });

  it('names the due passages, and counts any past two', () => {
    const [memory] = buildBeforeYouRead({ ...NONE, due: DUE });
    expect(memory.title).toBe('2 passages to keep');
    expect(memory.detail).toBe('Psalms 119:105 · Philippians 2:5–8');
    const [three] = buildBeforeYouRead({ ...NONE, due: [...DUE, DUE[0]] });
    expect(three.detail).toMatch(/· \+1$/);
  });

  it('keeps what is new until it is dismissed, not for one day', () => {
    expect(buildBeforeYouRead({ ...NONE, whatsNewLines: 3 })[0].detail).toBe('3 notes · until you dismiss them');
    expect(buildBeforeYouRead({ ...NONE, whatsNewLines: 0 })).toEqual([]);
  });

  it('keeps finished items in place as done rows, even once they leave the input', () => {
    const items = buildBeforeYouRead(ALL);
    const lapse = items[0];
    const afterDismiss = buildBeforeYouRead({ ...ALL, lapse: null });
    const merged = withFinished(afterDismiss, { lapse });
    expect(merged.map((i) => i.kind)).toEqual(['lapse', 'probe', 'memory', 'whatsNew']);
    expect(merged[0]).toMatchObject({ done: true, startsOpen: false, detail: 'Answered' });
    expect(merged.slice(1).every((i) => !i.done)).toBe(true);
  });
});
