import { test, expect } from "playwright/test";

const world = JSON.parse(process.env.RECOVERY_QA_WORLD || "[]");
test("recovered-public-routes-and-consent", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    expect(world).toHaveLength(5);
    for (const row of world) {
      for (const [surface, path] of [["landing", row.root], ["article", row.root + row.article], ["collection", row.root + row.gallery]]) {
        await page.goto(path, { waitUntil: "networkidle" });
        await expect(page.locator("h1").first()).toBeVisible();
        await expect(page.locator(`[data-pe-recipe="${row.recipe}"]`).first()).toBeVisible();
        for (const image of await page.locator("img").all()) {
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0)).toBe(true);
        }
        await page.evaluate(() => document.fonts.ready);
        // The older rollback build has a dismissible asset-ready banner.
        // Exercise its public Close control if present, without masking pixels.
        const legacyBanner = page.getByText("App ready to work offline", { exact: true });
        if (await legacyBanner.isVisible()) {
          await legacyBanner.locator("../../..").getByRole("button", { name: "Close", exact: true }).click();
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: testInfo.outputPath(`recovered-${row.recipe}-${surface}.png`), fullPage: true, animations: "disabled" });
      }
    }
    await page.goto(process.env.RECOVERY_QA_UNSUBSCRIBE_PATH, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Unsubscribe from newsletter", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("unsubscribed");
    await page.screenshot({ path: testInfo.outputPath("recovered-guest-unsubscribe.png"), fullPage: true, animations: "disabled" });
  } finally { await context.close(); }
});
