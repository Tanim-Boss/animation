import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COL, TONE } from '../theme';
import { clamp01, drift, pop, ramp } from '../motion';
import { rgba } from '../color';
import { Tile } from '../ui';

const Word: React.FC<{ text: string; at: number; style?: React.CSSProperties; gradient?: boolean }> = ({
  text,
  at,
  style,
  gradient,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, at, { stiffness: 90, damping: 200 });
  return (
    <div style={{ overflow: 'hidden', paddingBottom: '0.06em', marginBottom: '-0.06em' }}>
      <div
        style={{
          transform: `translateY(${(1 - p) * 108}%)`,
          ...(gradient
            ? {
                backgroundImage: `linear-gradient(96deg, #F4F7FF 6%, ${COL.accent} 52%, ${COL.pos} 96%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }
            : undefined),
          ...style,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Open: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const rule = pop(frame, fps, 0.05, { stiffness: 55 });
  const kicker = pop(frame, fps, 0.35, { stiffness: 110 });
  const sub = pop(frame, fps, 2.0, { stiffness: 100 });
  const strip = pop(frame, fps, 2.9, { stiffness: 90 });
  const sweep = ramp(t, 3.5, 0.9);

  return (
    <AbsoluteFill>
      {/* ghost numeral */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 760,
          fontWeight: 800,
          letterSpacing: '-0.06em',
          color: 'rgba(126,155,255,0.032)',
          filter: 'blur(1.5px)',
          transform: `translateY(${drift(t, 0.05) * 10 - 30}px)`,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        1011
      </div>

      {/* dashed orbit */}
      <svg
        width={1920}
        height={1080}
        style={{ position: 'absolute', inset: 0, opacity: 0.55 }}
      >
        <circle
          cx={960}
          cy={520}
          r={430}
          fill="none"
          stroke={rgba(COL.accent, 0.14)}
          strokeWidth={1}
          strokeDasharray="2 14"
          transform={`rotate(${t * 5} 960 520)`}
        />
        <circle
          cx={960}
          cy={520}
          r={520}
          fill="none"
          stroke={rgba(COL.pos, 0.08)}
          strokeWidth={1}
          strokeDasharray="1 24"
          transform={`rotate(${-t * 3} 960 520)`}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingBottom: 60,
        }}
      >
        <div
          style={{
            width: 150 * rule,
            height: 1,
            background: `linear-gradient(90deg, ${rgba(COL.accent, 0)}, ${COL.accent}, ${rgba(COL.accent, 0)})`,
            marginBottom: 26,
          }}
        />
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '0.46em',
            textTransform: 'uppercase',
            color: COL.dim,
            opacity: clamp01(kicker * 1.4),
            transform: `translateY(${(1 - kicker) * 12}px)`,
            marginBottom: 34,
          }}
        >
          Binary arithmetic · 4-bit lesson
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: 196,
            fontWeight: 800,
            letterSpacing: '-0.055em',
            lineHeight: 0.93,
            color: COL.ink,
          }}
        >
          <Word text="TWO’S" at={0.6} />
          <Word text="COMPLEMENT" at={0.92} gradient />
        </div>

        <div
          style={{
            position: 'relative',
            marginTop: 40,
            fontSize: 31,
            fontWeight: 400,
            letterSpacing: '0.01em',
            color: 'rgba(214,225,245,0.72)',
            opacity: clamp01(sub * 1.3),
            transform: `translateY(${(1 - sub) * 16}px)`,
          }}
        >
          How computers store negative numbers
          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: -20,
              height: 1,
              width: `${sweep * 62}%`,
              background: `linear-gradient(90deg, ${COL.pos}, ${rgba(COL.pos, 0)})`,
            }}
          />
        </div>

        {/* teaser strip */}
        <div
          style={{
            marginTop: 54,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            opacity: clamp01(strip * 1.2),
            transform: `translateY(${(1 - strip) * 18}px)`,
          }}
        >
          {['0', '1', '0', '1'].map((b, i) => (
            <Tile key={i} value={b} size={62} tone="neutral" emphasis={0.25} appear={clamp01(strip * 1.4 - i * 0.06)} shadow={false} />
          ))}
          <svg width={54} height={22} viewBox="0 0 54 22" style={{ margin: '0 10px', overflow: 'visible' }}>
            <line x1={0} y1={11} x2={40} y2={11} stroke={rgba(COL.dim, 0.6)} strokeWidth={1.5} />
            <path d="M 36 4 L 47 11 L 36 18" fill="none" stroke={rgba(COL.dim, 0.8)} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {['1', '0', '1', '1'].map((b, i) => (
            <Tile
              key={`b${i}`}
              value={b}
              size={70}
              tone="neg"
              emphasis={0.35}
              appear={clamp01(strip * 1.4 - 0.16 - i * 0.06)}
              shadow={false}
            />
          ))}
          <div
            style={{
              marginLeft: 14,
              fontSize: 19,
              fontWeight: 600,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: TONE.neg.main,
              opacity: clamp01((strip - 0.55) * 2.2),
            }}
          >
            +5 → −5
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
