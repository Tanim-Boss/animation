#!/usr/bin/env node
/**
 * Provisions the portable Chromium used for rendering:
 *  - unpacks the @sparticuz/chromium shared libraries into /tmp/al2023/lib
 *  - extracts the browser binary to /tmp/chromium
 *  - records both paths in .browser.json for the other scripts to reuse
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const LIB_DIR = '/tmp/al2023/lib';

const { default: chromium, inflate } = await import('@sparticuz/chromium');

if (!fs.existsSync(path.join(LIB_DIR, 'libnspr4.so'))) {
  await inflate(path.join(ROOT, 'node_modules/@sparticuz/chromium/bin/al2023.tar.br'));
  if (!fs.existsSync(path.join(LIB_DIR, 'libnspr4.so'))) {
    throw new Error('Chromium libraries were not extracted to ' + LIB_DIR);
  }
}

const executable = await chromium.executablePath();
const state = { executable, libDir: LIB_DIR };
fs.writeFileSync(path.join(ROOT, '.browser.json'), JSON.stringify(state, null, 2) + '\n');
console.log('chromium:', executable);
console.log('libraries:', LIB_DIR);
