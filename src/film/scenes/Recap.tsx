import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { COL, TONE } from '../theme';
import { clamp01, pop, ramp } from '../motion';
import { rgba } from '../color';
import { Chip, Headline, Kicker } from '../ui';

const CARDS = [
  {
    n: '01',
    title: 'Flip every bit',
    visual: ['0101', '1010'],
    note: 'one’s complement',
    tone: 'neg' as const,
  },
  {
    n: '02',
    title: 'Add one',
    visual: ['1010 + 1', '1011'],
    note: 'binary addition',
    tone: 'carry' as const,
  },
  {
    n: '03',
    title: 'Read as negative',
    visual: ['1011', '−5'],
    note: 'sign bit is 1',
    tone: 'accent' as const,
  },
];

const Card: React.FC<{ card: (typeof CARDS)[number]; at: number; fade: number }> = ({ card, at, fade }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, at, { stiffness: 95 });
  const T = TONE[card.tone];
  return (
    <div
      style={{
        width: 452,
        padding: '30px 32px 34px 32px',
        borderRadius: 24,
        border: `1px solid ${rgba(T.main, 0.3)}`,
        background: `linear-gradient(150deg, ${rgba(T.main, 0.11)}, rgba(8,12,21,0.92) 58%)`,
        boxShadow: `0 40px 90px -50px rgba(0,0,0,0.95), 0 0 70px -40px ${rgba(T.main, 0.6)}`,
        opacity: clamp01(p * 1.3) * fade,
        transform: `translateY(${(1 - p) * 32 - (1 - fade) * 18}px)`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 15, letterSpacing: '0.3em', fontWeight: 600, color: rgba(T.main, 0.9) }}>{card.n}</div>
        <div style={{ width: 26, height: 2, background: rgba(T.main, 0.6) }} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: COL.ink, marginTop: 20, letterSpacing: '-0.01em' }}>
        {card.title}
      </div>
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            fontSize: 34,
            fontWeight: 500,
            letterSpacing: '0.02em',
            color: rgba(COL.ink, 0.4),
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {card.visual[0]}
        </div>
        <div style={{ fontSize: 26, color: rgba(T.main, 0.85), lineHeight: 1 }}>→</div>
        <div
          style={{
            fontSize: 34,
            fontWeight: 600,
            color: T.main,
            fontVariantNumeric: 'tabular-nums',
            textShadow: `0 0 30px ${rgba(T.main, 0.4)}`,
          }}
        >
          {card.visual[1]}
        </div>
      </div>
      <div style={{ marginTop: 20, fontSize: 16, letterSpacing: '0.16em', textTransform: 'uppercase', color: COL.faint }}>
        {card.note}
      </div>
    </div>
  );
};

export const Recap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const cardsFade = 1 - ramp(t, 4.6, 0.75);
  const lockup = pop(frame, fps, 5.1, { stiffness: 85 });
  const tagline = pop(frame, fps, 5.7, { stiffness: 90 });
  const rule = ramp(t, 5.4, 0.9);

  return (
    <AbsoluteFill style={{ padding: '0 140px' }}>
      <div style={{ position: 'absolute', top: 146, left: 140, opacity: cardsFade }}>
        <Kicker chapter="07" label="Recap" at={0.1} tone="pos" />
      </div>

      <div style={{ position: 'absolute', top: 196, left: 140, width: 1100, opacity: cardsFade }}>
        <Headline text="Three moves, every time." at={0.3} size={58} weight={600} accent={['moves']} accentColor={COL.pos} />
      </div>

      <div
        style={{
          position: 'absolute',
          top: 348,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 38,
        }}
      >
        {CARDS.map((card, i) => (
          <Card key={card.n} card={card} at={1.0 + i * 0.34} fade={cardsFade} />
        ))}
      </div>

      {/* final lockup */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: clamp01(lockup * 1.2),
          transform: `translateY(${(1 - lockup) * 30 - 60}px) scale(${0.96 + lockup * 0.04})`,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 1100,
            height: 520,
            marginLeft: -550,
            marginTop: -260,
            background: `radial-gradient(ellipse at center, ${rgba(COL.accent, 0.16)}, rgba(0,0,0,0) 68%)`,
            opacity: clamp01(lockup),
          }}
        />
        <div
          style={{
            fontSize: 132,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            lineHeight: 1,
            backgroundImage: `linear-gradient(96deg, #F4F7FF 8%, ${COL.accent} 54%, ${COL.pos} 98%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          TWO’S COMPLEMENT
        </div>
        <div
          style={{
            marginTop: 34,
            width: 420 * rule,
            height: 1,
            background: `linear-gradient(90deg, ${rgba(COL.pos, 0)}, ${rgba(COL.pos, 0.9)}, ${rgba(COL.pos, 0)})`,
          }}
        />
        <div
          style={{
            marginTop: 30,
            fontSize: 32,
            fontWeight: 400,
            letterSpacing: '0.02em',
            color: 'rgba(214,225,245,0.8)',
            opacity: clamp01(tagline * 1.3),
            transform: `translateY(${(1 - tagline) * 14}px)`,
          }}
        >
          flip · add one · done
        </div>
        <div style={{ marginTop: 44, opacity: clamp01((tagline - 0.5) * 2) }}>
          <Chip tone="pos" size={14}>
            four bits · −8 to +7
          </Chip>
        </div>
      </div>
    </AbsoluteFill>
  );
};
