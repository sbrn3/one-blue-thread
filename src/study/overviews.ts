// BibleProject's book overview videos (docs/plans/bibleproject-book-videos).
// Linked, never embedded or fetched: the app opens bibleproject.com in the
// browser and nothing else. Attributed human commentary, not the app's voice.
//
// Slugs are the site's own navigation hrefs (/videos/<slug>/), each verified
// 2026-10-08 by page title. The site answers 202 to any path, so a status
// check proves nothing; scripts/check-overviews.mjs re-verifies by title.

export interface Overview {
  url: string;
  /** 1 or 2 for books the overview covers in two parts; null otherwise. */
  part: 1 | 2 | null;
  /** The joint title when one video covers several books (e.g. "1 & 2 Kings"); null otherwise. */
  covers: string | null;
}

const BASE = 'https://bibleproject.com/videos/';

const one = (slug: string, covers: string | null = null): Overview[] => [{ url: `${BASE}${slug}/`, part: null, covers }];
const two = (first: string, second: string): Overview[] => [
  { url: `${BASE}${first}/`, part: 1, covers: null },
  { url: `${BASE}${second}/`, part: 2, covers: null },
];

const OVERVIEWS: Record<string, Overview[]> = {
  genesis: two('genesis-1-11', 'genesis-12-50'),
  exodus: two('exodus-1-18', 'exodus-19-40'),
  leviticus: one('leviticus'),
  numbers: one('numbers'),
  deuteronomy: one('deuteronomy'),
  joshua: one('joshua'),
  judges: one('judges'),
  ruth: one('ruth'),
  '1samuel': one('1-samuel'),
  '2samuel': one('2-samuel'),
  '1kings': one('kings', '1 & 2 Kings'),
  '2kings': one('kings', '1 & 2 Kings'),
  '1chronicles': one('chronicles', '1 & 2 Chronicles'),
  '2chronicles': one('chronicles', '1 & 2 Chronicles'),
  ezra: one('ezra-nehemiah', 'Ezra–Nehemiah'),
  nehemiah: one('ezra-nehemiah', 'Ezra–Nehemiah'),
  esther: one('esther'),
  job: one('job'),
  psalms: one('psalms'),
  proverbs: one('proverbs'),
  ecclesiastes: one('ecclesiastes'),
  songofsolomon: one('song-songs'),
  isaiah: two('isaiah-1-39', 'isaiah-40-66'),
  jeremiah: one('jeremiah'),
  lamentations: one('lamentations'),
  ezekiel: two('ezekiel-1-33', 'ezekiel-34-48'),
  daniel: one('daniel'),
  hosea: one('hosea'),
  joel: one('joel'),
  amos: one('amos'),
  obadiah: one('obadiah'),
  jonah: one('jonah'),
  micah: one('micah'),
  nahum: one('nahum'),
  habakkuk: one('habakkuk'),
  zephaniah: one('zephaniah'),
  haggai: one('haggai'),
  zechariah: one('zechariah'),
  malachi: one('malachi'),
  matthew: two('matthew-1-13', 'matthew-14-28'),
  mark: one('mark'),
  luke: two('luke-1-9', 'luke-10-24'),
  john: two('john-1-12', 'john-13-21'),
  acts: two('acts-1-12', 'acts-13-28'),
  romans: two('romans-1-4', 'romans-5-16'),
  '1corinthians': one('1-corinthians'),
  '2corinthians': one('2-corinthians'),
  galatians: one('galatians'),
  ephesians: one('ephesians'),
  philippians: one('philippians'),
  colossians: one('colossians'),
  '1thessalonians': one('1-thessalonians'),
  '2thessalonians': one('2-thessalonians'),
  '1timothy': one('1-timothy'),
  '2timothy': one('2-timothy'),
  titus: one('titus'),
  philemon: one('philemon'),
  hebrews: one('hebrews'),
  james: one('james'),
  '1peter': one('1-peter'),
  '2peter': one('2-peter'),
  '1john': one('1-3-john', '1–3 John'),
  '2john': one('1-3-john', '1–3 John'),
  '3john': one('1-3-john', '1–3 John'),
  jude: one('jude'),
  revelation: two('revelation-1-11', 'revelation-12-22'),
};

/** The book's overview video(s), in order; [] for an unknown book. */
export function overviewsFor(bookId: string): Overview[] {
  return OVERVIEWS[bookId] ?? [];
}

/** Every distinct overview URL — for the verification script. */
export function allOverviewUrls(): string[] {
  return [...new Set(Object.values(OVERVIEWS).flat().map((o) => o.url))];
}
