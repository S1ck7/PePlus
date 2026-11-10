# Reclama PePlus: scenariu și storyboard (așa cum e construită)

> Construită în T32, scurtată și tradusă în T42 (D-045, D-046). Complet automat: `cd video && npm run voice && npm run render`.
> Fișiere: `video/out/ad-16x9.mp4` și `video/out/ad-9x16.mp4` (voce: Aoede, Gemini TTS), variante cu Alina (Edge) și una cu subtitrări în `video/out/alt/`. 1080p, 30 fps, aproximativ **20 s**.
> Versiunea în engleză (29 s, Ava) e în tag-ul git `v1`.

## Voce (6 replici, Gemini TTS, vocea Aoede, D-048)

| # | Replică | Pe ecran |
|---|---|---|
| 1 | „Cinci credite, cinci bănci. Care te costă cel mai mult?” | Cele cinci datorii ale lui Radu (sigle reale de creditori, solduri reale) apar și tremură; notificările băncilor se adună; „5 credite · 5 bănci · care te costă?” |
| 2 | „PePlus îți adună datoriile și îți arată costul real.” | Cardurile zboară în centrul PePlus („Toate datoriile, într-un loc.”), patru noduri se ramifică (Cost real, Plătește întâi, Plătește mai puțin, Obiectiv), iar un contor urcă la **2.799 lei / lună** în dobânzi și comisioane. Zoom pe „Plătește întâi”. |
| 3 | „Îți spune ce să plătești întâi, și cât.” | Telefon 3D cu ecranul Luna asta (UI în română); „+600 lei pe cardul de credit BCR”; notificarea „Pune 600 lei în plus pe cardul BCR”. |
| 4 | „Îți găsește o bancă mai ieftină.” | Telefonul rulează înregistrarea reală a aplicației: atingerea pe „Refinanțează cu Raiffeisen Bank”. „Economisești 3.515 lei”, „Ordonat după economia ta, nu după comision”, notificarea „Raiffeisen Bank · probabil eligibil, rata 1.085 → 1.004 lei”. |
| 5 | „Cu planul PePlus, Radu scapă de datorii în 2035, nu în 2054.” | Un inel se umple în timp ce anul coboară de la 2054 la **2035**; „Doar minimul: iun. 2054” e tăiat; apare „Cu 19 ani mai devreme”; „Profil demo: Radu, 32 de ani, Cluj · fiecare rată achitată trece la următoarea datorie”. |
| 6 | „PePlus. Toate datoriile. Un singur plan.” | Final: sigla, „PePlus”, „Toate datoriile. Un singur plan.”, „Android · Creat pentru România · Stripe VibeHack 2026”. |

Vocea e înregistrată o dată cu `python scripts/tts_gemini.py Aoede <wav> "<tot scenariul>"` și tăiată pe replici cu `scripts/split_vo.py` în `video/vo-src/` (planul gratuit Gemini permite ~10 cereri pe zi). Numele se scrie „Pe Plus” pentru voce.

## Imagine și sunet

- Fundal verde închis cu o rețea de puncte care se mișcă lent și lumini moi, verde mentă pastel `#B5E8D3` ca singur accent, coral doar pentru „problemă”. Font Inter.
- Mișcare: apariții cu arc, mișcări care încetinesc la final, notificări, contoare, un zoom lent pe fiecare scenă, granulație fină de film.
- Sunet: fundal ambiental, pop-uri, notificări, tic-uri, whoosh-uri, un boom grav la momentele mari, toate sintetizate în cod; muzica scade sub voce; vârfuri limitate la -1,5 dBFS, intensitate în jur de -16 LUFS.

## Fiecare afirmație e adevărată în aplicație

Toate cifrele vin din `npm run demo-numbers` și din UI-ul final: 358.600 lei datorii la 5 creditori, 2.799 lei pe lună în dobânzi și comisioane, +600 lei pe cardul BCR (25,7% pe an), 3.515 lei economisiți mutând creditul ING la Raiffeisen cu 6,25% fix (rata 1.085 → 1.004 lei), fără datorii în feb. 2035 în loc de iun. 2054 (D-047: minimul se oprește la scadența ipotecii; câștigul vine mai ales din mutarea ratelor achitate).
