#!/usr/bin/env node
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const script = process.argv[2];
if (!script) throw new Error('Usage: node scripts/run-python.mjs <script.py> [args...]');
const candidates = process.env.PYTHON
  ? [process.env.PYTHON]
  : [path.join(root, '.venv', 'bin', 'python'), 'python3'];
let lastError;
for (const python of candidates) {
  const result = spawnSync(python, [path.resolve(root, script), ...process.argv.slice(3)], { stdio: 'inherit' });
  if (!result.error) {
    if (result.status !== 0) process.exit(result.status ?? 1);
    process.exit(0);
  }
  lastError = result.error;
}
throw lastError || new Error('Could not start Python');
