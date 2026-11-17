import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { COL, TONE, ToneName } from './theme';
import { clamp01, pop } from './motion';
import { blend, rgba } from './color';

/* ------------------------------------------------------------------ tokens */

export const Tile: React.FC<{
  value: string;
  from?: string;
  flip?: number;
  size?: number;
  tone?: ToneName;
  emphasis?: number;
  appear?: number;
  indexLabel?: string;
  indexLabelTone?: ToneName;
  style?: React.CSSProperties;
  shadow?: boolean;
}> = ({
  value,
  from,
  flip = 0,
  size = 190,
  tone = 'neutral',
  emphasis = 0,
  appear = 1,
  indexLabel,
  indexLabelTone = 'neutral',
  style,
  shadow = true,
}) => {
  const T = TONE[tone];
  const e = clamp01(emphasis);
  const digitColor = blend('#E9F0FF', T.main, 0.25 + e * 0.75);
  const borderCol = rgba(T.main, 0.16 + e * 0.6);
  const glow = e > 0.01 ? `0 0 0 1px ${rgba(T.main, e * 0.55)}, 0 26px 70px -18px ${rgba(T.main, e * 0.55)}, 0 0 90px -20px ${rgba(T.main, e * 0.5)}` : '';
  const baseShadow = shadow ? '0 34px 60px -30px rgba(0,0,0,0.9), 0 2px 0 rgba(0,0,0,0.4)' : '';

  const face = (digit: string, back: boolean) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: size * 0.16,
        background: `linear-gradient(157deg, ${blend('#161F33', T.main, 0.05 + e * 0.1)} 0%, #0A0F1A 58%, #070B13 100%)`,
        border: `1px solid ${borderCol}`,
        boxShadow: `${baseShadow} ${glow}`.trim(),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateX(180deg)' : undefined,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          height: '46%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: size * 0.16,
          background: `radial-gradient(ellipse 80% 70% at 50% 120%, ${rgba(T.main, e * 0.18)}, rgba(0,0,0,0) 70%)`,
        }}
      />
      <span
        style={{
          fontSize: size * 0.6,
          fontWeight: 500,
          lineHeight: 1,
          color: digitColor,
          fontVariantNumeric: 'tabular-nums',
          transform: `translateY(${size * 0.012}px)`,
          letterSpacing: '-0.02em',
          textShadow: e > 0.05 ? `0 0 ${size * 0.18}px ${rgba(T.main, e * 0.35)}` : undefined,
        }}
      >
        {digit}
      </span>
    </div>
  );

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        opacity: clamp01(appear * 1.4),
        transform: `translateY(${(1 - appear) * 24}px) scale(${0.9 + appear * 0.1})`,
        ...style,
      }}
    >
      <div style={{ position: 'absolute', inset: 0, perspective: 1500 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transformStyle: 'preserve-3d',
            transform: `rotateX(${flip * 180}deg)`,
          }}
        >
          {face(flip > 0.5 ? value : from ?? value, false)}
          {face(flip > 0.5 ? value : from ?? value, true)}
        </div>
      </div>
      {indexLabel !== undefined ? (
        <div
          style={{
            position: 'absolute',
            bottom: -42,
            width: '100%',
            textAlign: 'center',
            fontSize: 20,
            letterSpacing: '0.24em',
            fontWeight: 500,
            color: rgba(TONE[indexLabelTone].main, 0.62),
          }}
        >
          {indexLabel}
        </div>
      ) : null}
    </div>
  );
};

/* --------------------------------------------------------------- typography */

export const Kicker: React.FC<{
  chapter?: string;
  label: string;
  at?: number;
  tone?: ToneName;
}> = ({ chapter, label, at = 0, tone = 'accent' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, at, { stiffness: 110 });
  const lineW = pop(frame, fps, at + 0.08, { stiffness: 60 });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, opacity: clamp01(p * 1.3) }}>
      <div
        style={{
          width: 46 * lineW,
          height: 2,
          background: TONE[tone].main,
          boxShadow: `0 0 18px ${rgba(TONE[tone].main, 0.75)}`,
        }}
      />
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          color: TONE[tone].main,
          transform: `translateY(${(1 - p) * 10}px)`,
        }}
      >
        {chapter ? <span style={{ color: COL.faint, marginRight: 14 }}>{chapter}</span> : null}
        {label}
      </div>
    </div>
  );
};

