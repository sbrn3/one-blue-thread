// Startup timing marks: where a cold start spends its time before the
// reading is on screen (docs/plans/reading-screen-and-motion, S01). Pure: no
// IO, nothing logged, nothing written to the event log.
//
// A mark records only the first time its name is seen, so a component that
// renders twice doesn't move its own mark.
const now = (): number => globalThis.performance?.now?.() ?? Date.now();

const marks: { name: string; at: number }[] = [];

export function mark(name: string): void {
  if (!marks.some((m) => m.name === name)) marks.push({ name, at: now() });
}

/** Each mark as ms since the first one, in the order they happened. */
export function summary(): { name: string; ms: number }[] {
  const t0 = marks[0]?.at ?? 0;
  return marks.map((m) => ({ name: m.name, ms: Math.round(m.at - t0) }));
}

/** Tests only. */
export function resetMarks(): void {
  marks.length = 0;
}
