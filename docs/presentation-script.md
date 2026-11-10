# PePlus: scenariul de scenă, secundă cu secundă

> Urmează `docs/pitching-workshop.md`: 4:00 pitch + 2:00 întrebări, un singur prezentator, un coleg conduce demo-ul, toată echipa răspunde la întrebări.
> Se potrivește cu prezentarea `slides/index.html` (7 slide-uri, în română) și cu aplicația finală (pornește în română). Cifrele vin din `npm run demo-numbers`; rulați-l din nou după orice schimbare în motor.
> Fiecare replică încape în intervalul ei la un ritm calm de **cel mult 2,4 cuvinte pe secundă** (numărul de cuvinte e între paranteze). Țintă: final la **3:50**. Dacă la repetiție depășiți timpul, **tăiați replicile marcate (tăiabil)**. Nu vorbiți mai repede.
> Versiunea în engleză e în tag-ul git `v1`.

## Cine ce face

| Persoană | Rol pe scenă | La întrebări |
|---|---|---|
| **sucheasilviu** | Prezentator: vorbește toate cele 4 minute | Dă fiecare întrebare cui trebuie, răspunde la „de ce / viziune” |
| **Ancusii** | Operator: conduce emulatorul în ritmul prezentatorului; apasă **B** în prezentare dacă aplicația se blochează | Produs și UX |
| **cretualex** | Cronometru: ridică un cartonaș la **2:30** și la **3:30** | Model de afaceri, piață, reguli românești (BNR, ANPC, OUG) |
| **mihaiditu** | Conduce prezentarea (→ pentru următorul slide) | Matematica motorului, Firebase, securitate, fluxul cu 7 AI-uri |

## Tastele prezentării (`slides/index.html`, merge offline)

| Tastă | Ce face |
|---|---|
| → / Spațiu / click pe jumătatea din dreapta | Slide-ul următor |
| **B** | Deschide **demo-ul înregistrat** (fără sunet, același traseu, 1:46, cu „Timp pe scenă” în colț) |
| **1 2 3 4 5** | Sare în demo-ul înregistrat la o etapă: 1 = Conectare (0:45), 2 = Acasă (1:05), 3 = Luna asta (1:30), 4 = Refinanțare (1:50), 5 = Obiectiv (2:15) |
| → (în timp ce rulează demo-ul înregistrat) | Iese din el și merge la slide-ul 4 |
| **A** | Pornește reclama de 20 de secunde (nu intră în cele 4 minute) |
| **F** / **N** | Ecran complet / arată timpul planificat pe fiecare slide |

## Înainte de a urca pe scenă (cu 10 minute înainte)

1. Emulatorul deschis, aplicația pe ecranul **Conectare**, limba **RO** (implicită), profilul **Radu**.
   - Pornire curată: iconița **ⓘ** din antet → Despre → **Conectează din nou băncile**.
   - Dacă ați trimis o cerere de test la repetiție: **Refinanțare → Cererile mele → Anulează → confirmă**. Altfel butonul arată „cerere deja trimisă” live pe scenă.
2. Prezentarea deschisă pe slide-ul 1, pe tot ecranul (F). În ziua prezentării, salvați QR-ul Expo Go ca `slides/qr.png` (apare automat pe slide-ul 7).
3. „Nu deranja” pornit, laptopul la priză, fără sleep. Apăsați **B** o dată ca să verificați că merge video-ul, apoi Esc.
4. **Regula de rezervă:** dacă emulatorul întârzie **mai mult de 3 secunde**, operatorul trece ecranul pe prezentare și apasă cifra etapei curente (1-5). Prezentatorul continuă să vorbească și nu își cere scuze. Demo-ul înregistrat urmează acest scenariu și are timpul de scenă în colț.

---

## 0:00 – 0:45: Problema și utilizatorul (slide-urile 1 și 2)

