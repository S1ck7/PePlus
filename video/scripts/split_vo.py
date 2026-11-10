# Splits one Gemini TTS take of the whole ad script into its lines at the longest pauses.
# python scripts/split_vo.py <full.wav> <outPrefix> <lineCount>   -> <outPrefix>-1.wav ... (silence trimmed later by voice.mjs)
import re, subprocess, sys

src, prefix, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
log = subprocess.run(['ffmpeg', '-v', 'info', '-i', src, '-af', 'silencedetect=noise=-40dB:d=0.25', '-f', 'null', '-'],
                     capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', log)]
ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', log)]
gaps = [(e - s, s, e) for s, e in zip(starts, ends) if s > 0.05]  # skip leading silence
total = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src],
                             capture_output=True, text=True).stdout)
gaps = [g for g in gaps if g[2] < total - 0.05]  # skip trailing silence
if len(gaps) < n - 1: raise SystemExit(f'only {len(gaps)} pauses found, need {n - 1}')
cuts = sorted(gaps, reverse=True)[:n - 1]
cuts = sorted((s + e) / 2 for _, s, e in cuts)
bounds = [0.0] + cuts + [total]
for i in range(n):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ss', f'{bounds[i]:.3f}', '-to', f'{bounds[i + 1]:.3f}', f'{prefix}-{i + 1}.wav'], check=True)
    print(f'{prefix}-{i + 1}.wav {bounds[i]:.2f}-{bounds[i + 1]:.2f}')
