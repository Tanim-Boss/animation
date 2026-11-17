import script from '../../data/script.json';
import narrationFile from '../../data/narration.json';
import { FPS, H, W } from './theme';

export { FPS, H, W };

export type RawScene = (typeof script.scenes)[number];

type NarrationEntry = { file: string; duration: number };
const narration = (narrationFile.scenes ?? {}) as Record<string, NarrationEntry>;

export const LEAD = 0.45; // silence before narration starts inside a scene
export const TAIL = 0.7; // hold after narration ends

export type SceneMeta = RawScene & {
  index: number;
  start: number;
  dur: number;
  narrationDur: number;
  narrationFile: string | null;
};

const built: SceneMeta[] = [];
let cursor = 0;
script.scenes.forEach((scene, index) => {
  const n = narration[scene.id];
  const narrationDur = n?.duration ?? 0;
  const dur = Math.max(scene.minSeconds, LEAD + narrationDur + TAIL);
  built.push({
    ...scene,
    index,
    start: cursor,
    dur,
    narrationDur,
    narrationFile: n?.file ?? null,
  });
  cursor += dur;
});

export const SCENES: SceneMeta[] = built;
export const TOTAL_SECONDS = cursor;
export const DURATION_IN_FRAMES = Math.round(TOTAL_SECONDS * FPS);
export const COMP_TITLE = script.title;

export const sceneAt = (id: string) => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown scene: ${id}`);
  return s;
};

export type Cue = { text: string; start: number; end: number };

/**
 * Split a scene's captions across the spoken window, weighted by character
 * count so each line lingers about as long as it takes to say it.
 */
export const cueList = (scene: SceneMeta): Cue[] => {
  const lines = scene.captions ?? [];
  if (!lines.length) return [];
  const speechStart = LEAD;
  const speechDur =
    scene.narrationDur > 0 ? scene.narrationDur : Math.max(2, Math.min(scene.dur - LEAD - TAIL, 9));
  const weights = lines.map((l) => Math.max(12, l.replace(/\s+/g, ' ').length));
  const sum = weights.reduce((a, b) => a + b, 0);
  let t = speechStart;
  return lines.map((text, i) => {
    const d = (weights[i] / sum) * speechDur;
    const cue = { text, start: t, end: t + d };
    t += d;
    return cue;
  });
};

export const CUTS = SCENES.map((s) => s.start).slice(1);
