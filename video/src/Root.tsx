import React from 'react';
import { Composition } from 'remotion';
import { Ad, FPS, Voice, marks } from './Ad';
import { BACKUP_SECONDS, Backup } from './Backup';

const formats = [
  { id: 'Ad16x9', width: 1920, height: 1080 },
  { id: 'Ad9x16', width: 1080, height: 1920 },
];

export const Root: React.FC = () => (
  <>
    {formats.map(f => (
      <Composition
        key={f.id}
        id={f.id}
        component={Ad}
        width={f.width}
        height={f.height}
        fps={FPS}
        durationInFrames={marks('aoede').total}
        defaultProps={{ voice: 'aoede' as Voice }}
        calculateMetadata={({ props }) => ({ durationInFrames: marks(props.voice).total })}
      />
    ))}
    <Composition id="DemoBackup" component={Backup} width={1920} height={1080} fps={FPS} durationInFrames={Math.round(BACKUP_SECONDS * FPS)} />
  </>
);
