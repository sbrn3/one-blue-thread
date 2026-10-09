// Shared helpers for the screen-review scripts (rec.mjs, ui.mjs).
// AGENTS.md → "The owner's phone" → "Screen reviews".
//
// Everything runs through execFileSync/spawn with no shell, so Git Bash's
// path mangling (/sdcard → C:/Program Files/Git/sdcard) can't happen.
//
// The release app (com.sngugi.thread) holds the owner's real reading data and
// every launch of it writes an app_open row to an append-only log. These
// scripts refuse any command that names it: review on the dev app only.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const DEV_PACKAGE = 'com.sngugi.thread.dev';
const RELEASE_REF = /com\.sngugi\.thread(?![.\w])|exp\+thread:\/\//;

function wingetPackage(prefix) {
  const base = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages');
  if (!existsSync(base)) return null;
  const dir = readdirSync(base).find((name) => name.startsWith(prefix));
  return dir ? join(base, dir) : null;
}

function onPath(cmd) {
  try {
    const out = execFileSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' });
    return out.split(/\r?\n/)[0].trim() || null;
  } catch {
    return null;
  }
}

export function adbPath() {
  if (process.env.ADB) return process.env.ADB;
  const found = onPath('adb');
  if (found) return found;
  const pkg = wingetPackage('Google.PlatformTools_');
  const exe = pkg && join(pkg, 'platform-tools', 'adb.exe');
  if (exe && existsSync(exe)) return exe;
  throw new Error('adb not found. Install it (`winget install Google.PlatformTools`) or set ADB.');
}

/** null when ffmpeg isn't installed — callers fall back to screencap bursts. */
export function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const found = onPath('ffmpeg');
  if (found) return found;
  const pkg = wingetPackage('Gyan.FFmpeg');
  if (!pkg) return null;
  const build = readdirSync(pkg).find((name) => name.startsWith('ffmpeg-'));
  const exe = build && join(pkg, build, 'bin', 'ffmpeg.exe');
  return exe && existsSync(exe) ? exe : null;
}

function guard(args) {
  for (const arg of args) {
    if (RELEASE_REF.test(String(arg))) {
      throw new Error(`Refusing to touch the release app (${arg}). Screen reviews run on ${DEV_PACKAGE} only.`);
    }
  }
}

export function adb(args, { binary = false } = {}) {
  guard(args);
  return execFileSync(adbPath(), args, {
    encoding: binary ? 'buffer' : 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 256 * 1024 * 1024,
  });
}

export function adbSpawn(args) {
  guard(args);
  return spawn(adbPath(), args, { stdio: 'ignore' });
}

export function ffmpeg(args) {
  const exe = ffmpegPath();
  if (!exe) throw new Error('ffmpeg not found. Install it (`winget install Gyan.FFmpeg.Essentials`) or set FFMPEG.');
  return execFileSync(exe, ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Throws a readable error when no phone is attached or it is locked. */
export function requireUnlockedPhone() {
  const devices = adb(['devices']).split(/\r?\n/).slice(1).filter((l) => /\tdevice$/.test(l));
  if (devices.length === 0) throw new Error('No phone attached. Ask the owner to plug it in and accept the USB debugging prompt.');
  if (/isKeyguardShowing=true/.test(adb(['shell', 'dumpsys', 'window']))) {
    throw new Error('Phone locked: ask the owner to unlock it.');
  }
}

/** .device/ under the current checkout (gitignored). */
export function outDir() {
  const dir = join(process.cwd(), '.device');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// On-screen elements by text or accessibility label (uiautomator).
const decode = (s) =>
  s.replace(/&#10;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function dump() {
  // uiautomator can't dump while the screen is animating; give it a few tries.
  for (let attempt = 0; attempt < 4; attempt++) {
    const out = adb(['shell', 'uiautomator', 'dump', '/sdcard/ui.xml']);
    if (/dumped to/i.test(out)) return adb(['exec-out', 'cat', '/sdcard/ui.xml']);
    await sleep(400);
  }
  throw new Error('uiautomator dump failed (screen still animating?)');
}

export async function find(pattern) {
  const re = new RegExp(pattern, 'i');
  const xml = await dump();
  const hits = [];
  for (const [node] of xml.matchAll(/<node [^>]*>/g)) {
    const text = decode(node.match(/ text="([^"]*)"/)?.[1] ?? '');
    const desc = decode(node.match(/content-desc="([^"]*)"/)?.[1] ?? '');
    const b = node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    const label = text || desc;
    if (!b || !label || !re.test(label)) continue;
    const x = (Number(b[1]) + Number(b[3])) >> 1;
    const y = (Number(b[2]) + Number(b[4])) >> 1;
    if (!hits.some((h) => h.x === x && Math.abs(h.y - y) < 4 && h.label === label)) hits.push({ x, y, label });
  }
  return hits;
}

