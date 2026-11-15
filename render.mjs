#!/usr/bin/env node
/* Render deterministic 1920×1080 canvas frames with headless Chromium, then H.264 encode. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const ROOT = path.resolve(import.meta.dirname);
const OUT_DIR = path.join(ROOT, 'out');
const LIB_DIR = '/tmp/al2023/lib';
const args = process.argv.slice(2);
const arg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };

function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    const venvPython = path.join(ROOT, '.venv', 'bin', 'python');
    const py = process.env.PYTHON || (fs.existsSync(venvPython) ? venvPython : 'python3');
    return execFileSync(py, ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).trim();
  } catch {
    return 'ffmpeg';
  }
}

async function ensureChromiumLibs() {
  if (fs.existsSync(path.join(LIB_DIR, 'libnspr4.so'))) return;
  const { inflate } = await import('./node_modules/@sparticuz/chromium/build/lambdafs.js');
  await inflate('./node_modules/@sparticuz/chromium/bin/al2023.tar.br');
}

async function launch() {
  await ensureChromiumLibs();
  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars',
      '--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none',
      '--disable-gpu', '--disable-gpu-compositing', '--disable-accelerated-2d-canvas'],
    executablePath,
    headless: 'shell',
    defaultViewport: { width: 1920, height: 1080 },
    env: { ...process.env, LD_LIBRARY_PATH: LIB_DIR },
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.stack || String(error)));
  page.on('console', message => { if (message.type() === 'error') pageErrors.push(message.text()); });
  await page.goto(`file://${path.join(ROOT, 'src', 'index.html')}`, { waitUntil: 'load' });
  const info = await page.evaluate(() => window.boot());
  if (info.badFonts?.length) console.warn('Missing font faces:', info.badFonts.join(', '));
  if (pageErrors.length) console.warn('Browser diagnostics:', pageErrors.slice(0, 5).join('\n'));
  return { browser, page, info, pageErrors };
}

const screenshotJpeg = (page) => page.screenshot({ type: 'jpeg', quality: 97, captureBeyondViewport: false });
const screenshotPng = (page) => page.screenshot({ type: 'png', captureBeyondViewport: false, optimizeForSpeed: false });

async function renderStills(page, raw, duration) {
  const times = raw.split(',').map(Number).filter(Number.isFinite);
  const dir = path.join(OUT_DIR, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t0 of times) {
    const t = Math.max(0, Math.min(duration, t0));
    await page.evaluate(tt => window.paint(tt), t);
    const filename = `still_${t.toFixed(2).padStart(6, '0')}.png`;
    fs.writeFileSync(path.join(dir, filename), await screenshotPng(page));
    console.log('wrote', path.join('out', 'stills', filename));
  }
}

async function renderVideo(page, info, output, fps, from, to) {
  const duration = info.duration;
  const startFrame = Math.round(from * fps);
  const endFrame = Math.round(Math.min(to, duration) * fps);
  const totalFrames = Math.max(0, endFrame - startFrame);
  if (!totalFrames) throw new Error('Empty render range');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const child = spawn(ffmpegPath(), [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-an', '-c:v', 'libx264', '-preset', arg('--preset', 'veryfast'),
    '-crf', arg('--crf', '17'), '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
    '-g', String(fps * 2), '-bf', '2', '-movflags', '+faststart', output,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  let childError = null;
  child.on('error', error => { childError = error; });
  child.stdin.on('error', error => { childError = error; });
  const write = buffer => new Promise((resolve, reject) => {
    if (childError) return reject(childError);
    if (child.stdin.write(buffer)) resolve();
    else child.stdin.once('drain', resolve);
  });
  const startTime = Date.now();
  for (let frame = startFrame; frame < endFrame; frame++) {
    const t = frame / fps;
    await page.evaluate(time => window.paint(time), t);
    await write(await screenshotJpeg(page));
    if ((frame - startFrame + 1) % (fps * 4) === 0 || frame + 1 === endFrame) {
      const done = frame - startFrame + 1;
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = done / Math.max(elapsed, 0.01);
      const eta = (totalFrames - done) / Math.max(rate, 0.01);
      process.stdout.write(`\rframe ${done}/${totalFrames} · ${rate.toFixed(1)} fps · ETA ${(eta / 60).toFixed(1)} min   `);
    }
  }
  child.stdin.end();
  const code = await new Promise(resolve => child.on('close', resolve));
  console.log('');
  if (childError) throw childError;
  if (code !== 0) throw new Error(`ffmpeg exited with ${code}`);
  console.log('wrote', path.relative(ROOT, output));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { browser, page, info, pageErrors } = await launch();
  console.log(`duration ${info.duration}s · ${info.fps} fps · ${info.scenes.length} scenes`);
  console.log(info.scenes.map(s => `${s.id} ${s.start.toFixed(1)}–${s.end.toFixed(1)}`).join(' | '));
  try {
    const renderErrors = await page.evaluate(() => window.renderErrors());
    if (renderErrors.length) console.error('Initial paint errors:', renderErrors.slice(0, 5));
    if (args.includes('--stills')) {
      await renderStills(page, arg('--stills', ''), info.duration);
      return;
    }
    const fps = Number(arg('--fps', info.fps));
    const from = Number(arg('--from', 0));
    const to = Number(arg('--to', info.duration));
    const output = path.resolve(ROOT, arg('--out', path.join(OUT_DIR, 'video_silent.mp4')));
    await renderVideo(page, info, output, fps, from, to);
    const errors = await page.evaluate(() => window.renderErrors());
    if (errors.length) console.error('Scene drawing errors:', errors.slice(0, 12));
    if (pageErrors.length) console.error('Browser errors:', pageErrors.slice(0, 12));
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exit(1); });
