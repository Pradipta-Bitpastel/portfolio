import { test } from '@playwright/test';

const sections = ['hero', 'about', 'skills', 'projects', 'experience', 'contact'];
const sizes = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

for (const sz of sizes) {
  test(`responsive ${sz.name}`, async ({ page }) => {
    await page.setViewportSize({ width: sz.width, height: sz.height });
    await page.goto('http://localhost:3010/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    for (const id of sections) {
      await page.evaluate(
        (sid) => document.getElementById(sid)?.scrollIntoView({ behavior: 'auto', block: 'start' }),
        id
      );
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: `artifacts/screenshots/resp-${sz.name}-${id}.png`,
        fullPage: false
      });
    }
  });
}
