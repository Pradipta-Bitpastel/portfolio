import { test, expect } from '@playwright/test';

const sections = ['hero','about','skills','projects','experience','contact'];

test.describe('Portfolio smoke', () => {
  test('hero loads and SYSTEM headline is visible', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', e => consoleErrors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    await page.goto('/');
    await expect(page.locator('#hero')).toBeVisible();
    await expect(page.locator('text=/SYSTEM/i').first()).toBeVisible({ timeout: 8000 });
    // Tolerate a small number of expected errors (e.g. webgl in sandbox)
    const unexpected = consoleErrors.filter(e => !/(webgl|hardware acceleration|sourcemap)/i.test(e));
    expect(unexpected).toEqual([]);
  });

  test('canvas OR svg fallback is present', async ({ page }) => {
    await page.goto('/');
    // wait a bit for dynamic import + hydrate
    await page.waitForTimeout(2000);
    const canvas = await page.locator('canvas').count();
    const svgFallback = await page.locator('svg[data-fallback="core"]').count();
    expect(canvas + svgFallback).toBeGreaterThan(0);
  });

  for (const id of sections) {
    test(`section ${id} is reachable and visible`, async ({ page }) => {
      await page.goto(`/#${id}`);
      await page.waitForTimeout(1000);
      await expect(page.locator(`#${id}`)).toBeVisible();
    });
  }

  test('scroll through page does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('/');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      return new Promise<void>(resolve => {
        let y = 0;
        const interval = setInterval(() => {
          window.scrollTo(0, y);
          y += 400;
          if (y > document.body.scrollHeight) { clearInterval(interval); resolve(); }
        }, 150);
      });
    });
    const unexpected = errors.filter(e => !/(webgl|hardware)/i.test(e));
    expect(unexpected).toEqual([]);
  });
});
