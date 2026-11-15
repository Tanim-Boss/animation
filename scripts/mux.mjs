#!/usr/bin/env node
/* Mux the silent 24 fps animation with the Bangla voice + discrete SFX master. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const venvPython = path.join(ROOT, '.venv', 'bin', 'python');
const PY = process.env.PYTHON || (fs.existsSync(venvPython) ? venvPython : 'python3');
const ffmpeg = process.env.FFMPEG || execFileSync(PY, ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).trim();
const silent = path.join(ROOT, 'out', 'video_silent.mp4');
const audio = path.join(ROOT, 'out', 'audio_master.wav');
const target = path.join(ROOT, 'out', 'Python-Interpreter-Works-Bangla-1080p.mp4');
const timeline = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'timeline.json'), 'utf8'));
if (!fs.existsSync(silent) || !fs.existsSync(audio)) throw new Error('Render the video and build the audio master first.');
const args = [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-i', silent, '-i', audio,
  '-map', '0:v:0', '-map', '1:a:0',
  '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709:flags=bicubic,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-profile:v', 'high', '-level', '4.1',
  '-g', String(timeline.fps * 2), '-bf', '2',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
  '-t', String(timeline.duration), '-movflags', '+faststart', target,
];
const result = spawnSync(ffmpeg, args, { stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`ffmpeg mux failed with exit code ${result.status}`);
console.log(`wrote ${path.relative(ROOT, target)} (${timeline.format?.width || 1920}×${timeline.format?.height || 1080}, ${timeline.fps} fps, ${timeline.duration}s)`);
