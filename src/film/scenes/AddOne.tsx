import React from 'react';
import { AbsoluteFill, Easing, useCurrentFrame, useVideoConfig } from 'remotion';
import { COL, TONE } from '../theme';
import { clamp01, pop, ramp } from '../motion';
import { rgba } from '../color';
import { Chip, Headline, Kicker, Meta, Tile, ValueBadge } from '../ui';

const SIZE = 168;
const GAP = 20;
const COLS = 4;
const ROW_W = COLS * SIZE + (COLS - 1) * GAP;
const LEFT = (1920 - ROW_W) / 2;
const ROW_A = 372;
const RULE_Y = 604;
const ROW_R = 636;
const LSB_CENTER = LEFT + ROW_W - SIZE / 2;
const PLUS_X = LEFT + ROW_W + 54;
const ONE_X = PLUS_X + 52;

const A = ['1', '0', '1', '0'];
const R = ['1', '0', '1', '1'];

export const AddOne: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const rule = ramp(t, 3.0, 0.5);
  const lsbRaw = clamp01((t - 4.0) / 0.6);
  const lsbFlip = Easing.inOut(Easing.cubic)(lsbRaw);
  const lsbDone = lsbRaw > 0.5;
  const badge = pop(frame, fps, 5.1, { stiffness: 110 });
  const pulse = clamp01((t - 4.35) / 0.95);
  const arrow = ramp(t, 2.7, 0.6);

  return (
    <AbsoluteFill style={{ padding: '0 140px' }}>
      <div style={{ position: 'absolute', top: 146, left: 140 }}>
        <Kicker chapter="04" label="Step 2 · add one" at={0.1} tone="carry" />
      </div>

      <div style={{ position: 'absolute', top: 196, left: 140, width: 1100 }}>
        <Headline text="Then add one." at={0.3} size={62} weight={600} accent={['one']} accentColor={COL.carry} />
      </div>

      {/* operator label */}
      <div
        style={{
          position: 'absolute',
          top: 316,
          left: LEFT,
          opacity: clamp01(pop(frame, fps, 1.1) * 1.3),
        }}
      >
        <Chip tone="neg" size={13} style={{ padding: '6px 12px' }}>
          1&apos;s complement
        </Chip>
      </div>

      {/* operand row */}
      <div style={{ position: 'absolute', top: ROW_A, left: LEFT, display: 'flex', gap: GAP }}>
        {A.map((b, i) => (
          <Tile
            key={i}
            value={b}
            size={SIZE}
            tone="neg"
            emphasis={0.24}
            appear={pop(frame, fps, 1.2 + i * 0.07, { stiffness: 130 })}
            indexLabel={`${3 - i}`}
            indexLabelTone="neg"
          />
        ))}
      </div>

      {/* +1 block */}
      <div
        style={{
          position: 'absolute',
          top: ROW_A,
          left: PLUS_X,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          opacity: clamp01(pop(frame, fps, 2.1, { stiffness: 120 }) * 1.3),
        }}
      >
        <div style={{ fontSize: 50, fontWeight: 300, color: COL.carry }}>+</div>
        <Tile
          value="1"
          size={SIZE}
          tone="carry"
          emphasis={0.55 + Math.sin(t * 3.4) * 0.07}
          appear={pop(frame, fps, 2.1, { stiffness: 150 })}
        />
      </div>

      {/* rule */}
      <div
        style={{
          position: 'absolute',
          top: RULE_Y,
          left: LEFT - 10,
          width: ROW_W + 20,
          height: 1,
          background: `linear-gradient(90deg, ${rgba(COL.dim, 0)}, ${rgba(COL.dim, 0.55)} 10%, ${rgba(COL.dim, 0.55)} 90%, ${rgba(COL.dim, 0)})`,
          transform: `scaleX(${rule})`,
        }}
      />

      {/* result row */}
      <div style={{ position: 'absolute', top: ROW_R, left: LEFT, display: 'flex', gap: GAP }}>
        {R.map((b, i) => {
          const isLsb = i === 3;
          return (
            <div key={i} style={{ position: 'relative' }}>
              {isLsb ? (
                <div
                  style={{
                    position: 'absolute',
                    inset: -7,
                    borderRadius: SIZE * 0.16 + 7,
                    border: `1.5px solid ${rgba(COL.carry, 0.85)}`,
                    opacity: pulse > 0 && pulse < 1 ? (1 - pulse) * 0.85 : 0,
                    transform: `scale(${1 + pulse * 0.22})`,
                  }}
                />
              ) : null}
              <Tile
                value={b}
                from={isLsb ? '0' : b}
                flip={isLsb ? lsbFlip : 0}
                size={SIZE}
                tone={isLsb ? 'carry' : 'neg'}
                emphasis={isLsb ? (lsbDone ? 0.8 : 0.18) : 0.42}
                appear={isLsb ? 1 : pop(frame, fps, 3.3 + i * 0.07, { stiffness: 130 })}
              />
            </div>
          );
        })}
      </div>

      {/* result badge */}
      <div
        style={{
          position: 'absolute',
          top: ROW_R + 46,
          left: LEFT + ROW_W + 74,
          opacity: clamp01(badge * 1.2),
          transform: `translateX(${(1 - badge) * 26}px)`,
        }}
      >
        <ValueBadge tone="neg" size={104}>
          −5
        </ValueBadge>
      </div>

      {/* signed place values under the result */}
      <div style={{ position: 'absolute', top: 818, left: LEFT, display: 'flex', gap: GAP }}>
        {['−8', '4', '2', '1'].map((w, i) => {
          const p = pop(frame, fps, 6.35 + i * 0.11, { stiffness: 120 });
          const signed = i === 0;
          return (
            <div
              key={i}
              style={{
                width: SIZE,
                textAlign: 'center',
                fontSize: signed ? 32 : 27,
                fontWeight: signed ? 600 : 500,
                color: signed ? TONE.neg.main : COL.faint,
                opacity: clamp01(p) * (signed ? 1 : 0.85),
                transform: `translateY(${(1 - p) * 10}px)`,
                fontVariantNumeric: 'tabular-nums',
                textShadow: signed ? `0 0 24px ${rgba(COL.neg, 0.6)}` : undefined,
              }}
            >
              {w}
            </div>
          );
        })}
      </div>

    </AbsoluteFill>
  );
};
