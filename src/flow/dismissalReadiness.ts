export interface DismissalReadinessInput {
  /** §09/§19 — the monthly eyeball, due after a seal, not yet saved. */
  srbaiDue: boolean;
  /** §12 R6 — day 365+, due once, not yet dismissed. */
  yearReviewDue: boolean;
  /** §15 — a completed experiment's report, not yet applied or kept. */
  hasPendingReport: boolean;
  /** §04 — the next-book queue is empty. */
  needsNextBookPick: boolean;
  /** §21, W5 — unpromoted candidates exist from the book just finished. */
  hasPromotionChoice: boolean;
  /** True once the reader promoted one candidate, or explicitly chose "Not this time". */
  promotionResolved: boolean;
}

/**
 * §04 zone 5 — every due state opened by a seal (SRBAI, year review, report,
 * next-book pick, book-end promotion) must resolve before the terminal "Now
 * close the app" instruction can render, so it can never hide unfinished
 * work below it. Pure so every due-state permutation is directly testable
 * (test/dismissalReadiness.test.ts) without mounting Flow/DismissalZone.
 */
export function isDismissalReady(input: DismissalReadinessInput): boolean {
  if (input.srbaiDue) return false;
  if (input.yearReviewDue) return false;
  if (input.hasPendingReport) return false;
  if (input.needsNextBookPick) return false;
  if (input.hasPromotionChoice && !input.promotionResolved) return false;
  return true;
}
