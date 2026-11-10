// Checks the deck's backup-video keys: B opens the video, 3 jumps to phase 3 (45 s), Esc returns.
import { chromium } from 'playwright-core';
import path from 'node:path';
import assert from 'node:assert';
const file = 'file:///' + path.resolve('../slides/index.html').replaceAll(path.sep, '/');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto(file + '#3'); await p.waitForTimeout(500);
const active = () => p.evaluate(() => { const s = document.querySelector('.slide.active'); return { id: s.id, i: [...document.querySelectorAll('.slide')].indexOf(s) + 1 }; });
await p.keyboard.press('b'); await p.waitForTimeout(1500);
assert.equal((await active()).id, 'backup-video');
const t1 = await p.evaluate(() => document.querySelector('#backup-video video').currentTime); assert.ok(t1 > 0.3, 'video plays ' + t1);
await p.keyboard.press('3'); await p.waitForTimeout(400);
const t3 = await p.evaluate(() => document.querySelector('#backup-video video').currentTime); assert.ok(t3 >= 45 && t3 < 47, 'phase 3 ' + t3);
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
assert.equal((await active()).i, 4, 'after backup video, → goes to slide 4 (how we built it)');
await p.keyboard.press('a'); await p.waitForTimeout(300); assert.equal((await active()).id, 'ad-video');
await p.keyboard.press('Escape'); await p.waitForTimeout(300); assert.equal((await active()).i, 4);
await b.close(); console.log('deck keys ok');
