#!/usr/bin/env node
/**
 * Render reference stills: node scripts/stills.mjs --times=1,9,22,38
 * Outputs to out/stills/frame_XXXXX.png
 */
import fs from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { COMP_ID, ENTRY, PUBLIC_DIR, ROOT, applyBrowserEnv, loadBrowserState } from './lib/browser.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const FPS = 30;
const times = (arg('times', '1,9,22,38') || '').split(',').flatMap((group) =>
  group.includes('-') ? rangeTimes(group) : [Number(group)],
);
const frames = (arg('frames', '') || '')
  .split(',')
  .filter(Boolean)
  .map(Number);

function rangeTimes(group) {
  const [a, b] = group.split('-').map(Number);
  const out = [];
  for (let t = a; t <= b; t += 1) out.push(t);
  return out;
}

const state = loadBrowserState();
applyBrowserEnv(state);

const outDir = path.join(ROOT, 'out', 'stills');
fs.mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({ entryPoint: ENTRY, publicDir: PUBLIC_DIR });
const browser = await openBrowser('chrome-headless-shell', {
  browserExecutable: state.executable,
  chromiumOptions: { gl: 'swangle' },
});
const composition = await selectComposition({
  serveUrl,
  id: COMP_ID,
  puppeteerInstance: browser,
  browserExecutable: state.executable,
  chromiumOptions: { gl: 'swangle' },
});

const targets = frames.length ? frames : times.map((t) => Math.round(t * FPS));
for (const frame of targets) {
  const clamped = Math.max(0, Math.min(composition.durationInFrames - 1, frame));
  const output = path.join(outDir, `frame_${String(clamped).padStart(5, '0')}.png`);
  await renderStill({
    composition,
    serveUrl,
    frame: clamped,
    output,
    puppeteerInstance: browser,
    imageFormat: 'png',
    browserExecutable: state.executable,
    chromiumOptions: { gl: 'swangle' },
    onBrowserLog: (log) => {
      if (log.type === 'error') console.error('[browser]', log.text);
    },
  });
  console.log('still', path.relative(ROOT, output));
}

await browser.close({ silent: true });
process.exit(0);
