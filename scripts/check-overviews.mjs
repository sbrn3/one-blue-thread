#!/usr/bin/env node
// Re-verifies every BibleProject overview URL in src/study/overviews.ts by
// page title. bibleproject.com answers 202 to any path (even a made-up one),
// so a status code proves nothing: a real page has a <title> naming the book,
// a missing one has no title at all. Needs the network; not part of `npm test`.
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/study/overviews.ts', import.meta.url), 'utf8');
const base = source.match(/const BASE = '([^']+)'/)[1];
const slugs = [...new Set([...source.matchAll(/(?:one|two)\(([^)]*)\)/g)]
  .flatMap((m) => [...m[1].matchAll(/'([a-z0-9-]+)'/g)].map((s) => s[1])))];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
// The book word the title must contain: the first alphabetic part of the slug.
const expected = (slug) => slug.split('-').find((p) => /[a-z]/.test(p));

let failed = 0;
for (const slug of slugs) {
  const url = `${base}${slug}/`;
  let title = '';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow' });
    title = ((await res.text()).match(/<title>([^<]*)/) ?? [])[1] ?? '';
  } catch (e) {
    title = `ERROR ${e.message}`;
  }
  const ok = title.toLowerCase().includes(expected(slug));
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${slug.padEnd(18)} ${title.trim()}`);
}
console.log(`\n${slugs.length - failed}/${slugs.length} verified`);
process.exit(failed ? 1 : 0);
