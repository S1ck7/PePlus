// Generates the voice-over (edge-tts), sound effects and music pad (ffmpeg), and src/timeline.json.
// Run: npm run voice   (needs python -m edge_tts and ffmpeg on PATH; no human input)
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

// text = what the line says; say = spelling fed to the voice ("PePlus" is read "P.E. Plus" otherwise;
// "Pay Plus" was the only spelling a speech-to-text check heard as one clear name, with both voices).
const LINES = [
  'Cinci credite, cinci bănci. Care te costă cel mai mult?',
  'PePlus îți adună datoriile și îți arată costul real.',
  'Îți spune ce să plătești întâi, și cât.',
  'Îți găsește o bancă mai ieftină.',
  'Cu planul PePlus, Radu scapă de datorii în 2035, nu în 2054.',
  'PePlus. Toate datoriile. Un singur plan.',
].map(text => ({ text, say: text.replaceAll('PePlus', 'Pe Plus') }));
// aoede: Gemini TTS (natural, D-048), recorded once with scripts/tts_gemini.py + split_vo.py into vo-src/ (free tier: ~10 requests/day).
// alina: Edge neural voice, regenerated on every run (alternate).
const VOICES = { aoede: { src: 'vo-src/aoede' }, alina: 'ro-RO-AlinaNeural' };
const TEMPO = 1.13; // the Gemini take is a calm read; 13% faster fits the 20 s cut without sounding rushed
const LEAD = 0.4;  // silence before the first line
const GAP = 0.3;   // breath between lines (20-second cut)
const TAIL = 1.4;  // end card hold after the last line

const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const ff = args => run('ffmpeg', ['-v', 'error', '-y', ...args]);
const duration = f => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim());

mkdirSync('public/vo', { recursive: true });
mkdirSync('public/sfx', { recursive: true });

const timeline = {};
for (const [id, voice] of Object.entries(VOICES)) {
  let t = LEAD;
  const lines = [];
  LINES.forEach(({ text, say }, i) => {
    const mp3 = `public/vo/${id}-${i + 1}.mp3`;
    const wav = `public/vo/${id}-${i + 1}.wav`;
    if (typeof voice === 'string') run('python', ['-m', 'edge_tts', '--voice', voice, '--rate=+16%', '--text', say, '--write-media', mp3]);
    else ff(['-i', `${voice.src}-${i + 1}.wav`, '-af', `atempo=${TEMPO}`, mp3]);
    // Trim the leading/trailing silence edge-tts adds, so the timeline is exact.
    ff(['-i', mp3, '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5', '-ar', '48000', wav]);
    rmSync(mp3);
    const dur = duration(wav);
    lines.push({ text, file: `vo/${id}-${i + 1}.wav`, start: +t.toFixed(3), dur: +dur.toFixed(3) });
    t += dur + GAP;
  });
  const last = lines[lines.length - 1];
  timeline[id] = { lines, total: +(last.start + last.dur + TAIL).toFixed(3) };
  console.log(id, 'total', timeline[id].total, 's');
}
writeFileSync('src/timeline.json', JSON.stringify(timeline, null, 2) + '\n');

// Sound design, synthesized (no licensed assets).
const synth = (name, expr, d, filters = 'anull') =>
  ff(['-f', 'lavfi', '-i', `aevalsrc='${expr}':s=48000:d=${d}`, '-af', filters, `public/sfx/${name}.wav`]);
synth('boom', '0.9*sin(2*PI*(46+70*exp(-9*t))*t)*exp(-3.2*t)', 1.6, 'lowpass=f=400,volume=1.4');
synth('pop', '0.55*sin(2*PI*t*(380+900*exp(-28*t)))*exp(-26*t)', 0.18, 'lowpass=f=5000');
synth('tick', '0.35*sin(2*PI*1900*t)*exp(-110*t)', 0.06);
synth('ding', '0.32*sin(2*PI*1318.5*t)*exp(-7*t)+0.24*sin(2*PI*1975.5*t)*exp(-9*(t-0.08))*gt(t,0.08)', 0.9, 'aecho=0.8:0.6:60:0.25');
synth('chime', '0.22*(sin(2*PI*587.33*t)*exp(-3*t)+gt(t,0.12)*sin(2*PI*739.99*t)*exp(-3*(t-0.12))+gt(t,0.24)*sin(2*PI*880*t)*exp(-3*(t-0.24))+gt(t,0.36)*sin(2*PI*1174.66*t)*exp(-2.5*(t-0.36)))', 2.4, 'aecho=0.8:0.7:90|180:0.3|0.2');
ff(['-f', 'lavfi', '-i', 'anoisesrc=d=0.7:c=pink:a=0.5', '-af', 'highpass=f=500,lowpass=f=4000,afade=t=in:d=0.35,afade=t=out:st=0.35:d=0.35,volume=0.6', 'public/sfx/whoosh.wav']);
// Ambient pad: soft D major 9 chord with slow movement.
const pad = [146.83, 220, 293.66, 369.99, 440, 659.25]
  .map((f, i) => `${(0.05 - i * 0.005).toFixed(3)}*sin(2*PI*${f}*t+${i}*sin(0.3*t))*(0.75+0.25*sin(2*PI*${(0.07 + i * 0.03).toFixed(2)}*t))`)
  .join('+');
synth('pad', pad, 34, 'lowpass=f=1800,aecho=0.8:0.7:120|240:0.35|0.25,afade=t=in:d=2,afade=t=out:st=31:d=3,volume=1.6');
console.log('sfx ok');
