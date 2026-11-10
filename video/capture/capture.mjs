#!/usr/bin/env node
/**
 * PePlus — Automated Storyboard Screen Capture (T31 / T39)
 *
 * Builds the Expo web bundle from the project root (`npx expo export --platform web`),
 * serves `dist/` locally on an ephemeral port, launches headless Chromium via Playwright
 * at mobile Retina resolution (360x780 @ 3x DPR = 1080x2340 physical pixels),
 * walks Radu Popescu's demo flow in English against the final T38/D-044 UI
 * (expanding relevant collapsible rows for storyboard shots), and writes crisp PNG
 * screenshots to `video/assets/screens/` matching `docs/ad/script.md`.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VIDEO_DIR = path.resolve(__dirname, '..');
const ROOT_DIR = path.resolve(VIDEO_DIR, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const SCREENS_DIR = path.join(VIDEO_DIR, 'assets', 'screens');

const VIEWPORT = { width: 360, height: 780 };
const DEVICE_SCALE_FACTOR = 3; // 360*3 = 1080, 780*3 = 2340

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function buildWebApp() {
  if (process.env.SKIP_WEB_BUILD === '1' && fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
    console.log('[capture] Step 1/4: Reusing existing dist/ web build...');
    return;
  }
  console.log('[capture] Step 1/4: Building Expo web app (`npx expo export --platform web`)...');
  execSync('npx expo export --platform web', {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`Expected build output at ${DIST_DIR}, but directory was not created.`);
  }
}

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
        let reqPath = decodeURIComponent(parsedUrl.pathname);

        if (reqPath === '/') {
          reqPath = '/index.html';
        }

        let filePath = path.join(rootDir, reqPath);

        // Prevent directory traversal
        if (!filePath.startsWith(rootDir)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }

        // Resolve clean route paths like /overview -> /overview.html or SPA fallback index.html
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          const htmlCandidate = `${filePath}.html`;
          const nestedIndexCandidate = path.join(filePath, 'index.html');
          if (fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
            filePath = htmlCandidate;
          } else if (fs.existsSync(nestedIndexCandidate) && fs.statSync(nestedIndexCandidate).isFile()) {
            filePath = nestedIndexCandidate;
          } else {
            filePath = path.join(rootDir, 'index.html');
          }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store',
        });
        res.end(content);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });

    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function launchBrowser() {
  const candidates = [
    { name: 'system Chrome', options: { channel: 'chrome', headless: true } },
    { name: 'bundled Chromium', options: { headless: true } },
    { name: 'system Edge', options: { channel: 'msedge', headless: true } },
  ];

  let lastError;
  for (const candidate of candidates) {
    try {
      const browser = await chromium.launch(candidate.options);
      console.log(`[capture] Launched ${candidate.name}.`);
      return browser;
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Could not launch any Chromium browser: ${lastError?.message || lastError}`);
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    throw new Error(`Invalid PNG file: ${filePath}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height, bytes: buffer.length };
}

async function hideScrollbars(page) {
  await page.addStyleTag({
    content: `
      ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
      * { scrollbar-width: none !important; }
    `,
  });
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

async function expandCollapsibleRow(page, titleRegex) {
  const btn = page.getByRole('button', { name: titleRegex }).first();
  if (await btn.isVisible().catch(() => false)) {
    const expanded = await btn.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await btn.click();
      await page.waitForTimeout(400);
    }
  }
}

async function navigateTabOrUrl(page, baseUrl, routePath, tabLabels, verifyText) {
  let navigatedViaTab = false;
  for (const label of tabLabels) {
    const tab = page.getByRole('tab', { name: label }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      navigatedViaTab = true;
      break;
    }
  }

  if (!navigatedViaTab) {
    await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'networkidle' });
  }

  await page.getByText(verifyText).first().waitFor({ state: 'visible', timeout: 15000 });
  await hideScrollbars(page);
  // Allow useTween (400-900ms) and spring animations to completely finish
  await page.waitForTimeout(1600);
}

async function captureStoryboard() {
  buildWebApp();

  fs.mkdirSync(SCREENS_DIR, { recursive: true });

  console.log('[capture] Step 2/4: Starting local static server for dist/...');
  const { server, baseUrl } = await startStaticServer(DIST_DIR);
  console.log(`[capture] Serving dist/ at ${baseUrl}`);

  let browser;
  try {
    console.log('[capture] Step 3/4: Launching Playwright at 1080x2340 (360x780 @ 3x DPR)...');
    browser = await launchBrowser();
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      isMobile: true,
      hasTouch: true,
      locale: 'en-US',
    });

    const page = await context.newPage();
    page.on('pageerror', (err) => {
      console.error('[capture:pageerror]', err.message);
    });

    console.log('[capture] Opening /connect and walking Radu (EN) demo path...');
    await page.goto(`${baseUrl}/connect`, { waitUntil: 'networkidle' });
    await page.getByText('All your debts.').first().waitFor({ state: 'visible', timeout: 15000 });
    await hideScrollbars(page);

    // Capture 00-connect.png on /connect as bonus onboarding screen
    const connectOutPath = path.join(SCREENS_DIR, '00-connect.png');
    await page.waitForTimeout(800);
    await page.screenshot({ path: connectOutPath, type: 'png', fullPage: false });
    const connectDims = readPngDimensions(connectOutPath);
    console.log(
      `[capture]   -> Saved 00-connect.png (${connectDims.width}x${connectDims.height} px, ${(connectDims.bytes / 1024).toFixed(1)} KB)`,
    );

    // Walk Connect -> Consent -> Sync -> Late-payment question ("No") -> Home
    const connectBtn = page.getByRole('button', { name: /Connect \d+ securely/i }).first();
    if (await connectBtn.isVisible().catch(() => false)) {
      await connectBtn.click();
      const allowBtn = page.getByRole('button', { name: /Allow access/i }).first();
      await allowBtn.waitFor({ state: 'visible', timeout: 5000 });
      await allowBtn.click();

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

      const noBtn = page.getByRole('button', { name: /^No$/i }).first();
      if (await noBtn.isVisible().catch(() => false)) {
        await noBtn.click();
      } else {
        const showBtn = page.getByRole('button', { name: /Show me/i }).first();
        if (await showBtn.isVisible().catch(() => false)) {
          await showBtn.click();
        }
      }
      await page.waitForTimeout(600);
    } else {
      await page.goto(`${baseUrl}/overview`, { waitUntil: 'networkidle' });
    }

    const targets = [
      {
        id: '01-home',
        file: '01-home.png',
        route: '/overview',
        tabLabels: ['Home'],
        verifyText: 'Hi, Radu',
        description: 'Scene 3 — Overview / Home (Radu Popescu in EN, pastel mint GlassHero & collapsible rows)',
        prepare: async () => {},
      },
      {
        id: '02-plan',
        file: '02-plan.png',
        route: '/plan',
        tabLabels: ['This month'],
        verifyText: 'What if I pay more?',
        description: 'Scene 4 — Plan / This month (Pay 1.050 lei total on BCR Credit card + 600 lei extra)',
        prepare: async () => {},
      },
      {
        id: '03-refinance',
        file: '03-refinance.png',
        route: '/refinance',
        tabLabels: ['Pay less'],
        verifyText: 'Move your ING Bank Personal loan to Raiffeisen Bank',
        description: 'Scene 5 — Refinance / Pay less (ING Bank Personal loan -> Raiffeisen +3.515 lei net savings)',
        prepare: async () => {
          // Expand "Offers, biggest saving first" so the top Raiffeisen OfferCard (+3.515 lei) is visible below the GlassHero
          await expandCollapsibleRow(page, /^Offers, biggest saving first/i);
        },
      },
      {
        id: '04-freedom',
        file: '04-freedom.png',
        route: '/progress',
        tabLabels: ['Goal', 'Freedom'],
        verifyText: 'Paid-off moments',
        description: 'Scene 6 — Progress / Goal (99 months Freedom Ring countdown & Paid-off moments timeline)',
        prepare: async () => {},
      },
    ];

    const manifest = [];

    for (const target of targets) {
      console.log(`[capture] Capturing ${target.file} (${target.description})...`);
      await navigateTabOrUrl(
        page,
        baseUrl,
        target.route,
        target.tabLabels,
        target.verifyText,
      );

      if (target.prepare) {
        await target.prepare();
      }
      await scrollAllToTop(page);
      await page.waitForTimeout(500);

      const outPath = path.join(SCREENS_DIR, target.file);
      await page.screenshot({
        path: outPath,
        type: 'png',
        fullPage: false,
      });

      const dims = readPngDimensions(outPath);
      if (dims.width !== 1080 || dims.height !== 2340) {
        throw new Error(
          `Expected ${target.file} to be 1080x2340, got ${dims.width}x${dims.height}`,
        );
      }

      console.log(
        `[capture]   -> Saved ${target.file} (${dims.width}x${dims.height} px, ${(dims.bytes / 1024).toFixed(1)} KB)`,
      );

      manifest.push({
        id: target.id,
        file: `assets/screens/${target.file}`,
        route: target.route,
        width: dims.width,
        height: dims.height,
        bytes: dims.bytes,
        description: target.description,
      });
    }

    const manifestPath = path.join(SCREENS_DIR, 'manifest.json');
    fs.writeFileSync(
      manifestPath,
      `${JSON.stringify({ persona: 'Radu Popescu (persona-1)', locale: 'en', screens: manifest }, null, 2)}\n`,
      'utf8',
    );
    console.log(`[capture] Step 4/4: Wrote ${manifestPath} and verified all ${manifest.length} PNGs.`);
  } finally {
    if (browser) {
      await browser.close();
    }
    server.close();
  }
}

captureStoryboard().catch((err) => {
  console.error('[capture] ERROR:', err);
  process.exit(1);
});
