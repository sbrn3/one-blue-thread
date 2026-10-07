import { create } from 'zustand';

// Dev builds only. "Replay the seal" in the knot puts the reading screen's
// seal and rail back into their unsealed look so the hold, its animation and
// the fell sweep can be watched again. Nothing is logged or saved: Flow routes
// the hold to finish() here instead of session.seal(), so the event log,
// streak, weave and dose never see a rehearsal.
export type RehearsalPhase = 'off' | 'ready' | 'sealed';

interface SealRehearsalState {
  phase: RehearsalPhase;
  start: () => void;
  finish: () => void;
  stop: () => void;
}

export const useSealRehearsal = create<SealRehearsalState>((set) => ({
  phase: 'off',
  start: () => set({ phase: 'ready' }),
  finish: () => set({ phase: 'sealed' }),
  stop: () => set({ phase: 'off' }),
}));
