# Word timings for captions: faster-whisper word timestamps on each voice line, mapped onto the script words.
# Run: python scripts/words.py  -> src/words.json   (after npm run voice)
import json, re, subprocess, numpy as np
from faster_whisper import WhisperModel

tl = json.load(open('src/timeline.json', encoding='utf8'))
model = WhisperModel('small', device='cpu', compute_type='int8')
out = {}
for voice, data in tl.items():
    lines = []
    for l in data['lines']:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'public/' + l['file'], '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
        segs, _ = model.transcribe(np.frombuffer(raw, np.float32), word_timestamps=True, language='ro', beam_size=5)
        heard = [w for s in segs for w in s.words]
        words = l['text'].split()
        if len(heard) == len(words):
            times = [(w.start, w.end) for w in heard]
        else:  # counts differ ("PePlus" heard as "Pay plus"): map by character position along the heard words
            hl = [max(1, len(w.word.strip())) for w in heard]; H = sum(hl)
            def at(frac):
                c = frac * H; acc = 0
                for w, n in zip(heard, hl):
                    if acc + n >= c: return w.start + (w.end - w.start) * (c - acc) / n
                    acc += n
                return heard[-1].end
            sl = [len(w) for w in words]; T = sum(sl); acc = 0; times = []
            for n in sl: times.append((at(acc / T), at((acc + n) / T))); acc += n
        lines.append([{'w': w, 's': round(l['start'] + a, 3), 'e': round(l['start'] + b, 3)} for w, (a, b) in zip(words, times)])
        print(voice, len(heard), len(words), 'direct' if len(heard) == len(words) else 'by characters')
    out[voice] = lines
json.dump(out, open('src/words.json', 'w', encoding='utf8'), indent=1)
