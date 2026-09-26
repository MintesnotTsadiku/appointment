import { test, expect } from "playwright/test";
import { writeFile } from "node:fs/promises";

const world = JSON.parse(process.env.SHOWCASE_QA_WORLD || "{}");
for (const key of ["selam", "bloom", "meron", "abugida", "tena"]) {
  for (const [width, mode] of [["desktop", "light"], ["mobile", "dark"]]) {
    test(`gates-${key}-${width}-${mode}`, async ({ browser }, testInfo) => {
      const row = world[key];
      const context = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL,
        viewport: width === "desktop" ? { width: 1440, height: 900 } : { width: 390, height: 844 },
        colorScheme: mode, reducedMotion: "reduce" });
      await context.addInitScript(preference => {
        localStorage.setItem("pe-display-mode", preference);
        localStorage.setItem("vite-ui-theme", preference);
      }, mode);
      const page = await context.newPage();
      const reports = [];
      try {
        for (const [surface, path] of [
          ["landing", row.root], ["book", row.root + "/book"], ["scheduler", row.scheduler],
          ["blog", row.root + "/blog"], ["article", row.root + "/blog/" + row.article],
          ["gallery", row.root + "/gallery"], ["collection", row.root + "/gallery/showcase-collection-2"],
        ]) {
          await page.goto(path, { waitUntil: "networkidle" });
          await expect(page.locator("h1").first()).toBeVisible();
          if (surface === "scheduler") await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-booking-branded="true"] [style], [data-booking-branded="true"]')).every(element => !element.style.opacity || Number(element.style.opacity) === 1));
          await page.addScriptTag({ path: process.env.CONTENT_QA_AXE_PATH });
          const audit = await page.evaluate(async () => {
            const result = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
            const navigation = performance.getEntriesByType("navigation")[0];
            return { violations: result.violations.map(row => ({ id: row.id, impact: row.impact,
              description: row.description, nodes: row.nodes.map(node => ({ target: node.target, failureSummary: node.failureSummary })) })),
              incomplete: result.incomplete.map(row => ({ id: row.id, nodes: row.nodes.map(node => ({
                target: node.target, checks: [...node.any, ...node.all, ...node.none].map(check => ({
                  id: check.id, message: check.message, data: check.data,
                })),
              })) })),
              navigationMs: navigation?.domContentLoadedEventEnd,
              externalResources: performance.getEntriesByType("resource").filter(row =>
                /^https?:/.test(row.name) && new URL(row.name).origin !== location.origin).map(row => row.name),
            };
          });
          reports.push({ surface, ...audit });
          await writeFile(testInfo.outputPath(`${key}-${width}-${mode}-gates.json`), JSON.stringify({
            engine: "axe-core 4.11.0", viewport: width, mode, scope: "Automated WCAG A/AA checks and local development navigation budget; manual accessibility review remains separate.", reports,
          }, null, 2));
          expect(audit.violations, `${key} ${surface} accessibility`).toEqual([]);
          expect(audit.externalResources, `${key} ${surface} external resource requests`).toEqual([]);
          expect(audit.navigationMs, `${key} ${surface} local DOM load budget`).toBeLessThan(15000);
        }
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => document.activeElement?.tagName !== "BODY")).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-gates.png`), fullPage: true });
      } finally { await context.close(); }
    });
  }
}
