import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');

export const loadBrowserState = () => {
  const file = path.join(ROOT, '.browser.json');
  if (!fs.existsSync(file)) {
    throw new Error('Chromium is not prepared yet. Run: npm run prepare:browser');
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

export const applyBrowserEnv = (state) => {
  const current = process.env.LD_LIBRARY_PATH ?? '';
  process.env.LD_LIBRARY_PATH = current ? `${state.libDir}:${current}` : state.libDir;
  process.env.REMOTION_BROWSER_EXECUTABLE = state.executable;
};

export const ENTRY = path.join(ROOT, 'src', 'index.ts');
export const PUBLIC_DIR = path.join(ROOT, 'public');
export const COMP_ID = 'TwoComplement';
