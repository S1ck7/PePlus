// Screenshots every slide of slides/index.html (QA) and prints the deck PDF backup.
// Run from video/: node scripts/deck-shots.mjs [outDir]   -> outDir/slideNN.png and ../slides/peplus.pdf
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'out/qa';
mkdirSync(out, { recursive: true });
const file = 'file:///' + path.resolve('../slides/index.html').replaceAll('\\', '/');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(file);
const count = await page.locator('.slide').count();
for (let i = 1; i <= count; i++) {
  await page.goto(file + '#' + i);
  await page.reload();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/slide${String(i).padStart(2, '0')}.png` });
}
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: path.resolve('../slides/peplus.pdf'), width: '1920px', height: '1080px', printBackground: true });
await browser.close();
console.log(count, 'slides, PDF written');
