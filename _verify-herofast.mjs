// Fast hero-only capture (night + day) for placement tuning.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT = process.argv[2] || '/tmp/herofast';
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
await page.waitForSelector('canvas', { state: 'attached', timeout: 30000 }).catch(() => console.log('WARN: no canvas'));
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(3800);
await page.screenshot({ path: `${OUT}/night-hero.png` });
const toggle = page.locator('button[aria-label*="day" i], button[aria-label*="night" i]').first();
await toggle.click({ force: true });
await page.waitForTimeout(2200);
await page.screenshot({ path: `${OUT}/day-hero.png` });
console.log('errors:', errors.length ? errors.slice(0, 10) : 'none');
await browser.close();
console.log('done →', OUT);
