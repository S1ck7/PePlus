# Gemini TTS for one line -> 24 kHz mono WAV.  python scripts/tts_gemini.py <voice> <out.wav> <text...>
# Needs GEMINI_API_KEY in the environment (free tier in Google AI Studio). Standard library only.
import base64, json, os, sys, time, urllib.request, urllib.error, wave

MODEL = os.environ.get('GEMINI_TTS_MODEL', 'gemini-3.1-flash-tts-preview')
# No style prompt by default: this model reads any instruction aloud (and rejects system instructions).
# The free tier allows about 10 requests a day per model, so generate the whole script in one request.

def main():
    voice, out, text = sys.argv[1], sys.argv[2], ' '.join(sys.argv[3:])
    body = {
        'contents': [{'parts': [{'text': (os.environ.get('GEMINI_TTS_STYLE', '') + text)}]}],
        'generationConfig': {
            'responseModalities': ['AUDIO'],
            'speechConfig': {'voiceConfig': {'prebuiltVoiceConfig': {'voiceName': voice}}},
        },
    }
    req = urllib.request.Request(
        f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
        data=json.dumps(body).encode(), method='POST',
        headers={'Content-Type': 'application/json', 'x-goog-api-key': os.environ['GEMINI_API_KEY']})
    for attempt in range(5):  # the free tier rate-limits; back off and retry
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503) and attempt < 4:
                time.sleep(8 * (attempt + 1)); continue
            raise SystemExit(f'Gemini TTS {e.code}: {e.read()[:300]!r}')
    part = data['candidates'][0]['content']['parts'][0]['inlineData']
    pcm = base64.b64decode(part['data'])
    with wave.open(out, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)

if __name__ == '__main__':
    main()
