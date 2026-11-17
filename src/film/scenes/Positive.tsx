import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COL, TONE } from '../theme';
import { clamp01, pop, ramp } from '../motion';
import { rgba } from '../color';
import { Chip, Headline, Kicker, Tile, ValueBadge } from '../ui';

const BITS = ['0', '1', '0', '1'];
const PLACE = [8, 4, 2, 1];
const INDEX = [3, 2, 1, 0];
const SIZE = 190;
const GAP = 22;
const ROW_W = BITS.length * SIZE + (BITS.length - 1) * GAP;
const ROW_LEFT = (1920 - ROW_W) / 2;

export const Positive: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const highlight = ramp(t, 2.6, 0.6);
  const sign = ramp(t, 5.0, 0.5);

  return (
    <AbsoluteFill style={{ padding: '0 140px' }}>
      <div style={{ position: 'absolute', top: 146, left: 140 }}>
        <Kicker chapter="02" label="A positive number" at={0.1} tone="pos" />
      </div>

      <div style={{ position: 'absolute', top: 196, left: 140, width: 1000 }}>
        <Headline text="+5 in four bits." at={0.3} size={62} weight={600} accent={['+5']} accentColor={COL.pos} />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 206,
          right: 140,
          opacity: clamp01((sign - 0) * 1.4),
          transform: `translateY(${(1 - sign) * 14}px)`,
        }}
      >
        <Chip tone="pos" solid size={17}>
          sign bit = 0 · positive
        </Chip>
      </div>

      {/* place values */}
      <div style={{ position: 'absolute', top: 366, left: ROW_LEFT, display: 'flex', gap: GAP }}>
        {PLACE.map((p, i) => {
          const pp = pop(frame, fps, 1.0 + i * 0.08, { stiffness: 120 });
          const on = BITS[i] === '1';
          return (
            <div
              key={i}
              style={{
                width: SIZE,
                textAlign: 'center',
                fontSize: 34,
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                color: on ? TONE.pos.main : COL.faint,
                opacity: clamp01(pp) * (on ? 0.6 + 0.4 * highlight : 0.75),
                transform: `translateY(${(1 - pp) * -18}px)`,
                textShadow: on ? `0 0 30px ${rgba(COL.pos, 0.6 * highlight)}` : undefined,
              }}
            >
              {p}
            </div>
          );
        })}
      </div>

      {/* tiles */}
      <div style={{ position: 'absolute', top: 450, left: ROW_LEFT, display: 'flex', gap: GAP }}>
        {BITS.map((b, i) => {
          const on = b === '1';
          const appear = pop(frame, fps, 1.5 + i * 0.09, { stiffness: 130 });
          const emph = on ? 0.75 * highlight + 0.1 : 0.06 * (1 - highlight);
          return (
            <Tile
              key={i}
              value={b}
              size={SIZE}
              tone={on ? 'pos' : 'neutral'}
              emphasis={emph}
              appear={appear}
              indexLabel={`${INDEX[i]}`}
              indexLabelTone={on ? 'pos' : 'neutral'}
            />
          );
        })}
      </div>

      {/* contributions */}
      <div style={{ position: 'absolute', top: 726, left: ROW_LEFT, display: 'flex', gap: GAP }}>
        {BITS.map((b, i) => {
          const val = b === '1' ? PLACE[i] : 0;
          const p = pop(frame, fps, 3.0 + i * 0.1, { stiffness: 120 });
          return (
            <div
              key={i}
              style={{
                width: SIZE,
                textAlign: 'center',
                fontSize: 32,
                fontWeight: 500,
                color: val ? TONE.pos.main : rgba(COL.dim, 0.45),
                opacity: clamp01(p),
                fontVariantNumeric: 'tabular-nums',
                textShadow: val ? `0 0 26px ${rgba(COL.pos, 0.55)}` : undefined,
              }}
            >
              {val}
            </div>
          );
        })}
      </div>

      {/* equation */}
      <div
        style={{
          position: 'absolute',
          top: 806,
          left: 0,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
        }}
      >
        {[
          { t: '4', kind: 'num' },
          { t: '+', kind: 'op' },
          { t: '1', kind: 'num' },
          { t: '=', kind: 'op' },
          { t: '5', kind: 'num' },
        ].map((item, i) => {
          const p = pop(frame, fps, 3.9 + i * 0.14, { stiffness: 130 });
          return (
            <div
              key={i}
              style={{
                fontSize: item.kind === 'num' ? 48 : 40,
                fontWeight: item.kind === 'num' ? 600 : 400,
                color: item.kind === 'num' ? COL.ink : COL.faint,
                opacity: clamp01(p),
                transform: `translateY(${(1 - p) * 12}px)`,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {item.t}
            </div>
          );
        })}
        <div style={{ width: 2, height: 48, background: rgba(COL.dim, 0.25), margin: '0 18px' }} />
        <ValueBadge tone="pos" at={5.5} size={92}>
          +5
        </ValueBadge>
      </div>
    </AbsoluteFill>
  );
};
