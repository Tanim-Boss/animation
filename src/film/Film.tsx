import React from 'react';
import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from 'remotion';
import './fonts';
import { Background } from './Background';
import { Chrome } from './Chrome';
import { Captions } from './Captions';
import { COL, FONT, FPS } from './theme';
import { DURATION_IN_FRAMES, SCENES } from './timeline';
import audioState from '../../data/audio.json';
import { Open } from './scenes/Open';
import { Sign } from './scenes/Sign';
import { Positive } from './scenes/Positive';
import { Flip } from './scenes/Flip';
import { AddOne } from './scenes/AddOne';
import { Proof } from './scenes/Proof';
import { Range } from './scenes/Range';
import { Recap } from './scenes/Recap';
import { Sequence } from 'remotion';

const TONES: Record<string, string> = {
  open: COL.accent,
  sign: COL.accent,
  positive: COL.pos,
  flip: COL.neg,
  addone: COL.carry,
  proof: COL.accent,
  range: COL.ink,
  recap: COL.pos,
};

const REGISTRY: Record<string, React.FC> = {
  open: Open,
  sign: Sign,
  positive: Positive,
  flip: Flip,
  addone: AddOne,
  proof: Proof,
  range: Range,
  recap: Recap,
};

const SceneView: React.FC<{ id: string }> = ({ id }) => {
  const Comp = REGISTRY[id] ?? Open;
  return <Comp />;
};

const master = (audioState as { master: string | null }).master;

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const active = SCENES.find((s) => t >= s.start && t < s.start + s.dur) ?? SCENES[0];

  return (
    <AbsoluteFill style={{ backgroundColor: COL.bg0, fontFamily: FONT, color: COL.ink, overflow: 'hidden' }}>
      <Background t={t} rain={active.id === 'open' ? 1 : 0.16} warmth={active.id === 'flip' || active.id === 'addone' ? 0.6 : 0} />

      {SCENES.map((scene) => {
        const Comp = REGISTRY[scene.id];
        if (!Comp) return null;
        return (
          <Sequence
            key={scene.id}
            from={Math.round(scene.start * FPS)}
            durationInFrames={Math.round(scene.dur * FPS)}
            name={scene.id}
          >
            <Comp />
            <Captions scene={scene} tone={TONES[scene.id] ?? COL.accent} />
          </Sequence>
        );
      })}

      <AbsoluteFill
        style={{
          background: 'linear-gradient(180deg, rgba(4,6,12,0) 58%, rgba(4,6,12,0.55) 82%, rgba(4,6,12,0.8) 100%)',
          pointerEvents: 'none',
        }}
      />

      <Chrome />

      <AbsoluteFill
        style={{
          background: '#04060C',
          opacity: interpolate(frame, [DURATION_IN_FRAMES - 22, DURATION_IN_FRAMES - 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          pointerEvents: 'none',
        }}
      />

      {master ? <Audio src={staticFile(master)} /> : null}
    </AbsoluteFill>
  );
};
