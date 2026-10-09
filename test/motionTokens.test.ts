import { describe, expect, it } from 'vitest';
import { MOTION_KEYS, motionMs } from '../src/ui/motionTiming';
import { tokens } from '../src/ui/tokens';

describe('motion tokens', () => {
  it('every duration is a positive whole number of ms', () => {
    expect(MOTION_KEYS.length).toBeGreaterThan(0);
    for (const key of MOTION_KEYS) {
      const ms = tokens.motion[key];
      expect(Number.isInteger(ms), key).toBe(true);
      expect(ms, key).toBeGreaterThan(0);
    }
  });

  it('reduce motion makes every duration 0', () => {
    for (const key of MOTION_KEYS) expect(motionMs(key, true), key).toBe(0);
  });

  it('otherwise returns the token unchanged', () => {
    for (const key of MOTION_KEYS) expect(motionMs(key, false)).toBe(tokens.motion[key]);
  });

  it('keeps the sheet transition', () => {
    expect(tokens.motion.sheet).toBe('slide');
  });
});
