// QA screenshots (full page) of This month / Home / Goal for Radu and Elena, plus This month with the slider at 0.
// Run from video/ after `npx expo export --platform web`:  node backup/qa-shots.mjs <outDir>
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, '..', '..', 'dist');
const OUT = path.resolve(process.argv[2] || 'out/qa');
fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  let f = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = fs.existsSync(f + '.html') ? f + '.html' : path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome' });
const page = await (await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 2, locale: 'ro-RO' })).newPage();
page.on('pageerror', e => console.error('[pageerror]', e.message));
const button = name => page.getByRole('button', { name }).first();
const tab = name => page.getByRole('tab', { name }).first();
// The app scrolls inside its own ScrollView, so capture it by growing the viewport to the content height.
async function shot(name) {
  await page.waitForTimeout(1200);
  const h = await page.evaluate(() => Math.max(...[...document.querySelectorAll('div')].map(d => d.scrollHeight)));
  await page.setViewportSize({ width: 360, height: Math.min(h, 4000) });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  await page.setViewportSize({ width: 360, height: 780 });
}
async function openAll() {
  for (const name of [/^Grad de îndatorare/, /^Luna ta/, /^Cât datorezi în timp/, /^Ordinea în care/]) {
    const b = page.getByRole('button', { name }).first();
    if (await b.isVisible().catch(() => false) && (await b.getAttribute('aria-expanded')) !== 'true') await b.click().catch(() => {});
  }
}

await page.goto(`${base}/connect`, { waitUntil: 'networkidle' });
await button(/Conectează \d+ în siguranță/i).click();
await button(/Permite accesul/i).click();
await page.waitForFunction(() => [...document.querySelectorAll('[role="button"],button')].some(b => /^(Nu|Arată-mi)$/.test(b.textContent?.trim() || '') && b.getAttribute('aria-disabled') !== 'true'), null, { timeout: 20000 });
if (await button(/Arată-mi/i).isVisible().catch(() => false)) await button(/Arată-mi/i).click();
await button(/^Nu$/).click();
await page.getByText('Bună, Radu').first().waitFor({ timeout: 15000 });

for (const who of ['radu', 'elena']) {
  if (who === 'elena') {
    await button(/Profil demo: Radu/i).click();
    await page.getByText(/Elena/).first().click();
    await page.getByText(/Bună, Elena/).first().waitFor({ timeout: 15000 });
  }
  await tab(/Acasă/i).click(); await openAll(); await shot(`${who}-home`);
  await tab(/Luna asta/i).click(); await openAll(); await shot(`${who}-plan`);
  await tab(/Obiectiv/i).click(); await openAll(); await shot(`${who}-goal`);
}
// Radu again, slider moved to 0 and to the top, to check the plan-relative numbers.
await button(/Profil demo: Elena/i).click();
await page.getByText(/Radu/).first().click();
await page.getByText(/Bună, Radu/).first().waitFor({ timeout: 15000 });
await tab(/Luna asta/i).click();
await page.waitForTimeout(800);
const slider = page.locator('[aria-label="În plus pe lună"]').first();
async function drag(fromF, to) {
  const b = await slider.boundingBox();
  const y = b.y + b.height / 2;
  await page.mouse.move(b.x + b.width * fromF, y); await page.mouse.down();
  await page.mouse.move(b.x + b.width * to, y, { steps: 20 }); await page.mouse.up();
  await page.waitForTimeout(900);
}
await drag(1 / 3, -0.1);
await shot('radu-plan-zero');
await tab(/Luna asta/i).click();
await drag(0.045, 1.1);
await shot('radu-plan-max');
await browser.close();
server.close();
console.log('qa shots ok', OUT);
