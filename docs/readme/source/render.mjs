import { chromium } from 'playwright-core';
const [dir, out] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1700, height: 1200 }, deviceScaleFactor: 1.25 });
await p.goto('file:///' + dir + '/index.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
for (const id of ['stats','journey','engine','arch','biz','tl','repo']) await p.locator('#' + id).screenshot({ path: `${out}/diagram-${id}.png`, omitBackground: true });
await b.close();
