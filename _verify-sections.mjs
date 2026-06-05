// Capture named sections as the user sees them (scrolled to center), logging
// each section's whole-page scroll progress so I can map section -> pose.
// Usage: node _verify-sections.mjs [outdir] [theme:night|day]
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const OUT = process.argv[2] || '/tmp/sections';
const THEME = process.argv[3] || 'night';
fs.mkdirSync(OUT, { recursive: true });
const IDS = ['about', 'metrics', 'skills', 'projects', 'experience', 'contact'];

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
await page.waitForTimeout(2500);

if (THEME === 'day') {
  await page.locator('button[aria-label*="day" i], button[aria-label*="night" i]').first().click({ force: true });
  await page.waitForTimeout(1800);
}

for (const id of IDS) {
  const info = await page.evaluate((sid) => {
    const el = document.getElementById(sid);
    if (!el) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    return { ok: true };
  }, id);
  if (!info) { console.log(`  ${id}: NOT FOUND`); continue; }
  await page.waitForTimeout(1400); // robot pose damp settle
  const p = await page.evaluate(() => {
    const denom = document.documentElement.scrollHeight - window.innerHeight;
    const ndc = window.__robotNDC || null;
    return { progress: +(window.scrollY / denom).toFixed(3), y: Math.round(window.scrollY), ndc };
  });
  await page.screenshot({ path: `${OUT}/${THEME}-${id}.png` });
  console.log(`  ${id}: progress=${p.progress} robot_screen=${p.ndc ? `(${Math.round(p.ndc.x*100)}%, ${Math.round(p.ndc.y*100)}%)` : 'n/a'}`);
}
console.log('errors:', errors.length ? errors.slice(0, 8) : 'none');
await browser.close();
console.log('done →', OUT, THEME);
