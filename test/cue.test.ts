import { describe, expect, it, vi } from 'vitest';
import { CueService, type Cue } from '../src/cue';
import { Log } from '../src/log/log';
import { migrate } from '../src/log/schema';
import { openTestDb } from './util/testDb';

function setup() {
  const db = openTestDb();
  migrate(db);
  const log = new Log({ db, buildSha: 'test', now: () => 1_700_000_000_000 });
  return { db, cue: new CueService(db, log) };
}

const coffee: Cue = { anchor: 'coffee', place: 'the kitchen', nudgeHour: 7, validated: true };
const tea: Cue = { anchor: 'tea', place: 'the armchair', nudgeHour: 21, validated: false };

describe('CueService (docs/plans/knot-opener-icon, S06 — one source of truth for the cue)', () => {
  it('current() returns the cue just set', () => {
    const { cue } = setup();
    cue.set(coffee, { firstSet: true });
    cue.set(tea);
    expect(cue.current()).toEqual(tea);
  });

  it('notifies a subscriber once per set, with the new cue — including the first set', () => {
    const { cue } = setup();
    const seen: Cue[] = [];
    cue.subscribe((c) => c && seen.push(c));
    cue.set(coffee, { firstSet: true });
    cue.set(tea);
    expect(seen).toEqual([coffee, tea]);
  });

  it('every subscriber sees a save made through any one of them (knot and arrival screen stay in step)', () => {
    const { cue } = setup();
    const knot = vi.fn();
    const arrival = vi.fn();
    cue.subscribe(knot);
    cue.subscribe(arrival);
    cue.set(tea);
    expect(knot).toHaveBeenCalledWith(tea);
    expect(arrival).toHaveBeenCalledWith(tea);
  });

  it('stops notifying after unsubscribe', () => {
    const { cue } = setup();
    const listener = vi.fn();
    const off = cue.subscribe(listener);
    off();
    cue.set(tea);
    expect(listener).not.toHaveBeenCalled();
  });

  it('a throwing subscriber does not stop the save or the other subscribers', () => {
    const { cue } = setup();
    const ok = vi.fn();
    cue.subscribe(() => {
      throw new Error('boom');
    });
    cue.subscribe(ok);
    expect(() => cue.set(tea)).not.toThrow();
    expect(cue.current()).toEqual(tea);
    expect(ok).toHaveBeenCalledWith(tea);
  });
});
