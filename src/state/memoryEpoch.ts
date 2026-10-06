import { create } from 'zustand';

// docs/plans/recall-settings — the memory library (in the knot) and the
// reading screen's recall zone (in Flow) are siblings with no shared parent
// state. Any library change bumps `epoch` so Flow re-reads; Flow publishes
// the passage ids it showed today so "Review now" can put the rest first.
interface MemoryEpochState {
  epoch: number;
  bump: () => void;
  shownToday: number[];
  setShownToday: (ids: number[]) => void;
}

export const useMemoryEpoch = create<MemoryEpochState>((set) => ({
  epoch: 0,
  bump: () => set((s) => ({ epoch: s.epoch + 1 })),
  shownToday: [],
  setShownToday: (ids) => set({ shownToday: ids }),
}));
