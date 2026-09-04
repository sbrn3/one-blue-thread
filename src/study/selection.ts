import type { TermCue } from './types';

export function visibleTermCues(terms: TermCue[], selectionAnchor: number | null): TermCue[] {
  return selectionAnchor === null ? terms : [];
}
