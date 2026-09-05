import { describe, expect, it } from 'vitest';
import { isDismissalReady, type DismissalReadinessInput } from '../src/flow/dismissalReadiness';

const allClear: DismissalReadinessInput = {
  srbaiDue: false,
  yearReviewDue: false,
  hasPendingReport: false,
  needsNextBookPick: false,
  hasPromotionChoice: false,
  promotionResolved: false,
};

describe('isDismissalReady (§04 zone 5 — the terminal gate)', () => {
  it('is ready when nothing is due', () => {
    expect(isDismissalReady(allClear)).toBe(true);
  });

  it('blocks on a due SRBAI', () => {
    expect(isDismissalReady({ ...allClear, srbaiDue: true })).toBe(false);
  });

  it('blocks on a due year review', () => {
    expect(isDismissalReady({ ...allClear, yearReviewDue: true })).toBe(false);
  });

  it('blocks on a pending experiment report', () => {
    expect(isDismissalReady({ ...allClear, hasPendingReport: true })).toBe(false);
  });

  it('blocks when the next-book queue is empty', () => {
    expect(isDismissalReady({ ...allClear, needsNextBookPick: true })).toBe(false);
  });

  it('blocks on an unresolved promotion choice', () => {
    expect(isDismissalReady({ ...allClear, hasPromotionChoice: true, promotionResolved: false })).toBe(false);
  });

  it('is ready once the promotion choice resolves — promote or "Not this time" both count', () => {
    expect(isDismissalReady({ ...allClear, hasPromotionChoice: true, promotionResolved: true })).toBe(true);
  });

  it('promotionResolved is irrelevant when there was never a promotion choice to make', () => {
    expect(isDismissalReady({ ...allClear, hasPromotionChoice: false, promotionResolved: false })).toBe(true);
  });

  it('blocks when every due state overlaps, and only clears once all resolve', () => {
    const everything: DismissalReadinessInput = {
      srbaiDue: true,
      yearReviewDue: true,
      hasPendingReport: true,
      needsNextBookPick: true,
      hasPromotionChoice: true,
      promotionResolved: false,
    };
    expect(isDismissalReady(everything)).toBe(false);
    expect(isDismissalReady({ ...everything, srbaiDue: false })).toBe(false);
    expect(
      isDismissalReady({
        srbaiDue: false,
        yearReviewDue: false,
        hasPendingReport: false,
        needsNextBookPick: false,
        hasPromotionChoice: true,
        promotionResolved: true,
      }),
    ).toBe(true);
  });
});
