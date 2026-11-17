import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COL, TONE } from '../theme';
import { clamp01, pop, ramp } from '../motion';
import { rgba } from '../color';
import { Headline, Kicker, Tile } from '../ui';

const RuleCard: React.FC<{
  bit: string;
  label: string;
  sub: string;
  tone: 'pos' | 'neg';
  at: number;
}> = ({ bit, label, sub, tone, at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, at, { stiffness: 95 });
  const T = TONE[tone];
  return (
    <div
      style={{
        width: 610,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        padding: '22px 26px',
        borderRadius: 22,
        border: `1px solid ${rgba(T.main, 0.32)}`,
        background: `linear-gradient(120deg, ${rgba(T.main, 0.12)}, rgba(9,13,22,0.85) 62%)`,
        boxShadow: `0 30px 70px -40px rgba(0,0,0,0.9), 0 0 60px -30px ${rgba(T.main, 0.5)}`,
        opacity: clamp01(p * 1.3),
        transform: `translateY(${(1 - p) * 26}px) scale(${0.97 + p * 0.03})`,
      }}
    >
      <div
        style={{
          width: 74,
          height: 74,
          borderRadius: 16,
          border: `1px solid ${rgba(T.main, 0.55)}`,
          background: rgba(T.main, 0.12),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 42,
          fontWeight: 600,
          color: T.main,
          boxShadow: `inset 0 0 30px ${rgba(T.main, 0.25)}`,
        }}
      >
        {bit}
      </div>
      <div>
        <div style={{ fontSize: 27, fontWeight: 600, color: COL.ink, letterSpacing: '0.01em' }}>{label}</div>
        <div style={{ fontSize: 19, color: rgba(T.main, 0.85), marginTop: 4, letterSpacing: '0.02em' }}>{sub}</div>
      </div>
    </div>
  );
};

export const Sign: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const bits = ['0', '1', '0', '1'];
  const indices = ['3', '2', '1', '0'];
  const msbFocus = ramp(t, 2.7, 0.6);
  const bracket = ramp(t, 2.5, 0.7);
  const tileGlow = 0.85 * msbFocus + Math.sin(t * 2.2) * 0.06 * msbFocus;

  return (
    <AbsoluteFill style={{ padding: '0 140px' }}>
      <div style={{ position: 'absolute', top: 146, left: 140 }}>
        <Kicker chapter="01" label="The sign bit" at={0.1} />
      </div>

      <div style={{ position: 'absolute', top: 196, left: 140, width: 1180 }}>
        <Headline text="The leftmost bit decides the sign." at={0.3} size={62} weight={600} accent={['sign']} accentColor={COL.accent} stagger={0.055} />
      </div>

      {/* bit word */}
      <div
        style={{
          position: 'absolute',
          top: 452,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 22,
        }}
      >
        {bits.map((b, i) => {
          const isMsb = i === 0;
          const appear = pop(frame, fps, 1.1 + i * 0.09, { stiffness: 130 });
          const dim = isMsb ? 1 : 1 - 0.42 * msbFocus;
          return (
            <div key={i} style={{ opacity: dim }}>
              <Tile
                value={b}
                size={200}
                tone={isMsb ? 'accent' : 'neutral'}
                emphasis={isMsb ? tileGlow : 0.08}
                appear={appear}
                indexLabel={`${indices[i]}`}
                indexLabelTone={isMsb ? 'accent' : 'neutral'}
              />
            </div>
          );
        })}
      </div>

      {/* MSB callout */}
      <div
        style={{
          position: 'absolute',
          top: 352,
          left: 527,
          width: 200,
          opacity: clamp01(bracket * 1.4),
        }}
      >
        <div
          style={{
            textAlign: 'center',
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: TONE.accent.main,
            marginBottom: 8,
          }}
        >
          MSB
        </div>
        <div
          style={{
            height: 46,
            borderTop: `1px solid ${rgba(COL.accent, 0.65)}`,
            borderLeft: `1px solid ${rgba(COL.accent, 0.4)}`,
            borderRight: `1px solid ${rgba(COL.accent, 0.4)}`,
            borderRadius: '6px 6px 0 0',
            transform: `scaleX(${bracket})`,
            transformOrigin: 'center top',
            background: `linear-gradient(180deg, ${rgba(COL.accent, 0.14)}, rgba(0,0,0,0))`,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 430,
          left: 527 + 100 - 0.5,
          width: 1,
          height: 22,
          background: rgba(COL.accent, 0.5),
          opacity: clamp01((bracket - 0.4) * 1.6),
        }}
      />

      {/* rule cards */}
      <div
        style={{
          position: 'absolute',
          top: 786,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 34,
        }}
      >
        <RuleCard bit="0" label="MSB = 0  →  positive" sub="The value is read as it is" tone="pos" at={5.0} />
        <RuleCard bit="1" label="MSB = 1  →  negative" sub="The value is read as a negative number" tone="neg" at={5.45} />
      </div>
    </AbsoluteFill>
  );
};
