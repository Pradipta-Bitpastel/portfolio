// Verify the Showcase helmet is properly draggable (free orbit, sticks, smooth).
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT = process.argv[2] || '/tmp/showcase';
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  headless: false, channel: 'chrome',
  args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto('http://localhost:3000/?force3d', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[aria-label="Loading"]', { state: 'attached', timeout: 8000 }).catch(() => {});
await page.waitForSelector('[aria-label="Loading"]', { state: 'detached', timeout: 45000 }).catch(() => console.log('WARN: preloader'));
await page.waitForSelector('canvas', { state: 'attached', timeout: 30000 }).catch(() => {});

// Scroll the showcase to center so its canvas mounts + becomes active.
await page.evaluate(() => document.getElementById('showcase')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
await page.waitForFunction(() => document.querySelectorAll('canvas').length >= 2, { timeout: 15000 }).catch(() => console.log('WARN: showcase canvas not mounted (only 1 canvas)'));
await page.waitForTimeout(2500);

const az = () => page.evaluate(() => window.__artifactAz ?? null);

// Auto-rotate (idle): azimuth should drift on its own.
const a0 = await az();
await page.waitForTimeout(1400);
const a1 = await az();
console.log(`idle autorotate: az ${a0} -> ${a1}  (drift ${a0 != null && a1 != null ? (a1 - a0).toFixed(3) : 'n/a'})`);
await page.screenshot({ path: `${OUT}/1-before-drag.png` });

// Locate the showcase canvas and drag horizontally across its center.
const box = await page.evaluate(() => {
  const cvs = [...document.querySelectorAll('canvas')];
  const el = document.getElementById('showcase')?.querySelector('canvas') || cvs[cvs.length - 1];
  const r = el.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
const scrollBefore = await page.evaluate(() => window.scrollY);
const azBeforeDrag = await az();

await page.mouse.move(cx - 220, cy);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(cx - 220 + (440 * i) / 12, cy, { steps: 1 });
await page.mouse.up();
await page.waitForTimeout(200);
const azAfterDrag = await az();
const scrollAfter = await page.evaluate(() => window.scrollY);
await page.screenshot({ path: `${OUT}/2-after-drag.png` });

// Hold check: 0.6s after release autoRotate is still paused (2.5s timer), so it
// should barely move (just damping coast) — i.e. it STICKS, no snap-back.
await page.waitForTimeout(700);
const azHold = await az();
await page.screenshot({ path: `${OUT}/3-hold.png` });

console.log(`drag: az ${azBeforeDrag} -> ${azAfterDrag}  (Δ ${azBeforeDrag != null && azAfterDrag != null ? (azAfterDrag - azBeforeDrag).toFixed(3) : 'n/a'} rad)`);
console.log(`hold 0.7s after release: az ${azAfterDrag} -> ${azHold}  (coast ${azAfterDrag != null && azHold != null ? (azHold - azAfterDrag).toFixed(3) : 'n/a'})`);
console.log(`page scrollY during drag: ${scrollBefore} -> ${scrollAfter}  (${scrollBefore === scrollAfter ? 'OK: page did NOT scroll' : 'WARN: page scrolled'})`);
console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
console.log('done →', OUT);