| Timp | SPUNE (prezentatorul) | FACE (operator / ecran) |
|---|---|---|
| 0:00 – 0:15 | „Am construit **PePlus** pentru românii care jonglează cu mai multe credite. Creditele lor sunt la bănci diferite, dobânzile se schimbă în fiecare trimestru și nimeni nu le spune ce să plătească întâi sau când refinanțarea chiar îi ajută.” [36] | **Slide 1:** „Toate datoriile. Un singur plan.” |
| 0:15 – 0:45 | „Peste **3 milioane** de români au credite de consum, iar cei mai mulți bani sunt datorați de oameni cu mai multe credite. Acesta e **Radu**: 32 de ani, din Cluj, câștigă **12.000 de lei** pe lună. Datorează **358.600 de lei** la cinci creditori: ipotecă, nevoi personale, card de credit, un IFN și rate BNPL. Plătește **4.500 de lei** pe lună și nu știe care datorie îl costă cel mai mult. Hai să-i arătăm.” [67] | **Slide 2:** cifre și cardul lui Radu. mihaiditu apasă → la **slide-ul 3** (coperta demo) la 0:42, iar operatorul trece ecranul pe emulator. |

## 0:45 – 2:30: Demo live, un singur traseu (Date de intrare → Procesare → Rezultat → Ce înseamnă)

| Timp | SPUNE | FACE (emulator) |
|---|---|---|
| 0:45 – 1:05 | „**Date de intrare.** Radu își conectează băncile prin open banking, doar pentru citire, simulat aici și marcat ca atare. Firebase îl autentifică și salvează datele. Apoi o singură întrebare: vreo rată întârziată peste 30 de zile? Biroul de Credit nu are API public, așa că întrebăm.” [45] | **Conectează 5 în siguranță** → **Permite accesul** → pașii de sincronizare → întrebarea despre întârzieri: **Nu** → **Acasă**. |
| 1:05 – 1:30 | „**Procesare.** Totul se calculează pe telefon, cu matematică simplă și testată, fără AI care ghicește bani. Radu datorează **358.600 de lei**. După cheltuieli, îi rămân **600 de lei** pe lună. Ratele iau **38%** din venit, sub **limita BNR de 40%**, deci băncile încă îl pot refinanța.” [50] | **Acasă:** arată spre **Total datorii** și cadran. Atinge **Grad de îndatorare** (38% față de linia de 40%). (tăiabil) Atinge **Luna ta**. |
| 1:30 – 1:50 | „**Rezultat.** Aplicația decide pentru el: plătește toate minimele și pune toți cei **600 de lei** în plus pe **cardul de credit BCR**. La **25,7% pe an**, e cel mai scump. Când e achitat, rata lui trece la următoarea datorie.” [42] | Fila **Luna asta:** titlul „Plătește în total 1.050 lei la Card de credit BCR”. Trage cursorul în sus, apoi atinge **Revino la 600 lei**. |
| 1:50 – 2:15 | „Poate plăti mai puțin? Mutând creditul ING la **Raiffeisen, cu 6,25%**, economisește **3.515 lei** după toate comisioanele, iar rata scade de la 1.085 la 1.004 lei. Ofertele sunt ordonate **doar după cât economisește el, niciodată după comisionul nostru**. O atingere trimite cererea.” [47] | Fila **Refinanțare:** titlul cu economia de 3.515 lei → **Refinanțează cu Raiffeisen Bank** → bifează acordul → **Trimite cererea** → „Cerere trimisă” cu o referință → **Gata**. |
| 2:15 – 2:30 | „**Ce înseamnă.** Păstrând rata de azi, Radu scapă de datorii în **februarie 2035**, nu în **iunie 2054**: cu 19 ani mai devreme și aproape **383.000 de lei** mai puțin.” [29] | Fila **Obiectiv:** cadranul și data fără datorii, feb. 2035. Derulează prin **Momente de achitare**, apoi deschide **Cât datorezi în timp**. (Dacă juriul întreabă de cost: **Cât plătești pe lună** arată că Radu plătește 5.100 lei pe lună până în 2035.) |

> La 2:30 cretualex ridică cartonașul. Operatorul trece ecranul înapoi pe prezentare, iar mihaiditu apasă → la **slide-ul 4**. Dacă ați trecut de 2:35, săriți peste replicile (tăiabil) de mai jos.

## 2:30 – 3:15: Cum am construit, real vs. simulat (slide-urile 4 și 5)

