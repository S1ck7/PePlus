// Renders the ad MP4s into out/. Run: npm run render  (after npm run voice)
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { renameSync } from 'node:fs';
const only = process.argv[2]; // optional: render only outputs whose name contains this
const jobs = [
  { id: 'Ad16x9', voice: 'aoede', out: 'out/ad-16x9.mp4' },
  { id: 'Ad9x16', voice: 'aoede', out: 'out/ad-9x16.mp4' },
  { id: 'Ad16x9', voice: 'alina', out: 'out/alt/ad-16x9-alina.mp4' },
  { id: 'Ad9x16', voice: 'alina', out: 'out/alt/ad-9x16-alina.mp4' },
  { id: 'DemoBackup', voice: 'aoede', out: 'out/demo-backup.mp4' },
  { id: 'Ad9x16', voice: 'aoede', captions: true, out: 'out/alt/ad-9x16-captions.mp4' },
].filter(j => !only || j.out.includes(only));
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
for (const j of jobs) {
  const composition = await selectComposition({ serveUrl, id: j.id, inputProps: { voice: j.voice, captions: !!j.captions } });
  const t = Date.now();
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: j.out, inputProps: { voice: j.voice, captions: !!j.captions },
    crf: 16, pixelFormat: 'yuv420p', audioBitrate: '192k', concurrency: 4, muted: j.id === 'DemoBackup',
  });
  if (j.id !== 'DemoBackup') {
    // Peak limiter at about -1.5 dBFS (voice + boom can touch 0 dB); the video stream is copied untouched.
    const tmp = j.out.replace('.mp4', '.tmp.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', j.out, '-c:v', 'copy', '-af', 'alimiter=limit=0.84:attack=2:release=60:level=disabled', '-c:a', 'aac', '-b:a', '192k', tmp]);
    renameSync(tmp, j.out);
  }
  console.log(j.out, ((Date.now() - t) / 1000).toFixed(0) + 's');
}
