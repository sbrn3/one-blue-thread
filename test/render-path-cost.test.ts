import { describe, expect, it } from 'vitest';
import { cueTerms } from '../src/study/provider';
import { computeStreak } from '../src/log/log';
import { getProfile, setProfile } from '../src/lab/profile';
import { migrate } from '../src/log/schema';
import { openTestDb } from './util/testDb';
import type { Verse } from '../src/text/provider';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const WEB = require('../assets/bible/web.json') as {
  books: Record<string, Array<Array<{ v: number; t: string }>>>;
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const index = require('../assets/tyndale/dictionary-index.json') as unknown;

const dictionary = (Array.isArray(index) ? index : (index as { entries: unknown[] }).entries) as Parameters<
  typeof cueTerms
>[1];

/** Psalm 119, 176 verses — the longest chapter in the canon, so the worst case. */
const psalm119: Verse[] = WEB.books.psalms[118].map(({ v, t }) => ({
  book: 'psalms',
  chapter: 119,
  verse: v,
  text: t,
}));

function seededDb() {
  const db = openTestDb();
  migrate(db);
  setProfile(db, 'seal', 'hold');
  setProfile(db, 'floor', 'full_chapter');
  setProfile(db, 'streakVisible', '1');
  // A year of sealed days, so the streak walk has real work to do.
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000).toISOString().slice(0, 10);
    db.run('INSERT INTO days (local_date, sealed, dose) VALUES (?, 1, ?)', [d, 'full_chapter']);
  }
  return db;
}

/**
 * Flow's render body runs synchronously on the JS thread. Anything expensive in
 * it blocks everything — including the setTimeout that powers LaunchWeave's own
 * stall/Retry escape, which is why the v0.4.0–v0.5.1 hang presented as a frozen
 * launch screen with no way out and no error.
 *
 * The logic-only suite never renders Flow, so this stands in for that: call what
 * a render calls, on the worst input the canon offers, under a budget. The bound
 * is loose on purpose — it guards the shape of the work, not a machine's speed.
 * The regression this exists for was ~180x over, not 2x.
 */
describe('one Flow render stays cheap on the worst chapter in the canon', () => {
  it('has a 176-verse sitting to work with', () => {
    expect(psalm119).toHaveLength(176);
    expect(psalm119[0].text.length).toBeGreaterThan(20);
  });

  it('completes the render-path work well inside a frame budget', () => {
    const db = seededDb();
    const today = '2026-12-31';

    const started = Date.now();
    // Everything Flow evaluates during a single render, in render order.
    const cues = cueTerms(psalm119, dictionary, 4);
    getProfile(db, 'seal');
    getProfile(db, 'floor');
    const streak = getProfile(db, 'streakVisible') === '1' ? computeStreak(db, today) : null;
    const elapsed = Date.now() - started;

    expect(cues.length).toBeGreaterThan(0);
    expect(streak).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(1000);
  });

  it('scales with verse count instead of exploding on it', () => {
    // The old defect re-normalised the verse text once per dictionary
    // candidate, so cost grew with verses x candidates. A sitting 8x longer
    // must not cost anything like 8x a full scan.
    const short = psalm119.slice(0, 22);

    const t1 = Date.now();
    cueTerms(short, dictionary, 9999);
    const shortMs = Date.now() - t1;

    const t2 = Date.now();
    cueTerms(psalm119, dictionary, 9999);
    const longMs = Date.now() - t2;

    expect(longMs).toBeLessThan(Math.max(shortMs * 40, 2000));
  });
});
