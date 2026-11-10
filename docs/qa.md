# PePlus — Judge Q&A Bank (2-Minute Live Q&A Guide)

- **Workshop Rules (`docs/pitching-workshop.md` Slide 32–33):**
  1. Bring the **full 4-person team** on stage for the 2-minute Q&A; let **one person answer at a time**.
  2. **Answer in 1–2 sentences.** Do not re-pitch; answer the exact question asked.
  3. **Short, honest answers beat long, confident ones.** If something is untested or unknown, say *"We don't know yet—here is how we'd find out."*
  4. Keep the backup screen / **About (`ⓘ`) screen** ready to show proof on device.

---

## Team Q&A Role Assignment

| Category | Assigned Responder | Scope of Questions |
|---|---|---|
| **Product & UX** | **Operator** *(Ancusii)* | Spreadsheets vs. PePlus, payoff ordering, struggling/ineligible users (Elena), monthly buffer, bilingual RO/EN UX, what we'd build next. |
| **Business & Regulation** | **Business Lead** *(cretualex)* | Bank apps / Volt / FinZoom differentiation, referral-fee model, conflict-of-interest safeguard, Romanian legal caps (BNR 40%, OUG 52/2016, OUG 50/2010, ANPC), unit economics & conversion assumptions. |
| **Technical & Architecture** | **Tech Lead** *(mihaiditu)* | Real vs. mocked, why no Plaid, PSD2 open banking via Finqware/Salt Edge, Biroul de Credit & late-payment check, why deterministic math instead of AI, Firebase architecture & offline fallback, GDPR/security, 7-AI master-worker workflow. |
| **Moderator / Backup** | **Main Presenter** *(sucheasilviu)* | Routes judge questions to the right lead if needed and steps in on general vision or demo proof. |

---

## Group 1: Product & UX Questions *(Answered by Product Lead — Ancusii)*

### Q1. Why can't someone just do this in a spreadsheet?
> **Answer:** A spreadsheet requires manually tracking quarterly IRCC rate changes, hidden monthly administration fees, statutory early-repayment fee caps (0% on mortgages and variable loans, 0.5%–1% on fixed consumer loans), and the BNR 40% debt-to-income cap across 16 live bank offers. PePlus pulls 90 days of transactions, calculates the real annual cost (DAE) of every loan automatically, and updates your exact payoff date and refinancing eligibility in one tap.

### Q2. Why doesn't the user get to choose between debt snowball and debt avalanche?
> **Answer:** People juggling 4 to 5 loans want a clear instruction, not a textbook quiz, so PePlus decides for them: keep all minimum payments, put the entire monthly surplus toward the debt with the highest real annual cost (interest plus recurring fees), and roll each finished payment into the next debt. For Radu, directing his **+600 lei/month** surplus to his **28% DAE BCR credit card** first cuts his debt-free date from **June 2054 to February 2035 (232 months)**. Most of that comes from rolling each finished payment into the next debt; the 600 lei extra adds about 21 months. The cost: he keeps paying about 5,100 lei a month until 2035, and the Goal screen shows it (D-047).

### Q3. What happens if a user is over the 40% BNR cap or spends more than they earn?
> **Answer:** Instead of rejecting them with a dead-end "ineligible" screen, PePlus shows an actionable recovery path: for **Elena**—who spends **670 lei/month** more than she earns and sits at **61.3% debt-to-income**—the app identifies her top 3 non-debt spending categories where a 20% cut frees up **444 lei/month**. It then maps the exact payoff sequence (*Credius IFN → BCR credit card → BCR personal loan*) that brings her under the **40% BNR cap by March 2029 (18.9% DTI)** so she can refinance her remaining loan and save **3,473 lei**.

### Q4. What if interest rates (IRCC) or the user's monthly expenses change next quarter?
> **Answer:** Because PePlus reads ongoing bank transactions and recalculates the entire payoff and refinancing plan on-device in milliseconds, any quarterly IRCC update or shift in spending immediately updates the user's monthly surplus, payoff order, and net refinancing savings. Users can also test changes anytime using the **-/+ 100 lei** stepper on the **This month** screen and watch their freedom date animate live.

