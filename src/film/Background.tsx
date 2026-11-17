import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { COL, FONT } from './theme';
import { rnd } from './motion';

const BINARY_ROWS = 22;
const COLS = 26;

const BinaryRain: React.FC<{ t: number; intensity: number }> = ({ t, intensity }) => {
  if (intensity <= 0) return null;
  const cols = [];
  for (let c = 0; c < COLS; c++) {
    const speed = 18 + rnd(c) * 26;
    const offset = (t * speed + rnd(c + 9) * 900) % 1200;
    const items = [];
    for (let r = 0; r < BINARY_ROWS; r++) {
      const y = r * 62 - offset;
      if (y < -80 || y > 1160) continue;
      const bit = rnd(c * 31 + r * 17 + Math.floor(t * 1.6 + c)) > 0.5 ? '1' : '0';
      items.push(
        <div
          key={r}
          style={{
            position: 'absolute',
            top: y,
            left: c * 78,
            fontSize: 26,
            fontWeight: 500,
            color: rnd(c + r * 3) > 0.86 ? COL.accent : '#8FA6D8',
            opacity: 0.35 + rnd(c * 7 + r) * 0.65,
          }}
        >
          {bit}
        </div>,
      );
    }
    cols.push(
      <div key={c} style={{ position: 'absolute', inset: 0 }}>
        {items}
      </div>,
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: intensity * 0.16,
        maskImage: 'radial-gradient(ellipse 62% 58% at 50% 46%, transparent 12%, black 88%)',
        WebkitMaskImage: 'radial-gradient(ellipse 62% 58% at 50% 46%, transparent 12%, black 88%)',
      }}
    >
      {cols}
    </div>
  );
};

export const Background: React.FC<{ t: number; rain?: number; warmth?: number }> = ({
  t,
  rain = 0,
  warmth = 0,
}) => {
  const gridShift = 0;
  const glowX = 50;
  const glowY = 6;
  return (
    <AbsoluteFill style={{ background: COL.bg0, overflow: 'hidden' }}>
      {/* glows, horizon, scanlines and vignette merged into one paint pass */}
      <AbsoluteFill
        style={{
          backgroundImage: [
            'radial-gradient(ellipse 78% 68% at 50% 46%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.38) 78%, rgba(0,0,0,0.66) 100%)',
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 4px)',
            'radial-gradient(ellipse 1200px 420px at 50% 760px, rgba(126,155,255,0.10), rgba(126,155,255,0) 70%)',
            `radial-gradient(ellipse 48% 40% at 92% 82%, rgba(255,106,136,${0.05 + warmth * 0.03}), rgba(255,106,136,0) 70%)`,
            `radial-gradient(ellipse 55% 45% at 12% 88%, rgba(59,224,166,${0.055 + warmth * 0.03}), rgba(59,224,166,0) 70%)`,
            `radial-gradient(ellipse 70% 55% at ${glowX}% ${glowY}%, rgba(126,155,255,0.16), rgba(126,155,255,0) 62%)`,
            'linear-gradient(180deg, #080D18 0%, #05080F 52%, #04060B 100%)',
          ].join(','),
        }}
      />

      {/* blueprint grid */}
      <AbsoluteFill
        style={{
          backgroundImage: [
            'linear-gradient(to right, rgba(150,175,230,0.085) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(150,175,230,0.085) 1px, transparent 1px)',
            'linear-gradient(to right, rgba(150,175,230,0.05) 1px, transparent 1px)',
            'linear-gradient(to bottom, rgba(150,175,230,0.05) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: '400px 400px, 400px 400px, 80px 80px, 80px 80px',
          maskImage: 'radial-gradient(ellipse 70% 66% at 50% 47%, black 4%, transparent 74%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 66% at 50% 47%, black 4%, transparent 74%)',
        }}
      />

      <BinaryRain t={t} intensity={rain} />

      {/* thin scan structure */}
      <AbsoluteFill
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 4px)',
          opacity: 0.5,
        }}
      />

      {/* horizon glow */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 1200px 420px at 50% 760px, rgba(126,155,255,0.10), rgba(126,155,255,0) 70%)',
        }}
      />

      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse 78% 68% at 50% 46%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.38) 78%, rgba(0,0,0,0.66) 100%)',
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: `url(${staticFile('grain.png')})`,
          backgroundRepeat: 'repeat',
          backgroundSize: '1024px 1024px',
          opacity: 0.055,
          mixBlendMode: 'overlay',
        }}
      />
    </AbsoluteFill>
  );
};

export const CornerMarks: React.FC<{ opacity?: number }> = ({ opacity = 0.22 }) => {
  const marks = [
    { top: 54, left: 54 },
    { top: 54, right: 54 },
    { bottom: 54, left: 54 },
    { bottom: 54, right: 54 },
  ];
  return (
    <>
      {marks.map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...pos,
            width: 18,
            height: 18,
            opacity,
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 8, width: 18, height: 1, background: COL.dim }} />
          <div style={{ position: 'absolute', left: 8, top: 0, width: 1, height: 18, background: COL.dim }} />
        </div>
      ))}
    </>
  );
};

export const useT = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps, t: frame / fps };
};
