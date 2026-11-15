#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const readJson = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
const timeline = readJson('data/timeline.json');
const project = readJson('data/project.json');
const schedule = readJson('data/sfx_schedule.json');
assert.equal(timeline.cues.length, project.scenes.length, 'one narration cue per scene');
assert.equal(timeline.scenes.length, project.scenes.length, 'one scene timing per scene');
assert.ok(timeline.duration > timeline.audioDuration, 'end card has a short voice-free hold');
assert.ok(timeline.cues.reduce((n, cue) => n + cue.words.length, 0) > 150, 'word-level subtitle timings exist');
assert.equal(schedule.music, false, 'no background music');
assert.equal(schedule.ambience, false, 'no continuous ambience');
assert.ok(schedule.events.length >= project.scenes.length, 'scene transitions have sound cues');

for (let i = 0; i < timeline.cues.length; i++) {
  const cue = timeline.cues[i];
  assert.ok(cue.words.length > 0, `cue ${i + 1} has words`);
  let previousStart = cue.start - 0.001;
  for (const word of cue.words) {
    assert.ok(word.start >= cue.start - 0.03 && word.end <= cue.end + 0.03, `word bounds in cue ${i + 1}`);
    assert.ok(word.start >= previousStart, `monotonic highlight sequence in cue ${i + 1}`);
    assert.ok(word.end > word.start, `positive highlight duration for ${word.t}`);
    previousStart = word.start;
  }
  for (const chunk of cue.chunks) {
    assert.ok(chunk.indices.length && chunk.indices.every(index => index >= 0 && index < cue.words.length));
  }
}
for (const [i, scene] of timeline.scenes.entries()) {
  assert.equal(scene.id, project.scenes[i].id);
  assert.ok(scene.end > scene.start);
  assert.ok(['opening', 'wipe', 'branch', 'scan', 'iris', 'stack', 'glitch', 'split', 'resolve'].includes(scene.transition));
}

for (const file of ['src/lib.js', 'src/scenes.js', 'src/sub.js', 'src/main.js', 'render.mjs',
  'scripts/prepare.mjs', 'scripts/mux.mjs', 'scripts/preview.mjs', 'scripts/run-python.mjs']) {
  if (fs.existsSync(path.join(ROOT, file))) execFileSync(process.execPath, ['--check', path.join(ROOT, file)]);
}
for (const file of ['audio/python-interpreter-bn.wav', 'out/audio_master.wav', 'data/subtitles-bn.srt']) {
  assert.ok(fs.existsSync(path.join(ROOT, file)), `required deliverable exists: ${file}`);
}
const words = timeline.cues.reduce((n, cue) => n + cue.words.length, 0);
console.log(`validated ${timeline.scenes.length} scenes · ${words} timed words · ${schedule.events.length} discrete SFX · no music/ambience`);
