// Renders docs/og.png — the 1200x630 social card for the GitHub Pages site.
//
//   node scripts/build-og.mjs [--out docs] [--browser "C:\path\to\msedge.exe"]
//
// Same rasterisation approach as build-icons.mjs: the headless Chromium already
// on the machine, no image toolchain as a dependency. Unlike the icons this page
// sets type, so it pulls Schibsted Grotesk and Newsreader from Google Fonts the
// way docs/index.html does — this script needs network, and the budget below is
// what lets the faces land before the screenshot is taken.
//
// Nothing on this card quotes Scripture, and that is deliberate: docs/BRAND.md's
// full-passage rule means any surface explaining the blue-thread origin has to
// carry Numbers 15:37-41 in full, which a 1200x630 card cannot do. The card uses
// the name and the descriptor only.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const W = 1200, H = 630;
const PAPER = '#F4F1E9'; // tokens.color.paper
const INK = '#1A1A17';   // tokens.color.ink
const INK60 = '#5B584F';
const INK40 = '#8F8B7E';
const WARP = '#8F8779';  // tokens.color.warp
const DYE = '#2E3A8C';   // tokens.color.thread

// The right panel is the landing page's warp field: bare threads, and one blue
// one drifting through them. It is the only image on the card, so it carries the
// name literally rather than decoratively.
const FIELD_X = 792, GAP = 13, BLUE = 17;
function field() {
  let s = '';
  for (let i = 0, x = FIELD_X + 10; x < W - 6; i++, x += GAP) {
    if (i === BLUE) continue;
    s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${WARP}" stroke-width="1.25" opacity="0.42"/>`;
  }
  const b = FIELD_X + 10 + BLUE * GAP;
  return `<defs>
      <linearGradient id="fade" x1="${FIELD_X}" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#000"/><stop offset="0.45" stop-color="#fff"/>
      </linearGradient>
      <mask id="m"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>
    </defs>
    <g mask="url(#m)">${s}</g>
    <path d="M ${b} 0 C ${b - 26} 170, ${b + 30} 300, ${b - 8} 440 S ${b + 14} 560, ${b + 2} ${H}"
      fill="none" stroke="${DYE}" stroke-width="3.25" stroke-linecap="round"/>`;
}

function page() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>og</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;padding:0}
  .card{position:relative;width:${W}px;height:${H}px;background:${PAPER};overflow:hidden}
  .card svg{position:absolute;inset:0}
  .text{position:absolute;left:80px;top:112px;width:660px}
  .eyebrow{font:600 19px/1 'Schibsted Grotesk',system-ui,sans-serif;color:${INK40};letter-spacing:4.5px}
  h1{margin:52px 0 0;font:600 82px/1.16 'Schibsted Grotesk',system-ui,sans-serif;color:${INK};letter-spacing:-1.5px}
  h1 .serif{display:block;font:500 82px/1.16 'Newsreader',Georgia,serif;letter-spacing:-1.5px}
  .sub{margin:34px 0 0;font:400 27px/1.4 'Newsreader',Georgia,serif;color:${INK60}}
  .rule{width:70px;height:2px;background:${DYE};margin:44px 0 0}
  .facts{margin:22px 0 0;font:400 19px/1 'Schibsted Grotesk',system-ui,sans-serif;color:${INK40}}
</style></head><body>
<div class="card">
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${field()}</svg>
  <div class="text">
    <div class="eyebrow">ANDROID · OFFLINE · FREE</div>
    <h1>One<span class="serif">Blue Thread.</span></h1>
    <p class="sub">A quiet place to read Scripture.</p>
    <div class="rule"></div>
    <p class="facts">No account · no feed · no streaks · nothing leaves your phone</p>
  </div>
</div></body></html>`;
}

/** Reads width/height straight out of the PNG header. */
function probe(file) {
  const b = fs.readFileSync(file);
  if (b.slice(1, 4).toString() !== 'PNG') throw new Error(`${file} is not a PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function findBrowser(explicit) {
  for (const c of [explicit, ...CANDIDATES]) if (c && fs.existsSync(c)) return c;
  throw new Error(
    'No headless Chromium found. Pass --browser <path> or set CHROME_PATH.\nTried:\n  ' +
      CANDIDATES.filter(Boolean).join('\n  '),
  );
}

const args = process.argv.slice(2);
const argOf = (flag) => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
const outDir = path.resolve(root, argOf('--out') ?? 'docs');
const browser = findBrowser(argOf('--browser'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'thread-og-'));
const htmlPath = path.join(tmp, 'og-source.html');
fs.writeFileSync(htmlPath, page());
const out = path.join(outDir, 'og.png');
fs.rmSync(out, { force: true });

console.log(`browser: ${browser}\nout:     ${out}\n`);
try {
  await run(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--screenshot=${out}`, `--window-size=${W},${H}`,
    // Generous: the two webfonts must arrive before the frame is captured.
    '--virtual-time-budget=8000',
    'file:///' + htmlPath.replace(/\\/g, '/'),
  ]);
} catch { /* exit code is not meaningful here */ }
fs.rmSync(tmp, { recursive: true, force: true });

if (!fs.existsSync(out)) { console.error('✗ og.png not produced'); process.exit(1); }
const { w, h } = probe(out);
if (w !== W || h !== H) {
  console.error(`✗ og.png ${w}x${h} — expected ${W}x${H}`);
  process.exit(1);
}
console.log(`✓ og.png ${w}x${h} ${(fs.statSync(out).size / 1024).toFixed(1)} KB`);
