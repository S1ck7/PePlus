# PePlus ad: script and storyboard (English, as built)

> English version of the final 20-second ad (T32, shortened in T42, voice and numbers in T45, English in T46; D-045, D-046, D-048).
> Files in this folder: `videos/ad-16x9.mp4` and `videos/ad-9x16.mp4` (voice: Aoede, Gemini TTS), the alternate voice (Ava, Edge) and a captioned 9:16 in `videos/alt/`. 1080p, 30 fps, about **21 s**.

## Voice-over (6 lines, Gemini TTS, voice Aoede)

| # | Line | On screen |
|---|---|---|
| 1 | "Five loans, five lenders. Which one costs you the most?" | Radu's five debts (real lender logos, real balances) pop in and jitter; bank notifications stack up; "5 loans · 5 lenders · which one hurts?" |
| 2 | "PePlus brings your debts together and shows their real cost." | The cards fly into the PePlus hub ("Every debt. One place."), four feature nodes branch out (Real cost, Pay first, Pay less, Goal), and a counter ticks up to **2.799 lei / month** in interest and fees. Zoom into "Pay first". |
| 3 | "It tells you what to pay first, and how much." | 3D phone with the This month screen (English UI); "+600 lei on your BCR credit card"; notification "Put 600 lei extra on your BCR credit card". |
| 4 | "It finds you a cheaper bank." | The phone plays the real app recording: the tap on "Refinance with Raiffeisen Bank". "Save 3.515 lei", "Ranked by your saving, not our fee", notification "Raiffeisen Bank · likely eligible, payment 1.085 → 1.004 lei". |
| 5 | "With the PePlus plan, Radu is debt-free in 2035, not 2054." | A ring fills while the year counts down from 2054 to **2035**; "Minimums only: Jun 2054" is crossed out; "19 years sooner" pops; "Demo profile: Radu, 32, Cluj · each finished payment moves to the next debt". |
| 6 | "PePlus. All your debts. One plan." | End card: logo, "PePlus", "All your debts. One plan.", "Android · Built for Romania · Stripe VibeHack 2026". |

The voice was recorded as one take of the whole script with `python scripts/tts_gemini.py Aoede <wav> "<script>"` and split into lines with `scripts/split_vo.py`. The name is spelled "Pay Plus" for the voice, because TTS reads "PePlus" as "P.E. Plus". Speech-to-text (Whisper) heard every line.

## Look and sound

- Deep green background with a slowly drifting dot grid and soft glows. Pastel mint `#B5E8D3` is the only accent, and coral is used only for "the problem". Inter type.
- Motion: spring pop-ins, ease-out moves, notifications, ticking counters, a slow push-in on every scene, fine film grain.
- Sound: ambient pad, pops, notification dings, ticks, whooshes and a low boom on the big moments, all synthesized in code. The music dips under the voice; peaks are limited to -1.5 dBFS, loudness about -16 LUFS.

## Every claim is true in the app

All numbers come from `npm run demo-numbers` and the final UI: 358.600 lei owed to 5 lenders, 2.799 lei a month in interest and fees, +600 lei on the BCR card (25.7% a year), 3.515 lei saved by moving the ING loan to Raiffeisen at 6.25% fixed (payment 1.085 → 1.004 lei), debt-free in Feb 2035 instead of Jun 2054. Under D-047, the minimums-only baseline stops at the mortgage's maturity, and most of the gain comes from rolling finished payments into the next debt.
