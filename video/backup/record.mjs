#!/usr/bin/env node
// T40: records the stage demo (docs/presentation-script.md, 0:45-2:30) from the real web build of the app,
// paced to the script, at 1080x2340. Output: video/backup/raw/screen.mp4 (silent).
// Run from video/: npm run backup:record   (SKIP_WEB_BUILD=1 reuses dist/)
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DIST = path.join(ROOT, 'dist');
const RAW = path.join(HERE, 'raw');
const FRAMES = path.join(RAW, 'frames');
const FPS = 30;

if (!(process.env.SKIP_WEB_BUILD === '1' && fs.existsSync(path.join(DIST, 'index.html')) && fs.existsSync(path.join(DIST, 'connect.html')))) {
  execSync('npx expo export --platform web', { cwd: ROOT, stdio: 'inherit' });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  let f = path.join(DIST, p);
  if (!f.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = fs.existsSync(f + '.html') ? f + '.html' : path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
  res.end(fs.readFileSync(f));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true }).catch(() => chromium.launch({ headless: true }));
const context = await browser.newContext({ viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, locale: 'ro-RO' });
// Tap indicator drawn inside the page, so the recording shows where each tap lands.
await context.addInitScript(() => {
  window.addEventListener('pointerdown', e => {
    const d = document.createElement('div');
    d.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;border-radius:50%;` +
      'background:rgba(18,59,44,0.22);border:2px solid rgba(18,59,44,0.45);pointer-events:none;z-index:99999;transition:transform .45s ease-out,opacity .45s ease-out;';
    document.documentElement.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = 'scale(1.9)'; d.style.opacity = '0'; });
    setTimeout(() => d.remove(), 600);
  }, true);
  const s = document.createElement('style');
  s.textContent = '::-webkit-scrollbar{display:none!important} *{scrollbar-width:none!important}';
  document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
});
const page = await context.newPage();
page.on('pageerror', e => console.error('[pageerror]', e.message));

await page.goto(`${base}/connect`, { waitUntil: 'networkidle' });
await page.getByText('Toate datoriile.').first().waitFor({ timeout: 20000 });
await page.waitForTimeout(1500);

// Screencast at device pixels; frames arrive on change, each held until the next one.
const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const file = path.join(FRAMES, `${String(frames.length).padStart(5, '0')}.jpg`);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  frames.push({ file, t: metadata.timestamp });
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 2340, everyNthFrame: 1 });

const t0 = Date.now();
const at = async sec => { const w = t0 + sec * 1000 - Date.now(); if (w > 0) await page.waitForTimeout(w); };
const log = m => console.log(`${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s  ${m}`);
const tap = async locator => { const b = await locator.boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up(); };
const button = name => page.getByRole('button', { name }).first();
const tab = name => page.getByRole('tab', { name }).first();

// ---- INPUT (0:45-1:05 on stage = 0-20 s here) ----
log('connect screen');
await at(3.5); await tap(button(/Conectează \d+ în siguranță/i)); log('connect');
await button(/Permite accesul/i).waitFor({ timeout: 8000 });
await at(8); await tap(button(/Permite accesul/i)); log('allow');
await page.waitForFunction(() => [...document.querySelectorAll('[role="button"],button')].some(b => /^(Nu|Arată-mi)$/.test(b.textContent?.trim() || '') && b.getAttribute('aria-disabled') !== 'true'), null, { timeout: 20000 });
if (await button(/Arată-mi/i).isVisible().catch(() => false)) { await at(13); await tap(button(/Arată-mi/i)); log('show me'); }
await button(/^Nu$/).waitFor({ timeout: 10000 });
await at(16); await tap(button(/^Nu$/)); log('late payments: no');
await page.getByText('Bună, Radu').first().waitFor({ timeout: 15000 });

// ---- PROCESSING (1:05-1:30 = 20-45 s) ----
await at(27); await tap(button(/^Grad de îndatorare/i)); log('open debt vs income');
await at(36); await tap(button(/^Luna ta/i)); log('open your month');

// ---- OUTPUT: pay first (1:30-1:50 = 45-65 s) ----
await at(45); await tap(tab(/Luna asta/i)); log('this month');
await page.getByText('Și dacă plătesc mai mult?').first().waitFor({ timeout: 10000 });
await at(52);
{
  const slider = page.locator('[aria-label="În plus pe lună"]').first();
  const b = await slider.boundingBox().catch(() => null);
  if (b) {
    const y = b.y + b.height / 2, x = f => b.x + b.width * f;
    await page.mouse.move(x(1 / 3), y, { steps: 6 }); await page.mouse.down();
    await page.mouse.move(x(0.55), y, { steps: 30 }); await page.waitForTimeout(1300);
    await page.mouse.move(x(1 / 3), y, { steps: 30 }); await page.mouse.up();
    log('slider up and back');
    // Dragging back can land a step off; the reset button puts it exactly on the left-over money (600 lei).
    const reset = button(/^Revino la/i);
    await page.waitForTimeout(700);
    if (await reset.isVisible().catch(() => false)) await reset.click();
    await page.waitForTimeout(1500);
    const shown = await page.evaluate(() => [...document.querySelectorAll('div')].map(d => d.textContent).find(t => /^\+[0-9.]+ lei$/.test(t || '')));
    log(shown === '+600 lei' ? 'slider back on +600 lei' : `WARNING: slider shows ${shown}`);
  } else log('slider not found (skipped)');
}

// ---- OUTPUT: pay less (1:50-2:15 = 65-90 s) ----
await at(65); await tap(tab(/Refinanțare/i)); log('pay less');
await button(/Refinanțează cu Raiffeisen Bank/i).waitFor({ timeout: 10000 });
await at(72); await tap(button(/Refinanțează cu Raiffeisen Bank/i)); log('refinance');
await page.getByRole('checkbox').last().waitFor({ timeout: 8000 });
await at(76); await tap(page.getByRole('checkbox').last()); log('consent');
await at(79); await tap(button(/Trimite cererea/i)); log('send');
await page.getByText('Cerere trimisă').first().waitFor({ timeout: 15000 });
await at(87); await tap(button(/^Gata$/)); log('done');

// ---- MEANING (2:15-2:30 = 90-105 s) ----
await at(90); await tap(tab(/Obiectiv/i)); log('goal');
await page.getByText('Momente de achitare').first().waitFor({ timeout: 10000 });
// "Play my journey" was removed in the final UI: scroll through the paid-off moments, then open the chart.
await at(95); await page.mouse.move(180, 500); for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 40); await page.waitForTimeout(40); } log('scroll milestones');
await at(99);
{ const row = button(/^Cât datorezi în timp/i); await row.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(400); await tap(row); log('open chart');
  await page.waitForTimeout(500); for (let i = 0; i < 16; i++) { await page.mouse.wheel(0, 45); await page.waitForTimeout(35); } }
await at(105.5); log('end');

await cdp.send('Page.stopScreencast');
await browser.close();
server.close();

// Hold each frame until the next one, then encode a constant 30 fps video.
const end = frames[0].t + (Date.now() - t0) / 1000;
const list = frames.map((f, i) => `file '${f.file.replaceAll('\\', '/')}'\nduration ${(((frames[i + 1]?.t ?? end) - f.t)).toFixed(4)}`).join('\n') + `\nfile '${frames.at(-1).file.replaceAll('\\', '/')}'\n`;
fs.writeFileSync(path.join(RAW, 'frames.txt'), list);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(RAW, 'frames.txt'), '-vf', `fps=${FPS},scale=1080:2340:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', path.join(RAW, 'screen.mp4')]);
fs.rmSync(FRAMES, { recursive: true, force: true });
console.log('wrote', path.join(RAW, 'screen.mp4'), frames.length, 'frames');
