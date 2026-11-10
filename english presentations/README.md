# PePlus: English pitch kit (final)

The English version of the final pitch kit. It matches the Romanian final (tag `v2`, T45): the approved app UI and the D-047 numbers (debt-free Feb 2035 instead of Jun 2054, 19 years sooner). The older English kit in tag `v1` is out of date (Jun 2055, "20 years sooner", pre-T43 screens).

| File | What it is |
|---|---|
| `deck/index.html` | The deck (7 slides + backup slides, works offline). Keys: → next, **B** backup demo, **1-5** jump to a demo phase, **A** ad, **F** fullscreen, **N** timing. Put the Expo Go QR at `deck/qr.png` on the day. |
| `peplus.pdf` | PDF backup of the deck (video slides skipped) |
| `presentation-script.md` | Stage script, second by second, with roles and Q&A |
| `qa.md` | Judge Q&A bank |
| `ad-script.md` | Ad script and storyboard |
| `videos/ad-16x9.mp4`, `videos/ad-9x16.mp4` | The 21 s ad, voice Aoede (Gemini TTS) |
| `videos/alt/` | Same ad with the Ava voice (Edge TTS), and a captioned 9:16 for muted autoplay |
| `videos/demo-backup.mp4` | Silent recorded demo (1:46) with phase captions and stage clock, timed to the script (0:45-2:30) |
| `videos/demo-backup-phone.mp4` | The bare phone screen recording behind it |

The app itself starts in Romanian. Switch to English in the profile sheet (the avatar at the top left) before the demo.

## Rebuilding

The repo's generators produce the Romanian kit. `english-sources.patch` holds the English changes (app default EN, ad and backup-demo text, English recorder selectors, voice lines). `voice/` holds the English Gemini take, split into lines. To rebuild: `git apply "english presentations/english-sources.patch"`, copy `voice/*.wav` to `video/vo-src/`, then in `video/` run `node capture/capture.mjs`, `SKIP_WEB_BUILD=1 npm run backup:record`, copy `backup/raw/screen.mp4` to `public/backup/screen.mp4`, then `npm run voice`, `python scripts/words.py` and `npm run render`. Restore Romanian afterwards with `git checkout -- src video`.
