# PePlus: stage script, second by second

> Follows `docs/pitching-workshop.md`: 4:00 pitch + 2:00 Q&A, one presenter, a teammate drives the demo, the full team answers questions.
> English version of the final pitch kit (T46). Matches the deck `deck/index.html` in this folder (7 slides) and the final app with the language set to **EN**. Numbers come from `npm run demo-numbers`; re-run it after any engine change.
> Each line fits its time slot at a calm **2.4 words per second** (word count in brackets; the lines run at 1.4 to 2.2 words per second). Target: finish at **3:50**. If a rehearsal runs long, **cut the lines marked (cut)**. Don't speed up.

## Who does what

| Person | Role on stage | In Q&A answers |
|---|---|---|
| **sucheasilviu** | Presenter: speaks all 4 minutes | Hands each question to its owner, answers "why / vision" |
| **Ancusii** | Operator: drives the emulator in sync with the presenter; presses **B** on the deck if the app freezes | Product and UX |
| **cretualex** | Timekeeper: holds up a card at **2:30** and **3:30** | Business model, market, Romanian rules (BNR, ANPC, OUG) |
| **mihaiditu** | Runs the deck (→ to move) | Engine maths, Firebase, security, the 7-AI workflow |

## Deck keys (`deck/index.html`, works offline)

| Key | Does |
|---|---|
| → / Space / click right half | Next slide |
| **B** | Opens the **recorded demo** (silent, same journey, 1:46, shows "Stage time" in the corner) |
| **1 2 3 4 5** | Jumps the recorded demo to a phase: 1 = Connect (0:45), 2 = Home (1:05), 3 = This month (1:30), 4 = Pay less (1:50), 5 = Goal (2:15) |
| → (while the recorded demo plays) | Leaves it and goes on to slide 4 |
| **A** | Plays the 21-second ad (not part of the 4 minutes) |
| **F** / **N** | Fullscreen / show the planned time on each slide |

## Before going on stage (10 minutes before)

1. Emulator open, app on the **Connect** screen, language **EN** (the app starts in RO: switch it in the profile sheet, top-left avatar), profile **Radu**.
   - Fresh start: the **ⓘ** icon in the header → About → **Connect banks again**.
   - If you sent a test application while rehearsing: **Pay less → My applications → Cancel → Tap to confirm**. Otherwise the button reads **"Application already sent"** live on stage.
2. Deck open on slide 1, fullscreen (F). On the day, save the Expo Go QR as `deck/qr.png` (it appears on slide 7 automatically).
3. Do Not Disturb on, laptop on power, sleep off. Press **B** once to check the video plays, then Esc.
4. **Backup rule:** if the emulator lags **more than 3 seconds**, the operator switches the screen to the deck and presses the number of the current phase (1-5). The presenter keeps talking and doesn't apologise. The recorded demo follows this script, with the stage time in its corner.

---

## 0:00 to 0:45: Problem and user (slides 1 and 2)

| Time | SAY (presenter) | DO (operator / screen) |
|---|---|---|
| 0:00 to 0:15 | "We built **PePlus** for Romanians juggling several loans. Today their loans sit in different banks, the rates change every quarter, and nobody tells them what to pay first, or when refinancing really saves." [33] | **Slide 1:** "All your debts. One plan." |
| 0:15 to 0:45 | "Over **3 million** Romanians have consumer credit, and most of that money is owed by people with several loans. Meet **Radu**: 32, from Cluj, earning **12,000 lei** a month. He owes **358,600 lei** to five lenders: a mortgage, a personal loan, a credit card, a non-bank loan and buy-now-pay-later. He pays **4,500 lei** every month and has no idea which debt hurts most. Let's show him." [66] | **Slide 2:** stats and Radu's card. mihaiditu presses → to **slide 3** (demo cover) at 0:42, and the operator switches the screen to the emulator. |

## 0:45 to 2:30: Live demo, one journey (Input → Processing → Output → Meaning)

