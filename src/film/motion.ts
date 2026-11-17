import { Easing, interpolate, spring } from 'remotion';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Eased 0..1 ramp between two times (seconds). */
export const ramp = (t: number, start: number, dur: number, ease: (v: number) => number = Easing.inOut(Easing.cubic)) => {
  if (dur <= 0) return t >= start ? 1 : 0;
  return ease(clamp01((t - start) / dur));
};

export const linear = (t: number, start: number, dur: number) => clamp01((t - start) / Math.max(dur, 0.0001));

/** Spring 0..1, delay in seconds. */
export const pop = (
  frame: number,
  fps: number,
  delay = 0,
  config: { damping?: number; stiffness?: number; mass?: number } = {},
) =>
  spring({
    frame: frame - delay * fps,
    fps,
    config: { damping: 200, stiffness: 120, mass: 0.9, ...config },
  });

export const soft = (
  frame: number,
  fps: number,
  delay = 0,
  stiffness = 70,
) => pop(frame, fps, delay, { damping: 26, stiffness, mass: 1.1 });

/** Convenience: entrance style (opacity + rise + slight blur). */
export const enter = (
  frame: number,
  fps: number,
  at: number,
  opts: { dist?: number; blur?: number; scaleFrom?: number; stiffness?: number } = {},
) => {
  const { dist = 26, blur = 0, scaleFrom = 1, stiffness = 120 } = opts;
  const p = pop(frame, fps, at, { stiffness });
  return {
    progress: p,
    opacity: clamp01(p * 1.25),
    transform: `translate3d(0, ${(1 - p) * dist}px, 0) scale(${scaleFrom + (1 - scaleFrom) * p})`,
    filter: blur > 0 ? `blur(${(1 - clamp01(p)) * blur}px)` : undefined,
  } as const;
};

export const fadeOut = (t: number, start: number, dur = 0.5) =>
  interpolate(t, [start, start + dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

export const mix = (a: string, b: string, v: number) => (v >= 0.5 ? b : a);

/** Deterministic pseudo-random in 0..1 from an integer. */
export const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Smooth looping float used for ambient drift. */
export const drift = (t: number, speed = 0.2, phase = 0) => Math.sin(t * speed * Math.PI * 2 + phase);
