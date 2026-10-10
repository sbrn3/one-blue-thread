#!/usr/bin/env node
// Record the phone while an action runs, then tile the frames into one image
// you can read at a glance — how sub-second motion gets reviewed.
//
//   node scripts/device/rec.mjs <name> <secs> [--fps 8] [--cols 8] [--crop w:h:x:y] [--tap <regex> | --hold <regex> <ms>] [-- <cmd> [args…]]
//
// --tap/--hold find the element BEFORE recording starts (a uiautomator lookup
// takes 1–2 s), then touch it ~600 ms into the recording. Prefer them over
// `-- node scripts/device/ui.mjs tap …`, which looks up mid-recording.
//
// Writes .device/<name>.mp4 and .device/<name>.png (frame numbers in magenta).
// --crop is in recording pixels (600×1334). Without ffmpeg it falls back to
// on-device screencap bursts (~2 fps): fine for layout, too slow for motion.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { adb, adbSpawn, ffmpeg, ffmpegPath, find, outDir, requireUnlockedPhone, sleep } from './adb.mjs';

const argv = process.argv.slice(2);
const split = argv.indexOf('--');
const own = split === -1 ? argv : argv.slice(0, split);
const action = split === -1 ? [] : argv.slice(split + 1);
const [name, secsArg] = own;
const flag = (key, fallback) => {
  const i = own.indexOf(key);
  return i === -1 ? fallback : own[i + 1];
};
if (!name || !secsArg) {
  console.error('usage: rec.mjs <name> <secs> [--fps 8] [--cols 8] [--crop w:h:x:y] [--tap <regex> | --hold <regex> <ms>] [-- <cmd> [args…]]');
  process.exit(2);
}
const secs = Math.max(1, Math.min(180, Number(secsArg)));
const fps = Number(flag('--fps', 8));
const cols = Number(flag('--cols', 8));
const crop = flag('--crop', null);
const tapPattern = flag('--tap', null);
const holdPattern = flag('--hold', null);
const holdMs = holdPattern ? Number(own[own.indexOf('--hold') + 2] ?? 1500) : 0;

let target = null;

async function runAction() {
  if (target) {
    const [x, y] = [String(target.x), String(target.y)];
    if (tapPattern) adb(['shell', 'input', 'tap', x, y]);
    else {
      adb(['shell', 'input', 'motionevent', 'DOWN', x, y]);
      await sleep(holdMs);
      adb(['shell', 'input', 'motionevent', 'UP', x, y]);
    }
    console.log(`${tapPattern ? 'tap' : `hold ${holdMs}ms`} ${x} ${y} ${target.label.slice(0, 60)}`);
  }
  if (action.length === 0) return;
  // `node …` runs directly so its arguments survive intact; anything else
  // (npx, adb) needs a shell on Windows to resolve .cmd shims.
  const isNode = action[0] === 'node';
  const result = spawnSync(isNode ? process.execPath : action[0], action.slice(1), {
    stdio: 'inherit',
    shell: !isNode && process.platform === 'win32',
  });
  if (result.status !== 0) console.warn(`action exited with ${result.status}`);
}

requireUnlockedPhone();
const dir = outDir();
if (tapPattern || holdPattern) {
  target = (await find(tapPattern ?? holdPattern))[0] ?? null;
  if (!target) {
    console.error(`no match for /${tapPattern ?? holdPattern}/`);
    process.exit(1);
  }
}

if (ffmpegPath()) {
  adb(['shell', 'rm', '-f', '/sdcard/rec.mp4']);
  const recorder = adbSpawn(['shell', 'screenrecord', '--size', '600x1334', '--time-limit', String(secs), '/sdcard/rec.mp4']);
  const done = new Promise((resolve) => recorder.on('exit', resolve));
  await sleep(600); // screenrecord needs a moment before it captures
  await runAction();
  await done;
  await sleep(300);
  const mp4 = join(dir, `${name}.mp4`);
  adb(['pull', '/sdcard/rec.mp4', mp4]);
  const frames = secs * fps;
  const rows = Math.ceil(frames / cols);
  const font = process.platform === 'win32' ? ":fontfile='C\\:/Windows/Fonts/arialbd.ttf'" : '';
  const filters = [
    `fps=${fps}`,
    ...(crop ? [`crop=${crop}`] : []),
    'scale=200:-1',
    `drawtext=text='%{n}':x=4:y=4:fontsize=18:fontcolor=magenta${font}`,
    `tile=${cols}x${rows}:padding=3:color=0x222222`,
  ];
  const png = join(dir, `${name}.png`);
  ffmpeg(['-i', mp4, '-vf', filters.join(','), '-frames:v', '1', png]);
  console.log(png);
  console.log(`frame n ≈ ${(1000 / fps).toFixed(0)}·n ms after recording start (the action starts ~600 ms in). Recording stops early when the screen stops changing.`);
} else {
  console.warn('ffmpeg not found: falling back to screencap bursts (~2 fps).');
  const count = secs * 2;
  adb(['shell', 'rm -rf /sdcard/burst; mkdir -p /sdcard/burst']);
  const burst = adbSpawn(['shell', `i=0; while [ $i -lt ${count} ]; do screencap /sdcard/burst/$i.png; i=$((i+1)); done`]);
  const done = new Promise((resolve) => burst.on('exit', resolve));
  await sleep(200);
  await runAction();
  await done;
  const burstDir = join(dir, name);
  adb(['pull', '/sdcard/burst/.', burstDir]);
  console.log(burstDir);
}
