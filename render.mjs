#!/usr/bin/env node
/* ============================================================
   render.mjs — headless frame renderer.

   Usage
     node render.mjs                     full video -> out/video_silent.mp4
     node render.mjs --stills 3,18,40.5  write PNG stills to out/stills/
     node render.mjs --from 0 --to 120   render a frame range (debug)
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const ROOT = path.resolve(import.meta.dirname);
const FPS = 30;
const OUT = path.join(ROOT, 'out');
const LIBDIR = '/tmp/al2023/lib';

const args = process.argv.slice(2);
const argVal = (k, d) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};

function ffmpegPath() {
  try {
    return execSync(`${path.join(ROOT, '.venv/bin/python')} -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"`)
      .toString().trim();
  } catch { return 'ffmpeg'; }
}

async function ensureChromiumLibs() {
  if (fs.existsSync(path.join(LIBDIR, 'libnspr4.so'))) return;
  const { inflate } = await import('./node_modules/@sparticuz/chromium/build/lambdafs.js');
  await inflate('./node_modules/@sparticuz/chromium/bin/al2023.tar.br');
}

async function launch() {
  await ensureChromiumLibs();
  const exe = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
      '--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none',
      // SwiftShader's GPU path makes each 1080p readback ~7x slower; CPU raster
      // is both faster here and bit-identical for our flat vector artwork.
      '--disable-gpu', '--disable-gpu-compositing', '--disable-accelerated-2d-canvas'],
    executablePath: exe,
    headless: 'shell',
    defaultViewport: { width: 1920, height: 1080 },
    env: { ...process.env, LD_LIBRARY_PATH: LIBDIR },
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(ROOT, 'src', 'index.html'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 350));
  const info = await page.evaluate(() => window.boot());
  return { browser, page, info };
}

const shoot = (page) => page.screenshot({ type: 'png', captureBeyondViewport: false, optimizeForSpeed: false });
// JPEG/100 is ~4x faster to encode than PNG in the headless shell and is
// visually lossless in practice (mean error ~1 LSB) — used for the video pipe.
const shootJpg = (page) => page.screenshot({ type: 'jpeg', quality: 100, captureBeyondViewport: false });

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const { browser, page, info } = await launch();
  const dur = info.duration;
  console.log('scenes:', info.scenes.map((s) => `${s.id} ${s.s}-${s.e}`).join(' | '));

  if (args.includes('--stills')) {
    const list = argVal('--stills', '').split(',').filter(Boolean);
    fs.mkdirSync(path.join(OUT, 'stills'), { recursive: true });
    for (const tStr of list) {
      const t = parseFloat(tStr);
      await page.evaluate((tt) => window.paint(tt), t);
      const buf = await shoot(page);
      const f = path.join(OUT, 'stills', `still_${t.toFixed(2).padStart(6, '0')}.png`);
      fs.writeFileSync(f, buf);
      console.log('wrote', f);
    }
    await browser.close();
    return;
  }

  const fps = Number(argVal('--fps', FPS));
  const t0 = Number(argVal('--from', 0));
  const t1 = Number(argVal('--to', dur));
  const n0 = Math.round(t0 * fps);
  const n1 = Math.round(Math.min(t1, dur) * fps);
  const target = argVal('--out', path.join(OUT, 'video_silent.mp4'));

  const ff = spawn(ffmpegPath(), [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', argVal('--preset', 'slow'), '-crf', argVal('--crf', '17'),
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
    '-g', String(fps * 2), '-bf', '2',
    '-movflags', '+faststart', target,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  let ffErr = null;
  ff.on('error', (e) => { ffErr = e; });
  ff.stdin.on('error', (e) => { ffErr = e; });
  const write = (buf) => new Promise((res) => {
    if (ffErr) return res();
    if (ff.stdin.write(buf)) res();
    else ff.stdin.once('drain', res);
  });

  const start = Date.now();
  for (let i = n0; i < n1; i++) {
    const t = i / fps;
    await page.evaluate((tt) => window.paint(tt), t);
    const buf = await shootJpg(page);
    await write(buf);
    if (i % 60 === 0) {
      const el = (Date.now() - start) / 1000;
      const done = i - n0 + 1;
      process.stdout.write(`\rframe ${i}/${n1}  ${(done / el).toFixed(1)} fps  eta ${(((n1 - n0 - done) / (done / el)) / 60).toFixed(1)} min   `);
    }
  }
  ff.stdin.end();
  await new Promise((res) => ff.on('close', res));
  console.log('\nwrote', target);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
