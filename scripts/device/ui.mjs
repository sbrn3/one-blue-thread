#!/usr/bin/env node
// Drive and inspect the dev app by what's on screen, not by guessed coordinates.
//
//   node scripts/device/ui.mjs find <regex>          # "x y label" for each match (text or accessibility label)
//   node scripts/device/ui.mjs tap <regex> [--nth N] # tap the Nth match (default 0)
//   node scripts/device/ui.mjs hold <regex> <ms>     # press and hold (raw touch down/up)
//   node scripts/device/ui.mjs shot <name>           # full-size screenshot → .device/<name>.png
//   node scripts/device/ui.mjs open [--port 8081]    # adb reverse + open the dev app on that Metro
//
// Refuses to run on a locked phone (ask the owner to unlock it). The release
// app is never opened; see adb.mjs.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { adb, DEV_PACKAGE, find, outDir, requireUnlockedPhone, sleep } from './adb.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const flag = (key, fallback) => {
  const i = rest.indexOf(key);
  return i === -1 ? fallback : rest[i + 1];
};

function usage() {
  console.error('usage: ui.mjs find <regex> | tap <regex> [--nth N] | hold <regex> <ms> | shot <name> | open [--port 8081]');
  process.exit(2);
}

requireUnlockedPhone();

switch (cmd) {
  case 'find': {
    if (!rest[0]) usage();
    for (const h of await find(rest[0])) console.log(`${h.x} ${h.y} ${h.label.slice(0, 80)}`);
    break;
  }
  case 'tap':
  case 'hold': {
    if (!rest[0]) usage();
    const hits = await find(rest[0]);
    const hit = hits[Number(cmd === 'tap' ? flag('--nth', 0) : 0)];
    if (!hit) {
      console.error(`no match for /${rest[0]}/`);
      process.exit(1);
    }
    if (cmd === 'tap') {
      adb(['shell', 'input', 'tap', String(hit.x), String(hit.y)]);
    } else {
      const ms = Number(rest[1] ?? 1500);
      adb(['shell', 'input', 'motionevent', 'DOWN', String(hit.x), String(hit.y)]);
      await sleep(ms);
      adb(['shell', 'input', 'motionevent', 'UP', String(hit.x), String(hit.y)]);
    }
    console.log(`${cmd} ${hit.x} ${hit.y} ${hit.label.slice(0, 60)}`);
    break;
  }
  case 'shot': {
    if (!rest[0]) usage();
    const file = join(outDir(), `${rest[0]}.png`);
    writeFileSync(file, adb(['exec-out', 'screencap', '-p'], { binary: true }));
    console.log(file);
    break;
  }
  case 'open': {
    const port = String(flag('--port', 8081));
    adb(['reverse', `tcp:${port}`, `tcp:${port}`]);
    const url = `exp+thread-dev://expo-development-client/?url=${encodeURIComponent(`http://127.0.0.1:${port}`)}`;
    adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', url, DEV_PACKAGE]);
    console.log(`opened ${DEV_PACKAGE} on Metro :${port}`);
    break;
  }
  default:
    usage();
}
