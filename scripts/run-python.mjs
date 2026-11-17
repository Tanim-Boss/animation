#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const venv = path.join(ROOT, '.venv', 'bin', 'python');
const python = process.env.PYTHON || (fs.existsSync(venv) ? venv : 'python3');
const args = process.argv.slice(2);

const child = spawn(python, args, { stdio: 'inherit', cwd: ROOT });
child.on('exit', (code) => process.exit(code ?? 0));
