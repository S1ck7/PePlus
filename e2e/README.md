# PePlus — Automated E2E Demo Smoke Test & Backup Recording

This suite provides automated end-to-end smoke testing and presentation backup asset capture for PePlus.

## What it does

Running `npm run e2e` from this directory:
1. Builds the production web version of PePlus (`npx expo export --platform web`).
2. Starts an internal zero-dependency SPA static server.
3. Launches Chromium with Playwright emulation at modern phone size (412x915, 2x scale, touch-enabled).
4. Walks the full demo path for **Radu Popescu**:
   - **Connect**: selects accounts, accepts PSD2 read-only consent, verifies sync, answers Biroul de Credit late payment check.
   - **Home (Overview)**: verifies Radu's financial greeting, debt metrics, and asserts **"Feb 2035"** plan payoff horizon.
   - **This month (Plan)**: asserts **"600 lei extra"** budget allocation, verifies **credit card first** priority ordering, and payoff date.
   - **Pay less (Refinance)**: selects ING personal loan, asserts **Raiffeisen Bank** refinancing offer, submits simulated ANAF application, and asserts **"Application sent"** with reference number.
   - **Freedom (Progress)**: asserts **"Feb 2035"** freedom horizon, years saved vs minimums, and milestone countdown.
5. Captures a continuous video recording of Radu's journey: `e2e/backup/radu-demo.webm`.
6. Captures pixel-perfect screenshots of each screen into `e2e/backup/`:
   - `01-connect.png`
   - `02-home.png`
   - `03-plan.png`
   - `04-refinance.png`
   - `05-refinance-application-sent.png`
   - `06-freedom.png`
7. Switches demo profile to **Elena Dumitrescu** and checks ineligibility:
   - Asserts regulatory BNR 40% DTI cap warning and Biroul de Credit late payments notice.
   - Captures `07-elena-not-eligible.png`.
8. Fails loudly with non-zero exit code if any screen, metric, or assertion is missing.

## How to run

From the `e2e/` folder:

```bash
npm run e2e
```

To skip rebuilding the web export when running rapid selector checks:

```bash
node run-e2e.mjs --skip-build
```

To run with visible browser UI:

```bash
node run-e2e.mjs --headed
```
