import { describe, expect, it } from 'vitest';
import { RELEASES, latestReleaseId, unseenReleases, type Release } from '../src/whatsNew';

const three: Release[] = [
  { id: 'v0.12.0', lines: ['c'] },
  { id: 'v0.11.0', lines: ['b'] },
  { id: 'v0.10.0', lines: ['a'] },
];

describe('unseenReleases', () => {
  it('shows only the newest note to a reader with no marker (upgraded from before the feature)', () => {
    expect(unseenReleases(three, null)).toEqual([three[0]]);
  });

  it('shows nothing once the newest note is seen', () => {
    expect(unseenReleases(three, 'v0.12.0')).toEqual([]);
  });

  it('shows every newer note, newest first, to a reader who skipped updates', () => {
    expect(unseenReleases(three, 'v0.10.0')).toEqual([three[0], three[1]]);
  });

  it('falls back to the newest note for an unknown marker', () => {
    expect(unseenReleases(three, 'v9.9.9')).toEqual([three[0]]);
  });

  it('shows nothing when there are no notes', () => {
    expect(unseenReleases([], null)).toEqual([]);
    expect(latestReleaseId([])).toBeNull();
  });

  it('names the newest release as the latest', () => {
    expect(latestReleaseId(three)).toBe('v0.12.0');
  });
});

describe('RELEASES (bundled notes)', () => {
  const semver = (id: string) => id.slice(1).split('.').map(Number);
  const newer = (a: string, b: string) => {
    const [x, y] = [semver(a), semver(b)];
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  };

  it('has well-formed, unique release tags', () => {
    const ids = RELEASES.map((r) => r.id);
    for (const id of ids) expect(id).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is ordered strictly newest first', () => {
    for (let i = 1; i < RELEASES.length; i++) {
      expect(newer(RELEASES[i - 1].id, RELEASES[i].id), `${RELEASES[i - 1].id} before ${RELEASES[i].id}`).toBe(true);
    }
  });

  it('keeps each note to 1–3 short, trimmed lines', () => {
    for (const r of RELEASES) {
      expect(r.lines.length, r.id).toBeGreaterThanOrEqual(1);
      expect(r.lines.length, r.id).toBeLessThanOrEqual(3);
      for (const line of r.lines) {
        expect(line, r.id).toBe(line.trim());
        expect(line.length, r.id).toBeGreaterThan(0);
        expect(line.length, `${r.id}: ${line}`).toBeLessThanOrEqual(120);
      }
    }
  });
});