| Time | SAY | DO (emulator) |
|---|---|---|
| 0:45 to 1:05 | "**Input.** Radu connects his banks with read-only open banking, simulated here and labelled as such. Firebase signs him in and stores the snapshot. Then one question: any payment over 30 days late? The credit bureau has no public API, so we ask." [42] | **Connect 5 securely** → **Allow access** → the sync steps run → late-payment question: **No** → **Home**. |
| 1:05 to 1:30 | "**Processing.** Everything is calculated on the phone, with plain, tested maths and no AI guessing about money. Radu owes **358,600 lei**. After living costs, **600 lei** are left each month. His debt payments take **38%** of his income, under the National Bank's **40% limit**, so banks can still refinance him." [50] | **Home:** point at **You owe** and the dial. Tap **Debt payments vs. income** (shows 38% against the 40% line). (cut) Tap **Your month**. |
| 1:30 to 1:50 | "**Output.** The app decides for him: pay every minimum, and put the whole **600 lei** extra on the **BCR credit card**. At **25.7% a year** it costs the most. When it's paid off, its payment rolls into the next debt." [40] | Tab **This month:** headline "Pay 1.050 lei total on your BCR Credit card". Drag the slider up, then tap **Reset to 600 lei**. |
| 1:50 to 2:15 | "Can he pay less? Moving his ING loan to **Raiffeisen at 6.25%** saves **3,515 lei** after every fee, and his payment drops from 1,085 to 1,004 lei. Offers are ranked **only by what he saves, never by our fee**. One tap sends the application." [44] | Tab **Pay less:** headline "Move your ING Bank Personal loan to Raiffeisen Bank and save 3.515 lei" → **Refinance with Raiffeisen Bank** → tick the consent box → **Send application** → "Application sent" with a reference → **Done**. |
| 2:15 to 2:30 | "**Meaning.** By keeping today's payment, Radu is debt-free in **February 2035**, not **June 2054**: 19 years sooner and about **383,000 lei** less paid." [26] | Tab **Goal:** the dial and "Debt-free in Feb 2035". Scroll down through the **paid-off moments**, then open **What you owe over time**. (If a judge asks about the cost: **What you pay each month** shows Radu pays 5,100 lei a month until 2035.) |

> At 2:30 cretualex holds up the card. The operator switches the screen back to the deck, and mihaiditu presses → to **slide 4**. If you are past 2:35, skip the (cut) lines below.

## 2:30 to 3:15: How we built it, real vs. mocked (slides 4 and 5)

| Time | SAY | DO |
|---|---|---|
| 2:30 to 2:55 | "It's an Android app in **Expo and TypeScript**, with **Firebase** behind it and an offline fallback. The maths is covered by automated tests, using **16 real offers from 7 banks** and the real Romanian rules. We built it with **seven AIs** coordinated through Git: Claude led and designed, Codex built the engine, Gemini researched and tested." [56] | **Slide 4:** stack chips, rules, offers, the AI workflow. |
| 2:55 to 3:15 | "What's real: the maths, the offers, the rules and the Firebase storage. What's mocked: the bank connection, the demo people, and a bank actually receiving the application. Eligibility is an estimate, and it's all listed inside the app." [38] | **Slide 5:** Real vs. mocked. |

## 3:15 to 3:50: Value and next step (slides 6 and 7)

| Time | SAY | DO |
|---|---|---|
| 3:15 to 3:35 | "Bank apps only see their own loans. Comparison sites don't know your budget. PePlus does both, and it's **free** for the person in debt: a partner bank pays a **referral fee only when a refinancing closes**, and that fee never changes the order." [43] | **Slide 6:** 2054 → 2035, the comparison, the fee. |
| 3:35 to 3:50 | "Next: register with ANPC, connect real banks through a licensed partner, and pilot with two banks. Scan the code to try PePlus. Thank you, we're ready for your questions." [29] | **Slide 7:** QR code. The team walks up. |
| 3:50 to 4:00 | Buffer. Say nothing new. | |

---

## 4:00 to 6:00: Q&A (full team)

Workshop rules: **one or two sentences**, answer only what was asked, no re-pitching. If you don't know, say "we don't know yet, and here's how we'd find out". The presenter passes each question to its owner by name.

Three questions we'll most likely get:

0. **"Don't the 19 years just come from the 600 lei?"** (mihaiditu) "No, and the app says so: almost all of the gain comes from Radu keeping the same total payment and rolling each finished payment into the next debt. The 600 lei extra adds 1 year and 9 months. The cost: he pays 5,100 lei a month until 2035, and the Goal screen shows it."

1. **"Isn't the referral fee a conflict of interest?"** (cretualex) "Offers are ranked only by the user's net saving, and the app says so on screen. If nothing saves money, it says there's no cheaper offer and recommends nothing."
2. **"What's real and what's fake?"** (mihaiditu) "The engine, the 16 offers, the Romanian rules and Firebase are real. The bank connection, the people and the bank receiving the application are simulated. Going live means a licensed open-banking partner such as Finqware or Salt Edge."
3. **"Why no credit score, and why no AI?"** (mihaiditu) "Biroul de Credit has no public API, so we use the legal 40% limit plus one honest question. And money advice has to be exact and repeatable, so it's plain maths, not AI."

If asked for numbers: the backup slides after slide 7 (→ past the end) show the screens, Radu's and Elena's numbers, and the business-model assumptions. More answers: `qa.md` in this folder.

## Rehearsal checklist

- [ ] Run it aloud with the real deck and emulator. Time it with transitions. Target 3:45 to 3:50.
- [ ] Run it once using only the recorded demo (B, then talk over it), so the switch is smooth.
- [ ] Practise one failure: start live, then switch at "Pay less" with key **4**.
- [ ] Do one run in front of someone outside the team.
- [ ] Before the real run: reset to Connect and cancel any test application (see the setup steps above).
