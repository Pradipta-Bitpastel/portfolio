import { test } from "@playwright/test";

const VIEWPORTS = [
  { name: "375x812",   width: 375,  height: 812 },
  { name: "414x896",   width: 414,  height: 896 },
  { name: "768x1024",  width: 768,  height: 1024 },
  { name: "1024x768",  width: 1024, height: 768 },
  { name: "1280x800",  width: 1280, height: 800 },
  { name: "1920x1080", width: 1920, height: 1080 }
];

const SECTIONS = ["hero", "about", "skills", "projects", "experience", "contact"];

for (const vp of VIEWPORTS) {
  test.describe(`screenshots ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    for (const id of SECTIONS) {
      test(`${vp.name} - ${id}`, async ({ page }) => {
        await page.goto("http://localhost:3300/", { waitUntil: "networkidle", timeout: 45000 });
        await page.waitForTimeout(600);
        await page.evaluate((sid) => {
          const el = document.getElementById(sid);
          if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
        }, id);
        await page.waitForTimeout(700);
        await page.screenshot({
          path: `artifacts/screenshots/iter5/${vp.name}-${id}.png`,
          fullPage: false
        });
      });
    }
  });
}
