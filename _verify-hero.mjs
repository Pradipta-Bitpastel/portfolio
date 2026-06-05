// Headed real-Chrome verification (real GPU so the WebGL traveler mounts).
// Usage: node /tmp/verify-hero.mjs [outdir]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = process.argv[2] || '/tmp/verify';
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:3000/?force3d';

const browser = await chromium.launch({
  headless: false,
  channel: 'chrome',
  args: [
    '--use-angle=metal',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=CalculateNativeWinOcclusion',
  ],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
});

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded' });

// Wait out the rAF-timed Preloader: it mounts a full-screen z-100 curtain
// (role=status, aria-label="Loading") and removes ITSELF from the DOM on
// completion. The page is SSR'd tall, so an overflow/height check races it —
// instead wait for the curtain to attach, then DETACH.
await page.waitForSelector('[aria-label="Loading"]', { state: 'attached', timeout: 8000 }).catch(() => {});
await page.waitForSelector('[aria-label="Loading"]', { state: 'detached', timeout: 45000 }).catch(() => console.log('WARN: preloader never detached'));

// The R3F canvas is lazy (~5s in dev). Wait for it to actually mount so the
// robot is present in EVERY shot (not just the later ones).
await page.waitForSelector('canvas', { state: 'attached', timeout: 30000 }).catch(() => console.log('WARN: canvas never mounted'));
await page.waitForTimeout(3800); // let the CAMERA + robot fully damp to pose 0 (first shot was racing the settle)

// Stacking probe: confirm the z-layering is actually live in the DOM.
const stacking = await page.evaluate(() => {
  const wrap = document.querySelector('canvas')?.closest('[aria-hidden="true"]');
  const z20 = document.querySelector('div.relative.z-20');
  const getZ = (el) => (el ? getComputedStyle(el).zIndex : '(none)');
  return {
    canvasWrapperZ: getZ(wrap),
    sectionWrapperPresent: !!z20,
    sectionWrapperZ: getZ(z20),
  };
});
console.log('STACKING:', JSON.stringify(stacking));

const probe = () => page.evaluate(() => {
  const c = document.querySelector('canvas');
  return {
    theme: document.documentElement.dataset.theme || '(none)',
    scrollY: Math.round(window.scrollY),
    docH: document.documentElement.scrollHeight,
    vh: window.innerHeight,
    canvas: c ? { w: c.width, h: c.height, cls: c.className } : null,
  };
});

async function shotAt(frac, name) {
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  const vh = await page.evaluate(() => window.innerHeight);
  const y = Math.round((docH - vh) * frac);
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  // let the render-loop damp settle on the new pose + parallax catch up
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const p = await probe();
  console.log(`  ${name}: frac=${frac} y=${p.scrollY} canvas=${p.canvas ? p.canvas.w + 'x' + p.canvas.h : 'NONE'}`);
}

console.log('initial probe:', JSON.stringify(await probe()));

// ---- NIGHT (default) ----
console.log('NIGHT:');
await shotAt(0, 'night-0-hero');
await shotAt(0.30, 'night-1');
await shotAt(0.55, 'night-2');
await shotAt(0.85, 'night-3');

// ---- toggle to DAY ----
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(500);
const toggle = page.locator('button[aria-label*="day" i], button[aria-label*="night" i]').first();
await toggle.click({ force: true });
await page.waitForTimeout(1800); // let the theme cross-fade + overlay settle
console.log('after toggle, theme =', (await probe()).theme);

console.log('DAY:');
await shotAt(0, 'day-0-hero');
await shotAt(0.30, 'day-1');
await shotAt(0.85, 'day-3');

console.log('console errors:', errors.length ? errors.slice(0, 20) : 'none');
await browser.close();
console.log('done →', OUT);