### Q5. Why do you put 100% of the monthly surplus toward debt instead of holding back a monthly safety buffer?
> **Answer:** In our prototype, deducting a full month of living expenses every single month would make every persona's monthly surplus negative, so we set the recurring monthly deduction to **0 lei** and advise users to keep a separate one-time emergency fund. Whether users in production prefer an automated 5%–10% monthly buffer is something we don't know yet—we would find out by A/B testing buffer defaults during our first 500-user beta.

### Q6. What would you build next after this hackathon?
> **Answer:** First, we would register with **ANPC** as a licensed credit intermediary and swap our mock data loader in `src/data/` for **Finqware's live PSD2 API** to test real bank connections in a closed beta. Second, we would sign pilot referral agreements with two Romanian banks and add quarterly push alerts whenever BNR's IRCC index updates or a newly published bank offer crosses a user's net-savings threshold.

---

## Group 2: Business, Market & Regulation Questions *(Answered by Business Lead — cretualex)*

### Q7. How is PePlus different from Romanian bank apps (George, HomeBank), comparison sites (FinZoom), or Volt?
> **Answer:** Single-bank apps like BCR George or ING HomeBank only see their own loans and will never tell you to pay off a competitor's credit card first or refinance away to another bank. Comparison portals like FinZoom list rates in a vacuum without knowing your cash-flow surplus or BNR 40% DTI eligibility, and Volt focuses on FICO score monitoring and IFN referrals—making PePlus the first cross-bank debt optimizer built for Romania's **3 million+ consumer borrowers** (*56% of consumer debt volume is held by multi-loan borrowers, BNR*).

### Q8. How do you make money without a conflict of interest when recommending refinancing?
> **Answer:** PePlus is 100% free for users and earns a standard bank referral fee only when a refinancing loan closes—modelled at **1.2% (~3,600 lei)** for mortgages and **2.5% (~950 lei)** for personal loans (*measured Romanian broker benchmark*). To eliminate conflict of interest, our engine ranks offers strictly by the user's net savings in lei after all exit and origination fees—never by our commission—and if no offer saves money after fees, the app explicitly tells the user not to refinance.

### Q9. Why would Romanian banks pay you 950 to 3,600 lei per refinanced loan instead of acquiring customers themselves?
> **Answer:** Romanian banks spend **4,000 to 6,500 lei** in marketing and branch overhead to acquire a single mortgage customer (*measured benchmark*) while wasting underwriting time on applicants who fail the BNR 40% debt-to-income cap. PePlus cuts bank customer acquisition costs by **15% to 45%** by delivering pre-vetted borrowers whose 90-day cash flows and BNR 40% DTI compliance are already verified, paid strictly on successful loan disbursement.

### Q10. Are the bank offers and Romanian legal rules in the app real, and do you need a licence to earn referral fees?
> **Answer:** Yes—we verified **16 live refinancing offers across 7 Romanian banks** (*BT, BCR, ING, Raiffeisen, BRD, CEC, UniCredit*) and encoded Romania's exact statutory rules: the **BNR 40% DTI cap** (*Reg. 17/2012*), **0% early-repayment fee on all mortgages** (*OUG 52/2016*) and variable consumer loans, and **0.5%–1% caps on fixed consumer loans** (*OUG 50/2010*). To collect referral commissions in production without being a bank, we simply register with **ANPC as a credit intermediary** and carry mandatory professional indemnity insurance (*minimum EUR 750k cover*).

### Q11. How did you estimate your Year 1 and Year 3 revenue, and what is measured vs. assumed?
> **Answer:** Our unit fees (**3,600 lei** mortgage / **950 lei** personal loan) and open-banking costs (**~9 lei/user/year** via Finqware) are measured market benchmarks, while our user growth (**25,000 active users in Year 1 → 120,000 in Year 3**) and **4.3% net annual conversion** (*60% eligible × 18% apply × 40% bank approval = 1,075 closed loans in Y1, generating 2.02M lei / ~EUR 404k*) are team assumptions. We don't know our exact real-world conversion rate yet; we would measure it by tracking funnel drop-off from the **"Refinance with [Bank]"** tap to bank disbursement in a 90-day pilot with two partner banks.

