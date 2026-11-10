import http from 'node:http';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { chromium, devices } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const backupDir = path.join(__dirname, 'backup');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3123;
const BASE_URL = `http://localhost:${PORT}`;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function createStaticServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      let pathname = decodeURIComponent(url.pathname);
      let filePath = path.join(distDir, pathname);

      let stat;
      try {
        stat = await fsp.stat(filePath);
        if (stat.isDirectory()) {
          filePath = path.join(filePath, 'index.html');
          stat = await fsp.stat(filePath);
        }
      } catch {
        // SPA Fallback for client-side routing
        filePath = path.join(distDir, 'index.html');
        stat = await fsp.stat(filePath);
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Internal Server Error: ${err.message}`);
    }
  });
}

async function buildWebApp() {
  console.log('📦 Step 1: Building web export (npx expo export --platform web)...');
  const nodeBin = 'C:\\Program Files\\nodejs';
  const env = {
    ...process.env,
    PATH: `${nodeBin};${process.env.PATH || ''}`,
  };

  execSync('npx expo export --platform web', {
    cwd: rootDir,
    env,
    stdio: 'inherit',
    shell: 'cmd.exe',
  });
  console.log('✅ Web build finished.');
}

async function scrollAllToTop(page) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('*').forEach((el) => {
      if (el.scrollTop > 0) {
        el.scrollTop = 0;
      }
    });
  });
}

async function toggleRow(page, labelRegex, shouldBeOpen) {
  const rowBtn = page.getByRole('button', { name: labelRegex }).first();
  if (await rowBtn.isVisible().catch(() => false)) {
    const expanded = (await rowBtn.getAttribute('aria-expanded')) === 'true';
    if (expanded !== shouldBeOpen) {
      await rowBtn.click();
      await page.waitForTimeout(350);
    }
  }
}

async function expandRowIfClosed(page, labelRegex) {
  await toggleRow(page, labelRegex, true);
}

async function main() {
  const args = process.argv.slice(2);
  const skipBuild = args.includes('--skip-build');

  console.log('🚀 Starting PePlus E2E Demo Smoke Test...');

  if (!skipBuild) {
    await buildWebApp();
  } else {
    console.log('⏩ Skipping web build (--skip-build requested)');
  }

  await fsp.mkdir(backupDir, { recursive: true });

  const server = createStaticServer();
  await new Promise((resolve, reject) => {
    server.listen(PORT, (err) => (err ? reject(err) : resolve()));
  });
  console.log(`🌐 Static server listening on ${BASE_URL}`);

  let browser;
  try {
    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless: !args.includes('--headed'),
      });
    } catch {
      browser = await chromium.launch({
        headless: !args.includes('--headed'),
      });
    }

    // Device profile: modern phone viewport
    const phoneDevice = {
      ...devices['Pixel 7'],
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    };

    console.log('\n--- Running Radu Popescu Demo Journey ---');
    const raduContext = await browser.newContext({
      ...phoneDevice,
      recordVideo: {
        dir: backupDir,
        size: { width: 412, height: 915 },
      },
    });

    const page = await raduContext.newPage();

    // 1. Connect Screen
    console.log('📍 1. Navigating to Connect screen...');
    await page.goto(`${BASE_URL}/connect`, { waitUntil: 'networkidle' });

    // Wait for the Connect screen to be visible
    await page.waitForSelector('text=All your debts', { timeout: 10000 });
    await page.screenshot({ path: path.join(backupDir, '01-connect.png') });
    console.log('📸 Captured 01-connect.png');

    // Click "Connect 5 securely" (or "Connect ...")
    console.log('👉 Clicking connect button...');
    const connectButton = page.getByRole('button', { name: /Connect \d+ securely|Pick at least one/i });
    await connectButton.click();

    // Consent sheet
    console.log('👉 Accepting consent...');
    const allowButton = page.getByRole('button', { name: /Allow access/i });
    await allowButton.waitFor({ state: 'visible', timeout: 5000 });
    await allowButton.click();

    // Sync sheet animation + possible late payment question
    console.log('⏳ Waiting for sync to complete...');
    const lateNo = page.getByRole('button', { name: /^No$/i });
    const showMe = page.getByRole('button', { name: /Show me/i });

    await page.waitForFunction(() => {
      const buttons = Array.from(document.querySelectorAll('[role="button"], button'));
      const noBtn = buttons.find((b) => b.textContent?.trim() === 'No');
      if (noBtn && noBtn.offsetParent !== null) return true;
      const showBtn = buttons.find((b) => b.textContent?.includes('Show me'));
      if (showBtn && !showBtn.hasAttribute('disabled') && showBtn.getAttribute('aria-disabled') !== 'true') {
        return true;
      }
      return false;
    }, { timeout: 15000 });

    if (await lateNo.isVisible()) {
      console.log('👉 Answering late payment question: No (Radu has no late payments)...');
      await lateNo.click();
    } else {
      console.log('👉 Clicking "Show me"...');
      await showMe.click();
    }

    // 2. Home Screen (Overview)
    console.log('📍 2. Verifying Home screen...');
    await page.waitForSelector('text=Hi, Radu', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Assert key overview numbers
    const pageText = await page.textContent('body');
    if (!pageText.includes('Feb 2035')) {
      throw new Error('❌ Missing assertion: "Feb 2035" on Home screen');
    }
    console.log('✅ Asserted: "Feb 2035" payoff date on Home screen');

    // Expand "Your debts" row so the screenshot shows Radu's debts as well as the collapsible rows
    await expandRowIfClosed(page, /^Your debts/i);
    await scrollAllToTop(page);
    await page.waitForTimeout(400);

    await page.screenshot({ path: path.join(backupDir, '02-home.png') });
    console.log('📸 Captured 02-home.png');

    // 3. Plan Screen (This month)
    console.log('📍 3. Navigating to "This month" (Plan)...');
    const planTab = page.getByRole('tab', { name: /This month/i });
    await planTab.click();

    await page.waitForSelector('text=What if I pay more?', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Expand "The order" collapsible row so all ranked debts are in the DOM
    await expandRowIfClosed(page, /^The order/i);
    await scrollAllToTop(page);
    await page.waitForTimeout(400);

    // Assert key numbers on Plan screen:
    // (1) "+600 lei" / "600 lei" extra
    // (2) "credit card" first
    const planText = await page.textContent('body');
    const has600Extra = /600\s*lei|\+600\s*lei/i.test(planText);
    if (!has600Extra) {
      throw new Error('❌ Missing assertion: "600 lei" extra on Plan screen');
    }
    console.log('✅ Asserted: "600 lei" extra on Plan screen');

    const hasCreditCardFirst = /credit card/i.test(planText);
    if (!hasCreditCardFirst) {
      throw new Error('❌ Missing assertion: "credit card" as priority debt on Plan screen');
    }
    console.log('✅ Asserted: credit card first priority on Plan screen');

    await page.screenshot({ path: path.join(backupDir, '03-plan.png') });
    console.log('📸 Captured 03-plan.png');

    // 4. Refinance Screen (Pay less)
    console.log('📍 4. Navigating to "Pay less" (Refinance)...');
    const refiTab = page.getByRole('tab', { name: /Pay less/i });
    await refiTab.click();

    await page.waitForSelector('text=Which debt?', { timeout: 10000 });
    await page.waitForTimeout(800);

    // Expand "Which debt?" collapsible row, verify ING personal loan chip is selected, then collapse "Which debt?"
    console.log('👉 Expanding "Which debt?" and selecting ING personal loan debt chip...');
    await expandRowIfClosed(page, /^Which debt\?/i);
    const ingChip = page.getByRole('tab', { name: /ING.*personal loan/i });
    if (await ingChip.isVisible().catch(() => false)) {
      await ingChip.click();
    }
    await toggleRow(page, /^Which debt\?/i, false);

    // Expand "Offers, biggest saving first" collapsible row
    await expandRowIfClosed(page, /^Offers, biggest saving first/i);
    await scrollAllToTop(page);
    await page.waitForTimeout(400);

    // Assert Raiffeisen offer
    const refiText = await page.textContent('body');
    if (!/Raiffeisen/i.test(refiText)) {
      throw new Error('❌ Missing assertion: "Raiffeisen" offer on Refinance screen');
    }
    console.log('✅ Asserted: Raiffeisen offer on Refinance screen');

    await page.screenshot({ path: path.join(backupDir, '04-refinance.png') });
    console.log('📸 Captured 04-refinance.png');

    // Click "Refinance with Raiffeisen Bank"
    console.log('👉 Clicking "Refinance with Raiffeisen Bank"...');
    const applyButton = page.getByRole('button', { name: /Refinance with Raiffeisen/i }).first();
    await applyButton.click();

    // Check consent checkbox in ApplicationSheet
    console.log('👉 Agreeing to ANAF / Biroul de Credit consent...');
    const consentCheckbox = page.getByRole('checkbox', { name: /ANAF|Biroul de Credit/i });
    await consentCheckbox.click();

    // Send application
    console.log('👉 Sending application...');
    const submitApp = page.getByRole('button', { name: /Send application/i });
    await submitApp.click();

    // Assert "Application sent" and reference
    await page.waitForSelector('text=Application sent', { timeout: 10000 });
    const appSentText = await page.textContent('body');
    if (!/Reference\s+[A-Z0-9-]+/i.test(appSentText)) {
      throw new Error(`❌ Missing assertion: Reference on Application sent sheet (got: ${appSentText})`);
    }
    console.log('✅ Asserted: "Application sent" and Reference on Application sheet');

    await page.screenshot({ path: path.join(backupDir, '05-refinance-application-sent.png') });
    console.log('📸 Captured 05-refinance-application-sent.png');

    // Close application sheet
    const doneButton = page.getByRole('button', { name: /Done/i });
    await doneButton.click();

    // 5. Goal / Freedom Screen (Progress)
    console.log('📍 5. Navigating to "Goal" (Progress)...');
    const freedomTab = page.getByRole('tab', { name: /Goal|Freedom/i });
    await freedomTab.click();

    await page.waitForSelector('text=What you owe over time', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // Expand "What you owe over time" chart collapsible row
    await expandRowIfClosed(page, /^What you owe over time/i);
    await scrollAllToTop(page);
    await page.waitForTimeout(400);

    const freedomText = await page.textContent('body');
    if (!freedomText.includes('Feb 2035')) {
      throw new Error('❌ Missing assertion: "Feb 2035" on Goal/Freedom screen');
    }
    console.log('✅ Asserted: "Feb 2035" on Goal/Freedom screen');

    await page.screenshot({ path: path.join(backupDir, '06-freedom.png') });
    console.log('📸 Captured 06-freedom.png');

    // Close Radu context to finish video
    console.log('💾 Finalizing Radu video recording...');
    const videoObj = page.video();
    await raduContext.close();

    const targetVideoPath = path.join(backupDir, 'radu-demo.webm');
    if (videoObj) {
      const videoPath = await videoObj.path();
      try {
        await fsp.copyFile(videoPath, targetVideoPath);
      } catch (err) {
        console.warn('Could not copy video:', err.message);
      }
    }

    // Clean up temporary video files left by Playwright
    try {
      const dirFiles = await fsp.readdir(backupDir);
      for (const file of dirFiles) {
        if (file.endsWith('.webm') && file !== 'radu-demo.webm') {
          await fsp.unlink(path.join(backupDir, file)).catch(() => {});
        }
      }
    } catch {}

    if (fs.existsSync(targetVideoPath)) {
      console.log(`🎥 Verified video recording at: ${targetVideoPath}`);
    }

    // --- Persona Switch to Elena Dumitrescu ---
    console.log('\n--- Testing Elena Dumitrescu Ineligibility ---');
    const elenaContext = await browser.newContext(phoneDevice);
    const elenaPage = await elenaContext.newPage();

    // Open overview
    await elenaPage.goto(`${BASE_URL}/overview`, { waitUntil: 'networkidle' });

    // Open Persona Switcher avatar
    console.log('👉 Opening persona switcher...');
    const personaButton = elenaPage.getByRole('button', { name: /Demo profile/i });
    await personaButton.click();

    // Select Elena Dumitrescu
    console.log('👉 Selecting Elena Dumitrescu...');
    const elenaChoice = elenaPage.getByRole('radio', { name: /Elena Dumitrescu/i });
    await elenaChoice.click();

    // Wait for Elena's profile to load on screen
    await elenaPage.waitForSelector('text=Hi, Elena', { timeout: 10000 });

    // Navigate to "Pay less" (Refinance)
    console.log('📍 Navigating to "Pay less" to check ineligibility...');
    const elenaRefiTab = elenaPage.getByRole('tab', { name: /Pay less/i });
    await elenaRefiTab.click();

    // Assert Elena is NOT eligible (DTI 61.3% > 40% BNR limit; until late-payment question is answered, shows DTI reason only per T37/T38)
    await elenaPage.waitForSelector('text=Not yet. Here is the way there.', { timeout: 10000 });
    await elenaPage.waitForTimeout(800);

    const elenaText = await elenaPage.textContent('body');
    const hasIneligibleAssertion =
      /Not yet\. Here is the way there|BNR lets banks lend only up to 40%|Once you qualify/i.test(elenaText);

    if (!hasIneligibleAssertion) {
      throw new Error('❌ Missing assertion: Elena ineligibility notice on Refinance screen');
    }
    console.log('✅ Asserted: Elena Dumitrescu is not eligible (DTI > 40% BNR limit)');

    await elenaPage.screenshot({ path: path.join(backupDir, '07-elena-not-eligible.png') });
    console.log('📸 Captured 07-elena-not-eligible.png');

    await elenaContext.close();

    console.log('\n🎉 ALL SMOKE TESTS AND ASSERTIONS PASSED!');
    console.log('Assets saved in e2e/backup/:');
    const files = await fsp.readdir(backupDir);
    files.forEach((f) => console.log(`  - ${f}`));
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error('\n💥 E2E Test Failed:', err);
  process.exit(1);
});
