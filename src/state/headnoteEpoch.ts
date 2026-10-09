import { create } from 'zustand';

// docs/plans/bibleproject-book-videos — a headnote can be edited or deleted
// from the chapter viewer (in the knot) while the reading screen (Flow) shows
// today's. They are siblings with no shared parent state, so any change made
// outside Flow bumps `epoch` and Flow re-reads today's headnote.
interface HeadnoteEpochState {
  epoch: number;
  bump: () => void;
}

export const useHeadnoteEpoch = create<HeadnoteEpochState>((set) => ({
  epoch: 0,
  bump: () => set((s) => ({ epoch: s.epoch + 1 })),
}));
