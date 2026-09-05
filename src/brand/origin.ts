import { bundledPassage } from '../text';

export const ORIGIN_PASSAGE = {
  reference: 'Numbers 15:37–41',
  translation: 'World English Bible (WEB)',
  provenance: 'bundled',
  attribution: 'World English Bible (WEB) · Public Domain',
  verses: bundledPassage('numbers', 15, 37, 41),
} as const;
