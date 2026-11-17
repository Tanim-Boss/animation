import React from 'react';
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from 'remotion';
import { COL, TONE } from '../theme';
import { clamp01, pop, ramp } from '../motion';
import { rgba } from '../color';
import { Chip, Headline, Kicker, Meta, Tile } from '../ui';

const BEFORE = ['0', '1', '0', '1'];
const AFTER = ['1', '0', '1', '0'];
const SIZE = 205;
const GAP = 24;
const ROW_W = BEFORE.length * SIZE + (BEFORE.length - 1) * GAP;
const ROW_LEFT = (1920 - ROW_W) / 2;
const FLIP_START = 2.25;
const FLIP_STAGGER = 0.34;
const FLIP_DUR = 0.62;

export const Flip: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const result = ramp(t, 5.1, 0.6);
  const notOp = pop(frame, fps, 1.5, { stiffness: 110 });

  return (
    <AbsoluteFill style={{ padding: '0 140px' }}>
      <div style={{ position: 'absolute', top: 146, left: 140 }}>
        <Kicker chapter="03" label="Step 1 · flip every bit" at={0.1} tone="neg" />
      </div>

      <div style={{ position: 'absolute', top: 196, left: 140, width: 1100 }}>
        <Headline text="Flip every bit." at={0.3} size={62} weight={600} accent={['Flip']} accentColor={COL.neg} />
      </div>

      {/* NOT operator */}
      <div
        style={{
          position: 'absolute',
          top: 500,
          left: ROW_LEFT - 128,
          opacity: clamp01(notOp * 1.3),
          transform: `translateX(${(1 - notOp) * -20}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 300,
            lineHeight: 0.8,
            color: COL.accent,
            textShadow: `0 0 40px ${rgba(COL.accent, 0.5)}`,
          }}
        >
          ~
        </div>
        <div style={{ fontSize: 13, letterSpacing: '0.3em', color: COL.faint, fontWeight: 600 }}>NOT</div>
      </div>

      <div style={{ position: 'absolute', top: 450, left: ROW_LEFT, display: 'flex', gap: GAP }}>
        {BEFORE.map((b, i) => {
          const start = FLIP_START + i * FLIP_STAGGER;
          const raw = clamp01((t - start) / FLIP_DUR);
          const fp = Easing.inOut(Easing.cubic)(raw);
          const done = raw > 0.5;
          const ringP = clamp01((t - start - 0.2) / 0.75);
          const appear = pop(frame, fps, 1.1 + i * 0.07, { stiffness: 130 });
          return (
            <div key={i} style={{ position: 'relative', width: SIZE, height: SIZE }}>
              <div
                style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: SIZE * 0.16 + 4,
                  border: `1px solid ${rgba(COL.neg, 0.55)}`,
                  opacity: ringP > 0 && ringP < 1 ? (1 - ringP) * 0.55 : 0,
                  transform: `scale(${1 + ringP * 0.22})`,
                }}
              />
              <Tile
                value={AFTER[i]}
                from={b}
                flip={fp}
                size={SIZE}
                tone={done ? 'neg' : 'neutral'}
                emphasis={done ? 0.55 : 0.1 + Math.sin(t * 3 + i) * 0.03}
                appear={appear}
                indexLabel={`${3 - i}`}
                indexLabelTone={done ? 'neg' : 'neutral'}
              />
            </div>
          );
        })}
      </div>

      {/* result readout */}
      <div
        style={{
          position: 'absolute',
          top: 762,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          opacity: clamp01(result * 1.3),
          transform: `translateY(${(1 - result) * 18}px)`,
        }}
      >
        <Chip tone="neg" solid size={18}>
          1&apos;s complement
        </Chip>
        <Meta at={5.5} style={{ letterSpacing: '0.22em', color: rgba(COL.dim, 0.9) }}>
          0101 → 1010 · every bit inverted
        </Meta>
      </div>

    </AbsoluteFill>
  );
};
