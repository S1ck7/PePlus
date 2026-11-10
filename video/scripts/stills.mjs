// Renders sample frames of a composition into out/stills/ for visual QA.  node scripts/stills.mjs Ad16x9 aoede 10,60,...
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const [id = 'Ad16x9', voice = 'aoede', framesArg] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const comp = await selectComposition({ serveUrl, id, inputProps: { voice } });
const frames = framesArg ? framesArg.split(',').map(Number) : Array.from({ length: 16 }, (_, i) => Math.round((comp.durationInFrames - 1) * i / 15));
mkdirSync('out/stills', { recursive: true });
for (const frame of frames) {
  await renderStill({ composition: comp, serveUrl, frame, output: `out/stills/${id}-${String(frame).padStart(4, '0')}.png`, inputProps: { voice }, scale: 0.5 });
  process.stdout.write(frame + ' ');
}
console.log('\nframes', comp.durationInFrames);
