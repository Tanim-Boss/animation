import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COL, TONE } from '../theme';
import { clamp01, pop, ramp } from '../motion';
import { rgba } from '../color';
import { Chip, Headline, Kicker, Tile } from '../ui';

const CX = 960;
const CY = 556;
const LABEL_R = 252;
const ARC_R = 200;
const STEP = 22.5;

const polar = (r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
};

const arcPath = (r: number, from: number, to: number) => {
  const a = polar(r, from);
  const b = polar(r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
};

const VALUES = Array.from({ length: 16 }, (_, i) => (i <= 7 ? i : i - 16));

export const Range: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const center = pop(frame, fps, 2.6, { stiffness: 90 });
  const legend = pop(frame, fps, 3.4, { stiffness: 90 });
  const zeroGlow = ramp(t, 4.2, 0.7);

  return (
    <AbsoluteFill style={{ padding: '0 140px' }}>
      <div style={{ position: 'absolute', top: 146, left: 140 }}>
        <Kicker chapter="06" label="The range of four bits" at={0.1} />
      </div>

      <div style={{ position: 'absolute', top: 196, left: 140, width: 1100 }}>
        <Headline text="Sixteen values, one zero." at={0.3} size={58} weight={600} accent={['zero']} accentColor={COL.ink} />
      </div>

      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <circle
          cx={CX}
          cy={CY}
          r={LABEL_R + 44}
          fill="none"
          stroke={rgba(COL.accent, 0.12)}
          strokeWidth={1}
          strokeDasharray="1 10"
          transform={`rotate(${t * 4} ${CX} ${CY})`}
        />
        {VALUES.map((v, i) => {
          const from = i * STEP + 3;
          const to = (i + 1) * STEP - 3;
          const p = ramp(t, 1.15 + i * 0.045, 0.45);
          const positive = v > 0;
          const color = v === 0 ? COL.ink : positive ? TONE.pos.main : TONE.neg.main;
          const isZero = v === 0;
          return (
            <path
              key={i}
              d={arcPath(ARC_R, from, from + (to - from) * p)}
              fill="none"
              stroke={color}
              strokeWidth={isZero ? 12 : 9}
              strokeLinecap="round"
              opacity={v === 0 ? 0.55 + zeroGlow * 0.4 : 0.72}
              style={{ filter: `drop-shadow(0 0 ${isZero ? 16 : 8}px ${rgba(color, 0.5)})` }}
            />
          );
        })}
        {VALUES.map((v, i) => {
          const inner = polar(ARC_R + 22, i * STEP);
          const outer = polar(ARC_R + 34, i * STEP);
          const p = ramp(t, 1.2 + i * 0.045, 0.4);
          return (
            <line
              key={`t${i}`}
              x1={inner.x}
              y1={inner.y}
              x2={inner.x + (outer.x - inner.x) * p}
              y2={inner.y + (outer.y - inner.y) * p}
              stroke={rgba(COL.dim, 0.35)}
              strokeWidth={1}
            />
          );
        })}
      </svg>

      {/* value labels */}
      {VALUES.map((v, i) => {
        const p = pop(frame, fps, 1.35 + i * 0.045, { stiffness: 120 });
        const pt = polar(LABEL_R, i * STEP);
        const isZero = v === 0;
        const color = isZero ? COL.ink : v > 0 ? TONE.pos.main : TONE.neg.main;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: pt.x,
              top: pt.y,
              transform: `translate(-50%, -50%) scale(${0.8 + p * 0.2})`,
              fontSize: isZero ? 40 : 32,
              fontWeight: isZero ? 600 : 500,
              color,
              opacity: clamp01(p * 1.3),
              fontVariantNumeric: 'tabular-nums',
              textShadow: isZero ? `0 0 40px ${rgba(COL.ink, 0.55)}` : undefined,
              whiteSpace: 'nowrap',
            }}
          >
            {v > 0 ? `+${v}` : v}
            {isZero ? (
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: 84,
                  height: 84,
                  marginLeft: -42,
                  marginTop: -42,
                  borderRadius: 99,
                  border: `1px solid ${rgba(COL.ink, 0.35 * zeroGlow)}`,
                  opacity: zeroGlow,
                }}
              />
            ) : null}
          </div>
        );
      })}

      {/* centre */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: CY - 84,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 26,
          opacity: clamp01(center * 1.2),
          transform: `scale(${0.94 + center * 0.06})`,
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 600,
            letterSpacing: '-0.03em',
            color: COL.ink,
            fontVariantNumeric: 'tabular-nums',
            textShadow: '0 0 80px rgba(126,155,255,0.35)',
          }}
        >
          −8 … +7
        </div>
        <div style={{ fontSize: 16, letterSpacing: '0.32em', textTransform: 'uppercase', color: COL.faint, fontWeight: 600 }}>
          four bits · sixteen values
        </div>
      </div>

      {/* legend */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 862,
          display: 'flex',
          justifyContent: 'center',
          gap: 26,
          opacity: clamp01(legend * 1.3),
          transform: `translateY(${(1 - legend) * 16}px)`,
        }}
      >
        <Chip tone="pos" size={15}>
          0 … +7 · eight values
        </Chip>
        <Chip tone="neg" size={15}>
          −1 … −8 · eight values
        </Chip>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 15,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: COL.dim,
            fontWeight: 500,
          }}
        >
          <Tile value="0" size={30} tone="neutral" emphasis={0.4} shadow={false} />
          zero takes a slot
        </div>
      </div>
    </AbsoluteFill>
  );
};
