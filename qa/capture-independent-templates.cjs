const fs = require("fs");
const path = require("path");
const { chromium } = require("/home/minte/projects/develop-bench/apps/agent_harness/node_modules/playwright");

const baseURL = process.env.PUBLIC_EXPERIENCE_BASE_URL || "http://127.0.0.84:44430";
const outputDir = process.env.PUBLIC_EXPERIENCE_OUTPUT_DIR || path.resolve(__dirname, "evidence/public-experience-independent-v1");
const allSites = [
  ["selam", "selam-studio", "selam-movement"],
  ["bloom", "bloom-studio", "bloom-hair"],
  ["meron", "meron-studio", "meron-atelier"],
  ["abugida", "abugida-studio", "abugida-language"],
  ["tena", "tena-studio", "tena-clinic"],
];
const requestedSiteKeys = new Set((process.env.PUBLIC_EXPERIENCE_SITE_KEYS || "").split(",").filter(Boolean));
const sites = requestedSiteKeys.size ? allSites.filter(([key]) => requestedSiteKeys.has(key)) : allSites;
const modes = (process.env.PUBLIC_EXPERIENCE_MODES || "").split(",").filter(Boolean);

async function capture(page, key, slug, recipe, suffix, mode) {
  const consoleErrors = [];
  const networkErrors = [];
  const badResponses = [];
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(`${message.text()} ${message.location().url || ""}`.trim());
  };
  const onRequestFailed = (request) => networkErrors.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || "failed"}`);
  const onResponse = (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  };
  page.on("console", onConsole);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);
  if (mode) await page.addInitScript((preference) => localStorage.setItem("pe-display-mode", preference), mode);
  const response = await page.goto(`${baseURL}/${slug}${suffix}`, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) throw new Error(`${slug}${suffix} returned ${response?.status()}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  const modeSelector = mode ? `[data-pe-mode="${mode}"]` : "";
  const selector = suffix ? `[data-pe-booking][data-pe-recipe="${recipe}"]${modeSelector}` : `[data-pe-root][data-pe-recipe="${recipe}"]${modeSelector}`;
  await page.locator(selector).waitFor({ state: "visible", timeout: 20_000 });
  const logo = page.locator(".pe-brand-logo").first();
  await logo.waitFor({ state: "visible", timeout: 20_000 });
  const logoSrc = await logo.getAttribute("src");
  const logoLoaded = await logo.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0);
  if (!logoLoaded || !logoSrc?.endsWith("/" + key + "-logo.webp")) throw new Error(key + " logo did not load");
  await page.waitForFunction((siteKey) => document.querySelector(`link[rel~="icon"][data-public-experience]`)?.getAttribute("href")?.endsWith("/" + siteKey + "-favicon.png"), key);
  const faviconHref = await page.locator(`link[rel~="icon"][data-public-experience]`).getAttribute("href");
  await page.waitForTimeout(900);
  const surface = suffix ? "book" : "landing";
  const viewport = page.viewportSize().width < 600 ? "mobile" : "desktop";
  const modeSuffix = mode ? `-${mode}` : "";
  await page.screenshot({ path: path.join(outputDir, `${key}-${surface}${modeSuffix}-${viewport}.png`), fullPage: !suffix });
  page.off("console", onConsole);
  page.off("requestfailed", onRequestFailed);
  page.off("response", onResponse);
  if (consoleErrors.length || networkErrors.length) throw new Error(JSON.stringify({ key, surface, viewport, consoleErrors, networkErrors, badResponses }));
  return { key, surface, viewport, mode: mode || "resolved", logoSrc, faviconHref, consoleErrors, networkErrors, badResponses };
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (const [key, slug, recipe] of sites) {
      for (const mode of modes.length ? modes : [null]) {
        for (const suffix of ["", "/book"]) {
          const context = await browser.newContext({ viewport });
          const page = await context.newPage();
          results.push(await capture(page, key, slug, recipe, suffix, mode));
          fs.writeFileSync(path.join(outputDir, "validation-summary.json"), JSON.stringify({ baseURL, results }, null, 2));
          await page.close();
          await context.close();
        }
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(outputDir, "validation-summary.json"), JSON.stringify({ baseURL, results }, null, 2));
  console.log(JSON.stringify({ ok: true, outputDir, scenarios: results.length }));
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