---

## Group 3: Technical, Data, Security & AI Workflow Questions *(Answered by Tech Lead — mihaiditu)*

### Q12. What is real vs. mocked in this prototype?
> **Answer:** The on-device TypeScript calculation engine (integer-cent math, 20 automated tests), the **16 verified Romanian bank offers**, the statutory fee and BNR 40% DTI rules, and **Firebase Anonymous Auth + Cloud Firestore** persistence for user profiles, connected snapshots, and submitted applications are 100% real. What is mocked is the live PSD2 bank connection, the three demo personas' transactions (**Radu, Elena, Andrei** covering all 7 debt types), and final submission to a bank's internal underwriting API—all transparently listed inside the app's **About (`ⓘ`)** screen.

### Q13. Why didn't you integrate Plaid for bank connections?
> **Answer:** Plaid does not cover Romanian banks, and its loan product (*Plaid Liabilities*) only supports the US and Canada—using its sandbox would give us US banks, USD, and US loan types, which breaks the Romanian regulatory story (30% of the judging criteria). Plaid also requires a paid backend for secret keys and a native module incompatible with Expo Go, so in production we would connect via a **BNR-licensed Romanian PSD2 aggregator** like **Finqware** or **Salt Edge**.

### Q14. How would you connect real Romanian banks in production, and how do you handle GDPR and security?
> **Answer:** Under **Romanian Law 209/2019 (PSD2)**, we would partner with a BNR-licensed Account Information Service Provider (**Finqware** or **Salt Edge**), meaning users authenticate directly on their bank's domain via Strong Customer Authentication (SCA) and PePlus only receives read-only tokens—never bank passwords. For GDPR compliance, our Firestore rules (`firestore.rules`) strictly isolate each user to their own `users/{uid}` document in `europe-west`, all math runs on-device, and users can revoke PSD2 consent or delete their data at any time.

### Q15. Why don't you pull the user's credit score from Biroul de Credit?
> **Answer:** Romania's **Biroul de Credit** does not offer a public consumer API to third-party fintechs—only participating banks and IFNs can query it during formal underwriting. Instead, PePlus checks the primary hard legal gate upfront—the **BNR 40% debt-to-income cap** computed from PSD2 cash flows—and asks the user one direct question that mirrors the bureau's 4-year retention rule: *"Any loan payment more than 30 days late in the last 4 years?"*, saving that answer to their Firebase profile.

### Q16. Where is the AI in the app—why didn't you use an LLM to give financial advice?
> **Answer:** We deliberately excluded generative AI from the runtime app because interest rates, statutory fee caps, and BNR debt-to-income ratios are exact legal formulas where LLM hallucinations could cost a borrower thousands of lei. Instead, we used a **deterministic, integer-cent TypeScript engine** on the phone for 100% auditable math, and used AI where it adds real leverage: a **7-AI master-worker engineering team** that built, tested, and verified the entire product.

### Q17. Why did you choose Firebase for the backend, and what happens if the internet drops during the demo?
> **Answer:** The **Firebase JS SDK** runs natively inside Expo Go on the free Spark plan without requiring custom native builds or paid Cloud Functions, giving us real Anonymous Auth and Cloud Firestore persistence for user profiles, connected bank snapshots, and refinance application reference numbers. Every function in `src/backend/` wraps Firestore calls in a graceful fallback to local state and bundled JSON data, so if venue Wi-Fi drops, the app displays a discreet offline badge and continues working without interruption.

### Q18. How did your 7-AI master-worker workflow actually work without the agents overwriting each other?
> **Answer:** Four humans ran **7 AI agents** (**Claude Opus** as Master architect and sole frontend/UI owner, **Gemini** workers for Romanian legal/market research, bank offer verification, and docs, and **Codex** for the calculation engine, Firebase layer, and 3D video pipeline) coordinated entirely through Git via `approach.md`, `decisions.md`, and `tasks.md`. Strict file-ownership boundaries per task, an append-only decision log, and **20 automated unit and demo-regression tests** (`npm run demo-numbers`) prevented merge conflicts and ensured every agent's code agreed on the exact same numbers.
