import { test } from '@playwright/test';
const sections = ['hero','about','skills','projects','experience','contact'];
test.describe.configure({ mode: 'serial' });

test.setTimeout(240000);

test('section screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.waitForTimeout(3000);
  for (const id of sections) {
    if (id === 'hero') {
      // Hero: capture the LANDING state (top of page), not mid-transition.
      await page.evaluate(() => {
        window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      });
      await page.waitForTimeout(1200);
    } else {
      // Other sections: scroll the section into view, then ~600px down
      // to capture mid-pin / mid-scrub dramatic state.
      await page.evaluate((sid) => {
        const el = document.getElementById(sid);
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const targetTop = rect.top + window.scrollY;
        window.scrollTo({ top: targetTop, behavior: 'instant' as ScrollBehavior });
      }, id);
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        window.scrollBy({ top: 600, behavior: 'instant' as ScrollBehavior });
      });
      await page.waitForTimeout(1200);
    }
    await page.screenshot({
      path: `artifacts/screenshots/section-${id}-iter7.png`,
      fullPage: false
    });
  }
});
