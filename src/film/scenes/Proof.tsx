import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COL, TONE } from '../theme';
import { clamp01, pop, ramp } from '../motion';
import { rgba } from '../color';
import { Chip, Headline, Kicker, Meta, Tile, ValueBadge } from '../ui';

const SIZE = 138;
const GAP = 16;
const STEP = SIZE + GAP;
const LSB_CENTER = 1162;
const COL_CENTERS = [0, 1, 2, 3].map((i) => LSB_CENTER - i * STEP);
const OPERAND_LEFT = COL_CENTERS[3] - SIZE / 2;
const CARRY_CENTER = COL_CENTERS[3] - STEP;

const A = ['0', '1', '0', '1'];
const B = ['1', '0', '1', '1'];
const R = ['0', '0', '0', '0'];

const ROW_A = 320;
const ROW_B = 470;
const RULE_Y = 622;
const ROW_R = 652;

export const Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const rule = ramp(t, 2.8, 0.5);
  const carryOut = pop(frame, fps, 4.75, { stiffness: 130 });
  const discard = ramp(t, 6.4, 0.7);
  const zeroBadge = pop(frame, fps, 7.3, { stiffness: 120 });
  const statement = pop(frame, fps, 8.2, { stiffness: 100 });

  // travelling carry dot: LSB -> carry-out column
  const travelStart = 3.3;
  const travelEnd = 4.75;
  const travel = clamp01((t - travelStart) / (travelEnd - travelStart));
  const dotX = LSB_CENTER + (CARRY_CENTER - LSB_CENTER) * travel;
  const dotVisible = t >= travelStart && t <= travelEnd + 0.12;

  return (
    <AbsoluteFill style={{ padding: '0 140px' }}>
      <div style={{ position: 'absolute', top: 146, left: 140 }}>
        <Kicker chapter="05" label="Why it works" at={0.1} />
      </div>

      <div style={{ position: 'absolute', top: 196, left: 140, width: 1100 }}>
        <Headline text="Add them together." at={0.3} size={62} weight={600} accent={['together']} accentColor={COL.accent} />
      </div>

      {/* operand labels */}
      <div
        style={{
          position: 'absolute',
          top: ROW_A + 34,
          left: OPERAND_LEFT - 96,
          width: 84,
          textAlign: 'right',
          fontSize: 30,
          fontWeight: 500,
          color: TONE.pos.main,
          opacity: clamp01(pop(frame, fps, 1.5) * 1.3),
        }}
      >
        +5
      </div>
      <div
        style={{
          position: 'absolute',
          top: ROW_B + 34,
          left: OPERAND_LEFT - 96,
          width: 84,
          textAlign: 'right',
          fontSize: 30,
          fontWeight: 500,
          color: TONE.neg.main,
          opacity: clamp01(pop(frame, fps, 2.1) * 1.3),
        }}
      >
        −5
      </div>

      {/* row A */}
      <div style={{ position: 'absolute', top: ROW_A, left: OPERAND_LEFT, display: 'flex', gap: GAP }}>
        {A.map((b, i) => (
          <Tile
            key={i}
            value={b}
            size={SIZE}
            tone="pos"
            emphasis={0.14}
            appear={pop(frame, fps, 1.2 + i * 0.06, { stiffness: 130 })}
            shadow={false}
          />
        ))}
      </div>

      {/* row B */}
      <div style={{ position: 'absolute', top: ROW_B, left: OPERAND_LEFT, display: 'flex', gap: GAP }}>
        {B.map((b, i) => (
          <Tile
            key={i}
            value={b}
            size={SIZE}
            tone="neg"
            emphasis={0.14}
            appear={pop(frame, fps, 1.9 + i * 0.06, { stiffness: 130 })}
            shadow={false}
          />
        ))}
      </div>

      {/* rule */}
      <div
        style={{
          position: 'absolute',
          top: RULE_Y,
          left: CARRY_CENTER - SIZE / 2 - 8,
          width: STEP * 4 + SIZE + 16,
          height: 1,
          background: `linear-gradient(90deg, ${rgba(COL.dim, 0)}, ${rgba(COL.dim, 0.6)} 12%, ${rgba(COL.dim, 0.6)} 88%, ${rgba(COL.dim, 0)})`,
          transform: `scaleX(${rule})`,
          transformOrigin: 'right',
        }}
      />

      {/* travelling carry */}
      {dotVisible ? (
        <div
          style={{
            position: 'absolute',
            top: RULE_Y - 18,
            left: dotX - 7,
            width: 14,
            height: 14,
            borderRadius: 99,
            background: COL.carry,
            boxShadow: `0 0 24px 6px ${rgba(COL.carry, 0.6)}`,
            opacity: 0.95,
          }}
        />
      ) : null}

      {/* result */}
      <div style={{ position: 'absolute', top: ROW_R, left: CARRY_CENTER - SIZE / 2, display: 'flex', gap: GAP }}>
        {/* carry-out bit */}
        <div
          style={{
            position: 'relative',
            opacity: clamp01(carryOut) * (1 - discard * 0.98),
            transform: `translateY(${-54 * discard}px) scale(${1 - discard * 0.12})`,
          }}
        >

          <Tile
            value="1"
            size={SIZE}
            tone="carry"
            emphasis={0.85}
            appear={carryOut}
            shadow={false}
          />
          <div
            style={{
              position: 'absolute',
              top: 48,
              left: -172,
              width: 150,
              textAlign: 'right',
              fontSize: 13,
              letterSpacing: '0.26em',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: TONE.carry.main,
              opacity: clamp01((carryOut - 0.6) * 3) * (1 - discard * 1.6),
            }}
          >
            carry out
          </div>
        </div>

        {R.map((b, i) => {
          const at = 3.35 + (3 - i) * 0.32;
          return (
            <Tile
              key={i}
              value={b}
              size={SIZE}
              tone="neutral"
              emphasis={0.12 + (t > at ? 0.1 : 0)}
              appear={pop(frame, fps, at, { stiffness: 140 })}
              shadow={false}
            />
          );
        })}
      </div>

      {/* empty slot left behind */}
      <div
        style={{
          position: 'absolute',
          top: ROW_R,
          left: CARRY_CENTER - SIZE / 2,
          width: SIZE,
          height: SIZE,
          borderRadius: SIZE * 0.16,
          border: `1.5px dashed ${rgba(COL.faint, 0.6)}`,
          background: rgba(COL.faint, 0.05),
          opacity: discard,
        }}
      />

      {/* discard mark */}
      <div
        style={{
          position: 'absolute',
          top: ROW_R + SIZE + 18,
          left: CARRY_CENTER - 120,
          width: 240,
          textAlign: 'center',
          opacity: clamp01((discard - 0.35) * 1.8),
        }}
      >
        <div style={{ fontSize: 14, letterSpacing: '0.26em', fontWeight: 600, color: COL.faint, textTransform: 'uppercase' }}>
          discarded
        </div>
      </div>

      {/* result badge */}
      <div
        style={{
          position: 'absolute',
          top: ROW_R + 18,
          left: 1310,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          opacity: clamp01(zeroBadge * 1.2),
          transform: `translateX(${(1 - zeroBadge) * 26}px)`,
        }}
      >
        <ValueBadge tone="accent" size={104}>
          = 0
        </ValueBadge>
        <div style={{ fontSize: 16, letterSpacing: '0.2em', color: COL.faint, textTransform: 'uppercase', paddingLeft: 6 }}>
          five bits, keep four
        </div>
      </div>

      {/* statement */}
      <div
        style={{
          position: 'absolute',
          top: 858,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: clamp01(statement * 1.2),
          transform: `translateY(${(1 - statement) * 14}px)`,
        }}
      >
        <Chip tone="accent" size={17} solid>
          a + (−a) = 0
        </Chip>
      </div>
    </AbsoluteFill>
  );
};
