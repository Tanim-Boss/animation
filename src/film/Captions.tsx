import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { COL } from './theme';
import { clamp01 } from './motion';
import { cueList, SceneMeta } from './timeline';

export const Captions: React.FC<{ scene: SceneMeta; tone?: string }> = ({ scene, tone = COL.accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cues = cueList(scene);

  const active = cues.find((c) => t >= c.start - 0.2 && t <= c.end + 0.45);
  if (!active) return null;

  const inP = clamp01((t - (active.start - 0.2)) / 0.3);
  const outP = clamp01(((active.end + 0.45) - t) / 0.35);
  const alpha = Math.min(inP, outP);

  const words = active.text.split(' ');
  const dur = active.end - active.start;
  const weights = words.map((w) => w.length + 1.4);
  const total = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  const wordStarts = words.map((_, i) => {
    const s = active.start + (acc / total) * dur * 0.94;
    acc += weights[i];
    return s;
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 58,
        display: 'flex',
        justifyContent: 'center',
        opacity: alpha,
        pointerEvents: 'none',
      }}
    >
      <div style={{ maxWidth: 1420, textAlign: 'center' }}>
        <div
          style={{
            width: 54,
            height: 2,
            margin: '0 auto 20px auto',
            background: tone,
            opacity: 0.75,
            transform: `scaleX(${inP})`,
            boxShadow: `0 0 18px ${tone}`,
          }}
        />
        <div
          style={{
            fontSize: 38,
            fontWeight: 500,
            lineHeight: 1.32,
            letterSpacing: '0.002em',
            color: 'rgba(240,245,255,0.94)',
            textShadow: '0 3px 22px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.8)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0 0.3em',
          }}
        >
          {words.map((w, i) => {
            const p = clamp01((t - wordStarts[i]) / 0.24);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity: p,
                  transform: `translateY(${(1 - p) * 10}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};
