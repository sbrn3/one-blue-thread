import { CANON } from '../text/canon';
import { tokens } from './tokens';

/**
 * One natural dye per book, assigned by canonical index.
 *
 * Deterministic and stable forever — no PRNG (§13.6), and no persistence
 * needed: the same book always takes the same dye because its position in the
 * canon never changes. Adjacent books differ, so successive reading produces
 * visibly different cloth.
 */
export function dyeFor(bookId: string): string {
  const i = CANON.findIndex((b) => b.id === bookId);
  return tokens.dye[(i < 0 ? 0 : i) % tokens.dye.length];
}
