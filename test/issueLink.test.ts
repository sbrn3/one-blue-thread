import { describe, expect, it } from 'vitest';
import { ISSUES_URL, issueUrl } from '../src/knot/issueLink';

describe('issueUrl', () => {
  it('points at the new-issue page of the project repo', () => {
    expect(ISSUES_URL).toBe('https://github.com/sbrn3/one-blue-thread/issues/new');
    expect(issueUrl()).toBe(ISSUES_URL);
  });

  it('carries only the app version when given one', () => {
    const url = new URL(issueUrl('1.0.0'));
    expect(url.origin + url.pathname).toBe(ISSUES_URL);
    expect([...url.searchParams.keys()]).toEqual(['body']);
    expect(url.searchParams.get('body')).toContain('1.0.0');
  });

  it('encodes awkward versions rather than breaking the URL', () => {
    const url = new URL(issueUrl('1.0 &x=y'));
    expect([...url.searchParams.keys()]).toEqual(['body']);
    expect(url.searchParams.get('body')).toContain('1.0 &x=y');
  });
});
