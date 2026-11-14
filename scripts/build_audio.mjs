#!/usr/bin/env node
/* Renders the music + sound-design bed to data/bed.wav */
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const ROOT = path.resolve(import.meta.dirname, '..');
const { inflate } = await import('../node_modules/@sparticuz/chromium/build/lambdafs.js');
if (!fs.existsSync('/tmp/al2023/lib/libnspr4.so')) await inflate('./node_modules/@sparticuz/chromium/bin/al2023.tar.br');

const browser = await puppeteer.launch({
  args: [...chromium.args, '--no-sandbox', '--disable-dev-shm-usage'],
  executablePath: await chromium.executablePath(),
  headless: 'shell',
  defaultViewport: { width: 800, height: 600 },
  env: { ...process.env, LD_LIBRARY_PATH: '/tmp/al2023/lib' },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('file://' + path.join(ROOT, 'src', 'audio.html'), { waitUntil: 'load' });
await page.evaluate(() => window.boot());
const t0 = Date.now();
const res = await page.evaluate(() => window.renderBed());
console.log('rendered in', ((Date.now() - t0) / 1000).toFixed(1), 's', res.sr, res.dur);
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'bed.wav'), Buffer.from(res.b64, 'base64'));
console.log('wrote data/bed.wav');
await browser.close();
