import { beforeEach, describe, expect, it } from 'vitest';
import { mark, resetMarks, summary } from '../src/startup/timing';

describe('startup timing marks', () => {
  beforeEach(() => resetMarks());

  it('keeps marks in the order they happened, from 0', () => {
    mark('a');
    mark('b');
    mark('c');
    const s = summary();
    expect(s.map((m) => m.name)).toEqual(['a', 'b', 'c']);
    expect(s[0].ms).toBe(0);
    for (let i = 1; i < s.length; i++) expect(s[i].ms).toBeGreaterThanOrEqual(s[i - 1].ms);
  });

  it('records a name only the first time', () => {
    mark('render');
    mark('other');
    mark('render');
    expect(summary().map((m) => m.name)).toEqual(['render', 'other']);
  });

  it('is empty before any mark, and reading it changes nothing', () => {
    expect(summary()).toEqual([]);
    mark('x');
    expect(summary()).toEqual(summary());
  });
});
