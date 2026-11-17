#!/usr/bin/env node
/**
 * Renders the film to H.264/AAC.
 *
 *   node scripts/render.mjs                     -> out/Two-Complement-1080p.mp4
 *   node scripts/render.mjs --frames=0-240      -> quick preview of the first 8s
 *   node scripts/render.mjs --scale=0.5 --crf=23
 */
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderMedia, selectComposition } from '@remotion/renderer';
import { COMP_ID, ENTRY, PUBLIC_DIR, ROOT, applyBrowserEnv, loadBrowserState } from './lib/browser.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const state = loadBrowserState();
applyBrowserEnv(state);

const OUT_DIR = path.join(ROOT, 'out');
fs.mkdirSync(OUT_DIR, { recursive: true });

const output = path.resolve(ROOT, arg('out', 'out/Two-Complement-1080p.mp4'));
const concurrency = Number(arg('concurrency', '2'));
const crf = Number(arg('crf', '17'));
const scale = Number(arg('scale', '1'));

const serveUrl = await bundle({
  entryPoint: ENTRY,
  publicDir: PUBLIC_DIR,
  onProgress: (p) => {
    if (p % 25 === 0) process.stdout.write(`bundle ${p}%\n`);
  },
});

const chromiumOptions = { gl: 'swangle' };
const browser = await openBrowser('chrome-headless-shell', {
  browserExecutable: state.executable,
  chromiumOptions,
});

const composition = await selectComposition({
  serveUrl,
  id: COMP_ID,
  puppeteerInstance: browser,
  browserExecutable: state.executable,
  chromiumOptions,
});

const frameRange = arg('frames', '');
let frameRangeProp;
if (frameRange) {
  const [from, to] = frameRange.split('-').map(Number);
  frameRangeProp = [from, Number.isFinite(to) ? to : composition.durationInFrames - 1];
}

console.log(
  `rendering ${composition.width}x${composition.height} @ ${composition.fps}fps · ` +
    `${composition.durationInFrames} frames (${(composition.durationInFrames / composition.fps).toFixed(1)}s)`,
);

await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  outputLocation: output,
  imageFormat: 'jpeg',
  jpegQuality: 95,
  crf,
  x264Preset: 'faster',
  pixelFormat: 'yuv420p',
  scale,
  concurrency,
  frameRange: frameRangeProp,
  audioCodec: 'aac',
  audioBitrate: '256k',
  enforceAudioTrack: false,
  browserExecutable: state.executable,
  chromiumOptions,
  puppeteerInstance: browser,
  timeoutInMilliseconds: 300000,
  onProgress: ({ renderedFrames, encodedFrames, progress }) => {
    const pct = Math.round(progress * 100);
    if (pct % 5 === 0) {
      process.stdout.write(`\rrendered ${renderedFrames} · encoded ${encodedFrames} · ${pct}%   `);
    }
  },
});

await browser.close({ silent: true });
const size = (fs.statSync(output).size / (1024 * 1024)).toFixed(1);
console.log(`\nwrote ${path.relative(ROOT, output)} (${size} MB)`);
process.exit(0);
