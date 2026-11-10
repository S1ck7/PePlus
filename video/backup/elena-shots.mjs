// Screenshots of the Elena demo profile (Home, Refinanțare) in Romanian for the deck's backup slides.
// Run from video/ after a web build exists in ../dist:  node backup/elena-shots.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'slides', 'screens');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
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
const page = await (await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, locale: 'ro-RO' })).newPage();
const button = name => page.getByRole('button', { name }).first();

await page.goto(`${base}/connect`, { waitUntil: 'networkidle' });
await button(/Conectează \d+ în siguranță/i).click();
await button(/Permite accesul/i).click();
await page.waitForFunction(() => [...document.querySelectorAll('[role="button"],button')].some(b => /^(Nu|Arată-mi)$/.test(b.textContent?.trim() || '') && b.getAttribute('aria-disabled') !== 'true'), null, { timeout: 20000 });
if (await button(/Arată-mi/i).isVisible().catch(() => false)) await button(/Arată-mi/i).click();
await button(/^Nu$/).click();
await page.getByText('Bună, Radu').first().waitFor({ timeout: 15000 });
await button(/Profil demo: Radu/i).click();
await page.getByText(/Elena/).first().click();
await page.getByText(/Bună, Elena/).first().waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(OUT, 'elena-home.png') });
await page.getByRole('tab', { name: /Refinanțare/i }).first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(OUT, 'elena-pay-less.png') });
await browser.close();
server.close();
console.log('elena shots ok');
