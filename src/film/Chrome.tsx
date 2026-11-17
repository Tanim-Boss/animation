import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { COL } from './theme';
import { clamp01 } from './motion';
import { CUTS, DURATION_IN_FRAMES, FPS, SCENES } from './timeline';

const Brand: React.FC<{ chapter: string; total: string }> = ({ chapter, total }) => (
  <div
    style={{
      position: 'absolute',
      top: 62,
      left: 140,
      right: 140,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: '0.32em',
      textTransform: 'uppercase',
      color: COL.faint,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div
        style={{
          width: 7,
          height: 7,
          background: COL.accent,
          boxShadow: `0 0 12px ${COL.accent}`,
          transform: 'rotate(45deg)',
        }}
      />
      Two&apos;s complement
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: COL.dim }}>
      <span style={{ color: COL.ink }}>{chapter}</span>
      <span style={{ opacity: 0.4 }}>/</span>
      <span>{total}</span>
    </div>
  </div>
);

const Sweep: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const p = clamp01(t / 0.22);
  const fade = clamp01(1 - t / 0.4);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${p * 104 - 2}%`,
          width: 2,
          background: `linear-gradient(180deg, rgba(160,185,255,0), ${COL.ink}, rgba(160,185,255,0))`,
          opacity: 0.5 * fade,
          boxShadow: `0 0 26px 6px rgba(126,155,255,${0.35 * fade})`,
        }}
      />
    </AbsoluteFill>
  );
};

export const Chrome: React.FC = () => {
  const frame = useCurrentFrame();
  const active = SCENES.find((s) => frame >= s.start * FPS && frame < (s.start + s.dur) * FPS) ?? SCENES[0];
  const progress = clamp01(frame / (DURATION_IN_FRAMES - 1));

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <Brand chapter={active.chapter} total={String(SCENES.length - 1).padStart(2, '0')} />

      {CUTS.map((cut, i) => (
        <Sequence key={i} from={Math.round(cut * FPS) - 3} durationInFrames={Math.round(0.6 * FPS)}>
          <Sweep />
        </Sequence>
      ))}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          background: 'rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${COL.accent}, ${COL.pos})`,
            boxShadow: `0 0 16px rgba(126,155,255,0.6)`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
