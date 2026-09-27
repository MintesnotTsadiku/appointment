import { test, expect } from "playwright/test";
import { readFile, writeFile } from "node:fs/promises";

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
        window.__contentVitals = { lcp: 0, cls: 0 };
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) window.__contentVitals.lcp = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__contentVitals.cls += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
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
          // DevTools evaluates the pinned audit engine without changing the
          // application's production script policy.
          await page.evaluate(await readFile(process.env.CONTENT_QA_AXE_PATH, "utf8"));
          const audit = await page.evaluate(async () => {
            const result = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } });
            const navigation = performance.getEntriesByType("navigation")[0];
            const reviewStyles = target => {
              const element = document.querySelector(target[0]);
              if (!element) return null;
              const style = getComputedStyle(element);
              const backgrounds = [];
              for (let parent = element; parent; parent = parent.parentElement) {
                const ancestor = getComputedStyle(parent);
                if (ancestor.backgroundImage !== "none" || ancestor.backgroundColor !== "rgba(0, 0, 0, 0)") {
                  backgrounds.push({ tag: parent.tagName, color: ancestor.backgroundColor, image: ancestor.backgroundImage });
                }
              }
              return { tag: element.tagName, color: style.color, decoration: style.textDecorationLine,
                fontSize: style.fontSize, fontWeight: style.fontWeight, backgrounds };
            };
            return { violations: result.violations.map(row => ({ id: row.id, impact: row.impact,
              description: row.description, nodes: row.nodes.map(node => ({ target: node.target, failureSummary: node.failureSummary })) })),
              incomplete: result.incomplete.map(row => ({ id: row.id, nodes: row.nodes.map(node => ({
                target: node.target, reviewStyles: reviewStyles(node.target), checks: [...node.any, ...node.all, ...node.none].map(check => ({
                  id: check.id, message: check.message, data: check.data,
                })),
              })) })),
              navigationMs: navigation?.domContentLoadedEventEnd,
              lcpMs: window.__contentVitals.lcp,
              cls: window.__contentVitals.cls,
              externalResources: performance.getEntriesByType("resource").filter(row =>
                /^https?:/.test(row.name) && new URL(row.name).origin !== location.origin).map(row => row.name),
            };
          });
          const keyboard = [];
          const keyboardSteps = await page.locator('a[href], button, input, select, textarea, [tabindex]').evaluateAll(elements =>
            Math.min(5, elements.filter(element => element.tabIndex >= 0 && !element.disabled &&
              element.getClientRects().length && getComputedStyle(element).visibility !== "hidden" &&
              !element.closest("[inert]")).length));
          expect(keyboardSteps).toBeGreaterThan(0);
          for (let tab = 0; tab < keyboardSteps; tab += 1) {
            await page.keyboard.press("Tab");
            // Existing scheduler controls animate their focus ring. Check the
            // visible result after that transition, rather than its first frame.
            await expect.poll(() => page.evaluate(() => {
              const style = getComputedStyle(document.activeElement);
              return (style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0) ||
                style.boxShadow !== "none";
            }), { timeout: 1000, message: `${key} ${surface} visible keyboard focus treatment` }).toBe(true);
            const focus = await page.evaluate(() => {
              const element = document.activeElement;
              const bounds = element?.getBoundingClientRect();
              const style = element && getComputedStyle(element);
              return { tag: element?.tagName, visible: Boolean(bounds?.width && bounds?.height),
                outline: style?.outlineStyle, outlineWidth: style?.outlineWidth,
                outlineColor: style?.outlineColor, color: style?.color,
                shadow: style?.boxShadow, name: element?.getAttribute("aria-label") || element?.textContent?.trim() || element?.getAttribute("placeholder") };
            });
            expect(focus.tag).not.toBe("BODY");
            expect(focus.visible).toBe(true);
            expect((focus.outline !== "none" && Number.parseFloat(focus.outlineWidth) > 0) ||
              focus.shadow !== "none", `${key} ${surface} visible keyboard focus treatment`).toBe(true);
            keyboard.push(focus);
          }
          let inlineLinkReview;
          if (surface === "article") {
            // Probe the rendered stylesheet without altering a stored release.
            await page.locator(`article.${key}-content-article`).evaluate((article, href) => {
              const paragraph = document.createElement("p");
              paragraph.dataset.qaInlineLinkReview = "true";
              paragraph.append("Style review: ");
              const link = document.createElement("a");
              link.href = href;
              link.textContent = "Read the booking information";
              paragraph.append(link);
              article.append(paragraph);
              link.focus();
            }, row.root + "/book");
            const probe = page.locator('[data-qa-inline-link-review="true"]');
            inlineLinkReview = await probe.locator("a").evaluate(link => ({
              decoration: getComputedStyle(link).textDecorationLine,
              focused: document.activeElement === link,
              outline: getComputedStyle(link).outlineStyle,
            }));
            expect(inlineLinkReview.decoration).toContain("underline");
            expect(inlineLinkReview.focused).toBe(true);
            await probe.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-inline-link-review.png`) });
            await probe.evaluate(element => element.remove());
          }
          reports.push({ surface, ...audit, keyboard, inlineLinkReview });
          await writeFile(testInfo.outputPath(`${key}-${width}-${mode}-gates.json`), JSON.stringify({
            engine: "axe-core 4.11.0", viewport: width, mode, scope: "Automated WCAG A/AA checks, keyboard traversal, and local compiled-production navigation budget; manual accessibility review remains separate.", reports,
          }, null, 2));
          expect.soft(audit.violations, `${key} ${surface} accessibility`).toEqual([]);
          expect.soft(audit.externalResources, `${key} ${surface} external resource requests`).toEqual([]);
          expect.soft(audit.navigationMs, `${key} ${surface} local DOM load budget`).toBeLessThan(15000);
          expect.soft(audit.lcpMs, `${key} ${surface} local largest paint budget`).toBeGreaterThan(0);
          expect.soft(audit.lcpMs, `${key} ${surface} local largest paint budget`).toBeLessThan(2500);
          expect.soft(audit.cls, `${key} ${surface} local layout stability budget`).toBeLessThanOrEqual(0.1);
        }
        await page.keyboard.press("Tab");
        expect(await page.evaluate(() => document.activeElement?.tagName !== "BODY")).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`${key}-${width}-${mode}-gates.png`), fullPage: true });
      } finally { await context.close(); }
    });
  }
}