| Timp | SPUNE | FACE |
|---|---|---|
| 2:30 – 2:55 | „E o aplicație Android în **Expo și TypeScript**, cu **Firebase** în spate și mod offline. Calculele sunt acoperite de teste automate, cu **16 oferte reale de la 7 bănci** și regulile românești reale. Am construit-o cu **șapte AI-uri** coordonate prin Git: Claude a condus și a făcut designul, Codex a construit motorul, Gemini a făcut cercetarea și testarea.” [58] | **Slide 4:** tehnologii, reguli, oferte, fluxul de lucru cu AI. |
| 2:55 – 3:15 | „Ce e real: calculele, ofertele, regulile și stocarea în Firebase. Ce e simulat: conexiunea cu banca, persoanele demo și banca ce primește cererea. Eligibilitatea e o estimare, iar totul e scris în aplicație.” [36] | **Slide 5:** Real vs. simulat. |

## 3:15 – 3:50: Valoarea și pasul următor (slide-urile 6 și 7)

| Timp | SPUNE | FACE |
|---|---|---|
| 3:15 – 3:35 | „Aplicațiile băncilor văd doar creditele lor. Site-urile de comparare nu-ți știu bugetul. PePlus le face pe amândouă și e **gratuit** pentru cel cu datorii: banca parteneră plătește un **comision doar când refinanțarea se semnează**, iar comisionul nu schimbă niciodată ordinea.” [44] | **Slide 6:** 2054 → 2035, comparația, comisionul. |
| 3:35 – 3:50 | „Urmează: înregistrarea la ANPC, conectarea la bănci reale printr-un partener licențiat și un pilot cu două bănci. Scanați codul ca să încercați PePlus. Mulțumim, așteptăm întrebările voastre.” [31] | **Slide 7:** codul QR. Echipa urcă pe scenă. |
| 3:50 – 4:00 | Rezervă. Nu spuneți nimic nou. | |

---

## 4:00 – 6:00: Întrebări (toată echipa)

Regulile atelierului: **una sau două propoziții**, răspundeți doar la ce s-a întrebat, fără să reluați pitch-ul. Dacă nu știți, spuneți „încă nu știm, iată cum am afla”. Prezentatorul dă fiecare întrebare responsabilului, pe nume.

Cele mai probabile trei întrebări:

0. **„Cei 20 de ani nu vin doar din cei 600 de lei?”** (mihaiditu) „Nu, și aplicația spune asta: aproape tot câștigul vine din faptul că Radu continuă să plătească aceeași sumă și mută fiecare rată achitată pe următoarea datorie. Cei 600 de lei în plus adaugă 1 an și 9 luni. Costul: plătește 5.100 de lei pe lună până în 2035, iar aplicația o arată pe ecranul Obiectiv.”

1. **„Comisionul de recomandare nu e un conflict de interese?”** (cretualex) „Ofertele sunt ordonate doar după economia netă a utilizatorului, iar aplicația spune asta pe ecran. Dacă nicio ofertă nu economisește bani, aplicația spune că nu există o ofertă mai ieftină și nu recomandă nimic.”
2. **„Ce e real și ce e fals?”** (mihaiditu) „Motorul, cele 16 oferte, regulile românești și Firebase sunt reale. Conexiunea cu banca, persoanele și banca ce primește cererea sunt simulate. Pentru lansare ne trebuie un partener open banking licențiat, de exemplu Finqware sau Salt Edge.”
3. **„De ce fără scor de credit și de ce fără AI?”** (mihaiditu) „Biroul de Credit nu are API public, așa că folosim limita legală de 40% plus o întrebare sinceră. Iar sfaturile despre bani trebuie să fie exacte și repetabile, deci folosim matematică simplă, nu AI.”

Dacă vi se cer cifre: slide-urile de rezervă de după slide-ul 7 (→ după final) arată ecranele, cifrele lui Radu și ale Elenei și ipotezele modelului de afaceri. Mai multe răspunsuri: `docs/qa.md`.

## Lista pentru repetiție

- [ ] Rulați-o cu voce tare, cu prezentarea și emulatorul reale. Cronometrați cu tot cu tranziții. Țintă 3:45 – 3:50.
- [ ] Rulați-o o dată doar cu demo-ul înregistrat (B, apoi vorbiți peste el), ca trecerea să fie lină.
- [ ] Exersați o defecțiune: începeți live, apoi treceți la Refinanțare cu tasta **4**.
- [ ] Faceți o repetiție în fața cuiva din afara echipei.
- [ ] Înainte de rularea reală: resetați la Conectare și anulați orice cerere de test (vezi pașii de pregătire de mai sus).
