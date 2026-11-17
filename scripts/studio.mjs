#!/usr/bin/env node
/** Opens Remotion Studio with the pre-provisioned headless Chromium. */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROOT, applyBrowserEnv, loadBrowserState } from './lib/browser.mjs';

const state = loadBrowserState();
applyBrowserEnv(state);

const child = spawn(
  process.execPath,
  [path.join(ROOT, 'node_modules', 'remotion', 'dist', 'esm', 'cli.js'), 'studio', 'src/index.ts', '--port=3000'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, REMOTION_BROWSER_EXECUTABLE: state.executable },
  },
);
child.on('exit', (code) => process.exit(code ?? 0));
