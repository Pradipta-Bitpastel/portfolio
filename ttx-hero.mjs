import { chromium } from '@playwright/test';
const URL = 'http://localhost:3011/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForTimeout(5000);
const sample = () => page.evaluate(() => {
  const imgs = [...document.querySelectorAll('.hero-layer img')];
  const out = imgs.filter((i) => i.classList.contains('hero-fade-out'));
  return {
    theme: document.documentElement.dataset.theme,
    total: imgs.length, outgoing: out.length,
    outOpacity: out.length ? +(+getComputedStyle(out[0]).opacity).toFixed(2) : null,
    blankBase: imgs.filter((i) => !i.classList.contains('hero-fade-out')).filter((i) => i.complete && i.naturalWidth === 0).length,
  };
});
const toggle = page.locator('button').filter({ hasText: /DAY|NIGHT/i }).first();
console.log('before:', JSON.stringify(await sample()));
await toggle.click({ force: true });
const stops = [80, 200, 400, 600, 800, 1000, 1300];
let last = 0;
for (const t of stops) { await page.waitForTimeout(t - last); last = t; console.log(`  @${t}ms`, JSON.stringify(await sample())); if (t === 500 || t === 600) await page.screenshot({ path: '/tmp/ttx-hero-mid.png' }); }
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
