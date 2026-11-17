import React from 'react';
import { Composition } from 'remotion';
import { Film } from './film/Film';
import { DURATION_IN_FRAMES, FPS, H, W } from './film/timeline';

export const Root: React.FC = () => (
  <Composition
    id="TwoComplement"
    component={Film}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={W}
    height={H}
  />
);
