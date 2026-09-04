// Renders the app icon set from scripts/lib/icon-mark.mjs.
//
//   node scripts/build-icons.mjs [--out assets] [--browser "C:\path\to\msedge.exe"]
//
// Rasterises with the headless Chromium already installed on the machine
// (Edge or Chrome). This is deliberately NOT a dependency: the project ships
// no image toolchain, ImageMagick is not present on the dev machine, and the
// only PNG library in node_modules (pngjs) is a transitive dep of
// expo-notifications that could vanish on any bump.
//
// Two rasterisation details that are easy to get wrong:
//   * --default-background-color=00000000 with --headless=new is what makes the
//     Android foreground layer genuinely transparent. Without it Chromium
//     composites onto opaque white and the layer is unusable.
//   * Windows below ~100px paint unreliably, so small sizes render at 512 CSS
//     px and are downsampled by --force-device-scale-factor. That also gives
//     far better antialiasing than rasterising into a tiny viewport.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { markSVG } from './lib/icon-mark.mjs';

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const PAPER = '#F4F1E9'; // tokens.color.paper
const WARP = '#8F8779';  // tokens.color.warp
const DYE = '#2E3A8C';   // tokens.color.thread

// Android masks an adaptive icon to roughly the middle 66%, so those layers
// are drawn smaller than the standalone icon.
const VARIANTS = {
  full:       { ground: true,  svg: markSVG({ warp: WARP, dye: DYE, scale: 0.80, id: 'f' }) },
  background: { ground: true,  svg: '' },
  foreground: { ground: false, svg: markSVG({ warp: WARP, dye: DYE, scale: 0.62, id: 'g' }) },
  monochrome: { ground: false, svg: markSVG({ warp: '#000', dye: '#000', mono: true, scale: 0.62, id: 'h' }) },
};

// name, variant, size — matches the dimensions the previous assets used.
const TARGETS = [
  ['icon.png', 'full', 1024],
  ['favicon.png', 'full', 48],
  ['android-icon-foreground.png', 'foreground', 512],
  ['android-icon-background.png', 'background', 512],
  ['android-icon-monochrome.png', 'monochrome', 432],
];

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

function page() {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>icon</title>
<style>html,body{margin:0;padding:0;background:transparent}
#s{width:100vw;height:100vw;display:grid;place-items:center}
#s.g{background:${PAPER}}svg{width:100%;height:100%;display:block}</style></head>
<body><div id="s"><svg id="m" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"></svg></div>
<script>
const V=${JSON.stringify(VARIANTS)};
const v=V[(location.hash||'#full').slice(1)]||V.full;
if(v.ground)document.getElementById('s').classList.add('g');
document.getElementById('m').innerHTML=v.svg;
<\/script></body></html>`;
}

/** Reads width/height/colour-type straight out of the PNG header. */
function probe(file) {
  const b = fs.readFileSync(file);
  if (b.slice(1, 4).toString() !== 'PNG') throw new Error(`${file} is not a PNG`);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), hasAlpha: b[25] === 6 || b[25] === 4 };
}

const args = process.argv.slice(2);
const argOf = (flag) => { const i = args.indexOf(flag); return i < 0 ? undefined : args[i + 1]; };
const outDir = path.resolve(root, argOf('--out') ?? 'assets');
const browser = findBrowser(argOf('--browser'));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'thread-icons-'));
const htmlPath = path.join(tmp, 'icon-source.html');
fs.writeFileSync(htmlPath, page());
const url = 'file:///' + htmlPath.replace(/\\/g, '/');

console.log(`browser: ${browser}\nout:     ${outDir}\n`);
let failed = 0;

for (const [name, variant, size] of TARGETS) {
  const out = path.join(outDir, name);
  fs.rmSync(out, { force: true });
  const flags = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--default-background-color=00000000',
    `--screenshot=${out}`, '--virtual-time-budget=3000',
  ];
  // Small sizes render at 512 CSS px and downsample; see the note above.
  if (size < 100) flags.push(`--force-device-scale-factor=${size / 512}`, '--window-size=512,512');
  else flags.push(`--window-size=${size},${size}`);

  try { await run(browser, [...flags, `${url}#${variant}`]); } catch { /* exit code is not meaningful here */ }

  if (!fs.existsSync(out)) { console.log(`✗ ${name.padEnd(30)} not produced`); failed++; continue; }
  const { w, h, hasAlpha } = probe(out);
  // Only the two layers Android composites need transparency; the rest carry
  // the linen ground and must stay opaque.
  const wantAlpha = variant === 'foreground' || variant === 'monochrome';
  const okSize = w === size && h === size;
  const okAlpha = hasAlpha === wantAlpha;
  if (!okSize || !okAlpha) failed++;
  console.log(
    `${okSize && okAlpha ? '✓' : '✗'} ${name.padEnd(30)} ${`${w}x${h}`.padEnd(10)}` +
      `${hasAlpha ? 'RGBA' : 'opaque'}${okSize ? '' : ` — expected ${size}`}` +
      `${okAlpha ? '' : ` — expected ${wantAlpha ? 'RGBA' : 'opaque'}`}`,
  );
}

fs.rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`\n${failed} icon(s) wrong — not usable.`); process.exit(1); }
console.log('\nAll icons rendered.');