export const Headline: React.FC<{
  text: string;
  at?: number;
  size?: number;
  weight?: number;
  color?: string;
  accent?: string[];
  accentColor?: string;
  stagger?: number;
  letterSpacing?: number;
  lineHeight?: number;
}> = ({
  text,
  at = 0,
  size = 66,
  weight = 600,
  color = COL.ink,
  accent = [],
  accentColor = COL.accent,
  stagger = 0.06,
  letterSpacing = -0.025,
  lineHeight = 1.14,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `0 ${size * 0.26}px`,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: `${letterSpacing}em`,
        lineHeight,
        color,
      }}
    >
      {words.map((word, i) => {
        const p = pop(frame, fps, at + i * stagger, { stiffness: 130 });
        const isAccent = accent.includes(word.replace(/[^A-Za-z']/g, '').toLowerCase());
        return (
          <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: size * 0.08, marginBottom: -size * 0.08 }}>
            <span
              style={{
                display: 'inline-block',
                transform: `translateY(${(1 - p) * 105}%)`,
                color: isAccent ? accentColor : undefined,
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
};

export const Meta: React.FC<{ children: React.ReactNode; at?: number; style?: React.CSSProperties }> = ({
  children,
  at = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, at, { stiffness: 110 });
  return (
    <div
      style={{
        fontSize: 21,
        fontWeight: 500,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color: COL.dim,
        opacity: clamp01(p * 1.3),
        transform: `translateY(${(1 - p) * 12}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/* ------------------------------------------------------------------- pieces */

export const Chip: React.FC<{
  children: React.ReactNode;
  tone?: ToneName;
  solid?: boolean;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, tone = 'accent', solid = false, size = 19, style }) => {
  const T = TONE[tone];
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: `${size * 0.5}px ${size * 0.95}px`,
        borderRadius: 999,
        border: `1px solid ${rgba(T.main, solid ? 0.55 : 0.34)}`,
        background: solid ? rgba(T.main, 0.16) : 'rgba(10,15,26,0.55)',
        color: T.main,
        fontSize: size,
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Panel: React.FC<{
  children?: React.ReactNode;
  style?: React.CSSProperties;
  tone?: ToneName;
  intensity?: number;
}> = ({ children, style, tone = 'accent', intensity = 1 }) => (
  <div
    style={{
      borderRadius: 26,
      background: 'linear-gradient(160deg, rgba(20,28,45,0.86), rgba(8,12,21,0.9))',
      border: `1px solid ${rgba(TONE[tone].main, 0.18 * intensity)}`,
      boxShadow: '0 40px 80px -40px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)',
      ...style,
    }}
  >
    {children}
  </div>
);

export const DrawPath: React.FC<{
  d: string;
  progress: number;
  tone?: ToneName;
  width?: number;
  opacity?: number;
  viewBox?: string;
  style?: React.CSSProperties;
}> = ({ d, progress, tone = 'accent', width = 2, opacity = 1, viewBox = '0 0 100 100', style }) => (
  <svg
    viewBox={viewBox}
    style={{ position: 'absolute', inset: 0, overflow: 'visible', ...style }}
    preserveAspectRatio="none"
  >
    <path
      d={d}
      fill="none"
      stroke={TONE[tone].main}
      strokeWidth={width}
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray="1"
      strokeDashoffset={1 - clamp01(progress)}
      opacity={opacity}
      vectorEffect="non-scaling-stroke"
      style={{ filter: `drop-shadow(0 0 6px ${rgba(TONE[tone].main, 0.55)})` }}
    />
  </svg>
);

export const Arrow: React.FC<{
  progress: number;
  direction?: 'right' | 'down' | 'left' | 'up';
  length?: number;
  tone?: ToneName;
  width?: number;
}> = ({ progress, direction = 'right', length = 90, tone = 'accent', width = 2.5 }) => {
  const p = clamp01(progress);
  const rot = { right: 0, down: 90, left: 180, up: -90 }[direction];
  return (
    <svg
      width={length}
      height={length * 0.4}
      viewBox={`0 0 ${length} ${length * 0.4}`}
      style={{ transform: `rotate(${rot}deg)`, overflow: 'visible', opacity: p > 0 ? 1 : 0 }}
    >
      <line
        x1={6}
        y1={length * 0.2}
        x2={(length - 10) * p}
        y2={length * 0.2}
        stroke={TONE[tone].main}
        strokeWidth={width}
        strokeLinecap="round"
        opacity={0.9}
      />
      <path
        d={`M ${length - 20} ${length * 0.2 - 7} L ${length - 8} ${length * 0.2} L ${length - 20} ${length * 0.2 + 7}`}
        fill="none"
        stroke={TONE[tone].main}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={clamp01((p - 0.72) / 0.28)}
      />
    </svg>
  );
};

/** Labelled span bracket, e.g. under a group of bits. */
export const Bracket: React.FC<{
  width: number;
  label: string;
  progress: number;
  tone?: ToneName;
  height?: number;
  flip?: boolean;
  labelSize?: number;
}> = ({ width, label, progress, tone = 'accent', height = 26, flip = false, labelSize = 19 }) => {
  const p = clamp01(progress);
  const T = TONE[tone];
  return (
    <div style={{ width, height: height + labelSize * 2.2, position: 'relative', opacity: p > 0 ? 1 : 0 }}>
      <svg width={width} height={height + 6} style={{ overflow: 'visible', transform: flip ? 'scaleY(-1)' : undefined }}>
        <path
          d={`M 1 ${height} L 1 2 L ${width * p} 2 ${p > 0.96 ? '' : ''}`}
          fill="none"
          stroke={T.main}
          strokeWidth={1.5}
          opacity={0.75}
        />
        <path d={`M ${width - 1} ${height} L ${width - 1} 2 L ${width * (1 - p)} 2`} fill="none" stroke={T.main} strokeWidth={1.5} opacity={0.75} />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: height + 12,
          width: '100%',
          textAlign: 'center',
          fontSize: labelSize,
          fontWeight: 600,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: T.main,
          opacity: clamp01((p - 0.4) / 0.6),
        }}
      >
        {label}
      </div>
    </div>
  );
};

export const ValueBadge: React.FC<{
  children: React.ReactNode;
  tone?: ToneName;
  at?: number;
  size?: number;
  style?: React.CSSProperties;
  bold?: number;
}> = ({ children, tone = 'pos', at = 0, size = 130, style, bold = 600 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, at, { stiffness: 140, damping: 16 });
  const T = TONE[tone];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22, ...style }}>
      <div
        style={{
          fontSize: size,
          fontWeight: bold,
          lineHeight: 0.95,
          letterSpacing: '-0.04em',
          color: T.main,
          fontVariantNumeric: 'tabular-nums',
          transform: `scale(${0.86 + p * 0.14})`,
          opacity: clamp01(p * 1.2),
          textShadow: `0 0 60px ${rgba(T.main, 0.45)}`,
        }}
      >
        {children}
      </div>
      <div
        style={{
          width: 3,
          height: size * 0.72,
          background: `linear-gradient(180deg, ${rgba(T.main, 0)}, ${rgba(T.main, 0.9)}, ${rgba(T.main, 0)})`,
          opacity: clamp01(p),
        }}
      />
    </div>
  );
};

export const EqualSign: React.FC<{ at?: number; size?: number; color?: string }> = ({ at = 0, size = 56, color = COL.dim }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, at, { stiffness: 150 });
  return (
    <div
      style={{
        width: size * 0.9,
        height: size * 0.7,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: size * 0.18,
        opacity: clamp01(p * 1.3),
        transform: `scaleX(${0.4 + p * 0.6})`,
      }}
    >
      <div style={{ height: Math.max(3, size * 0.07), background: color, borderRadius: 2, opacity: 0.85 }} />
      <div style={{ height: Math.max(3, size * 0.07), background: color, borderRadius: 2, opacity: 0.85 }} />
    </div>
  );
};

/** Small tick marks used as numeric rulers. */
export const Ticks: React.FC<{ count: number; width: number; height?: number; opacity?: number }> = ({
  count,
  width,
  height = 12,
  opacity = 0.35,
}) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', width, opacity }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{ width: 1, height, background: COL.dim }} />
    ))}
  </div>
);
