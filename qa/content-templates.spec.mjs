import { test, expect } from "playwright/test";

const world = JSON.parse(process.env.SHOWCASE_QA_WORLD || "{}");
for (const key of ["selam", "bloom", "meron", "abugida", "tena"]) {
  for (const width of ["desktop", "mobile"]) for (const mode of ["light", "dark"]) {
    test(`certified-${key}-${width}-${mode}`, async ({ browser }, testInfo) => {
      const row = world[key];
      expect(row?.recipe).toBeTruthy();
      const context = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL,
        viewport: width === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 }, colorScheme: mode, reducedMotion: "reduce",
        // Controlled empty/error API responses must reach Playwright routing.
        // The separate production suite qualifies the actual service worker.
        serviceWorkers: "block" });
      await context.addInitScript((preference) => {
        localStorage.setItem("pe-display-mode", preference);
        localStorage.setItem("vite-ui-theme", preference);
      }, mode);
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const failedResponses = [];
      page.on("response", (response) => { if (response.status() >= 500) failedResponses.push(new URL(response.url()).pathname); });
      const surfaces = [
        ["landing", row.root], ["book", row.root + "/book"], ["scheduler", row.scheduler],
        ["blog", row.root + "/blog"], ["article", row.root + "/blog/" + row.article],
        ["gallery", row.root + "/gallery"], ["collection", row.root + "/gallery/showcase-collection-2"],
      ];
      for (const [surface, path] of surfaces) {
        await page.goto(path, { waitUntil: "networkidle" });
        await expect(page.locator("h1").first()).toBeVisible();
        if (surface !== "scheduler") await expect(page.locator(`[data-pe-recipe="${row.recipe}"][data-pe-mode="${mode}"]`).first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        for (const image of await page.locator("img").all()) {
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true);
        }
        await page.evaluate(() => scrollTo(0, 0));
        await page.evaluate(() => document.fonts.ready);
        if (surface === "landing" && key === "selam") {
          const gap = await page.locator(".selam-people h2").evaluate(heading => {
            const title = document.createRange();
            title.selectNodeContents(heading);
            const introduction = document.createRange();
            introduction.selectNodeContents(heading.nextElementSibling);
            return introduction.getBoundingClientRect().top - title.getBoundingClientRect().bottom;
          });
          expect(gap, "team heading and introduction have separate rendered text bounds").toBeGreaterThanOrEqual(0);
        }
        if (surface === "scheduler") await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-booking-branded="true"] [style], [data-booking-branded="true"]')).every(element => !element.style.opacity || Number(element.style.opacity) === 1));
        await page.mouse.move(0, 0);
        await page.evaluate(() => document.activeElement?.blur());
        await page.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-${surface}.png`), fullPage: true, animations: "disabled" });
      }
      await page.goto(row.root + "/blog", { waitUntil: "networkidle" });
      const signup = page.locator(`[data-newsletter-template="${key}"]`);
      await expect(signup.getByLabel("Email address", { exact: true })).toBeVisible();
      await expect(signup.getByRole("button")).toBeDisabled();
      await signup.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-newsletter.png`) });
      await page.goto(row.root + "/blog/this-article-does-not-exist", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Content unavailable", exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-unavailable.png`), fullPage: true, animations: "disabled" });
      // Controlled API empty/error responses validate template states without changing seeded publications.
      await page.route("**/api/method/appointment.content.public_api.get_article_index?*", (route) => route.fulfill({
        status: 200, contentType: "application/json", body: JSON.stringify({ message: { articles: [] } }),
      }));
      await page.goto(row.root + "/blog", { waitUntil: "networkidle" });
      await expect(page.locator(`[data-content-template="${key}"]`)).toBeVisible();
      await expect(page.locator("main")).toContainText("Check back");
      await page.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-simulated-empty.png`), fullPage: true, animations: "disabled" });
      await page.unroute("**/api/method/appointment.content.public_api.get_article_index?*");
      await page.route("**/api/method/appointment.content.public_api.get_gallery_index?*", (route) => route.fulfill({
        status: 200, contentType: "application/json", body: JSON.stringify({ message: { galleries: [] } }),
      }));
      await page.goto(row.root + "/gallery", { waitUntil: "networkidle" });
      await expect(page.locator("main")).toContainText("Check back");
      await page.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-simulated-gallery-empty.png`), fullPage: true, animations: "disabled" });
      await page.unroute("**/api/method/appointment.content.public_api.get_gallery_index?*");
      await page.route("**/api/method/appointment.content.public_api.get_gallery_index?*", (route) => route.fulfill({
        status: 503, contentType: "application/json", body: JSON.stringify({ message: "Synthetic unavailable response" }),
      }));
      await page.goto(row.root + "/gallery", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Content unavailable", exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-simulated-error.png`), fullPage: true, animations: "disabled" });
      await page.unroute("**/api/method/appointment.content.public_api.get_gallery_index?*");
      await page.goto(row.root + "/gallery/this-collection-does-not-exist", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: "Content unavailable", exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-collection-unavailable.png`), fullPage: true, animations: "disabled" });
      await page.route("**/api/method/appointment.content.newsletter.public_api.signup_status?*", (route) => route.fulfill({
        status: 200, contentType: "application/json", body: JSON.stringify({ message: { available: false } }),
      }));
      await page.goto(row.root + "/blog", { waitUntil: "networkidle" });
      await expect(signup).toContainText("signup is currently unavailable");
      await signup.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-signup-unavailable.png`) });
      expect(failedResponses.filter((path) => !path.endsWith("get_gallery_index"))).toEqual([]);
      await context.close();
    });
  }
}
