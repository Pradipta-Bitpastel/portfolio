import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "iphone-se",   width: 375,  height: 812 },
  { name: "iphone-11",   width: 414,  height: 896 },
  { name: "ipad",        width: 768,  height: 1024 },
  { name: "ipad-land",   width: 1024, height: 768 },
  { name: "laptop",      width: 1280, height: 800 },
  { name: "desktop",     width: 1920, height: 1080 }
];

for (const vp of VIEWPORTS) {
  test.describe(`viewport ${vp.name} ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test("loads, no overflow, no console errors", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
      });

      await page.goto("/", { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(800);

      // No horizontal overflow
      const overflow = await page.evaluate(() => {
        const html = document.documentElement;
        return html.scrollWidth - html.clientWidth;
      });
      expect(overflow, `horizontal overflow ${overflow}px`).toBeLessThanOrEqual(2);

      // Hero heading visible
      const heroVisible = await page
        .locator("h1, [data-testid='hero-heading'], main")
        .first()
        .isVisible();
      expect(heroVisible).toBe(true);

      // Scroll through sections
      const sectionIds = ["hero", "about", "skills", "projects", "experience", "contact"];
      for (const id of sectionIds) {
        await page.evaluate((sid) => {
          const el = document.getElementById(sid);
          if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
        }, id);
        await page.waitForTimeout(400);
      }

      // No fatal errors. Filter benign warnings.
      const fatal = errors.filter(
        (e) =>
          !e.includes("ResizeObserver") &&
          !e.includes("Hydration") &&
          !e.includes("Warning:") &&
          !e.toLowerCase().includes("failed to load resource") // 3rd-party HDR fetches
      );
      expect(fatal, `fatal console/page errors:\n${fatal.join("\n")}`).toHaveLength(0);
    });
  });
}
