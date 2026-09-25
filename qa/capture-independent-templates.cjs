const fs = require("fs");
const path = require("path");
const { chromium } = require("/home/minte/projects/develop-bench/apps/agent_harness/node_modules/playwright");

const baseURL = process.env.PUBLIC_EXPERIENCE_BASE_URL || "http://127.0.0.84:44430";
const outputDir = path.resolve(__dirname, "evidence/public-experience-independent-v1");
const sites = [
  ["selam", "selam-studio", "selam-movement"],
  ["bloom", "bloom-studio", "bloom-hair"],
  ["meron", "meron-studio", "meron-atelier"],
  ["abugida", "abugida-studio", "abugida-language"],
  ["tena", "tena-studio", "tena-clinic"],
];

async function capture(page, key, slug, recipe, suffix) {
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
  const response = await page.goto(`${baseURL}/${slug}${suffix}`, { waitUntil: "domcontentloaded" });
  if (!response?.ok()) throw new Error(`${slug}${suffix} returned ${response?.status()}`);
  await page.waitForLoadState("networkidle").catch(() => {});
  const selector = suffix ? `[data-pe-booking][data-pe-recipe="${recipe}"]` : `[data-pe-root][data-pe-recipe="${recipe}"]`;
  await page.locator(selector).waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForTimeout(900);
  const surface = suffix ? "book" : "landing";
  const viewport = page.viewportSize().width < 600 ? "mobile" : "desktop";
  await page.screenshot({ path: path.join(outputDir, `${key}-${surface}-${viewport}.png`), fullPage: !suffix });
  page.off("console", onConsole);
  page.off("requestfailed", onRequestFailed);
  page.off("response", onResponse);
  if (consoleErrors.length || networkErrors.length) throw new Error(JSON.stringify({ key, surface, viewport, consoleErrors, networkErrors, badResponses }));
  return { key, surface, viewport, consoleErrors, networkErrors, badResponses };
}

(async () => {
  fs.mkdirSync(outputDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    for (const [key, slug, recipe] of sites) {
      for (const suffix of ["", "/book"]) {
        const page = await context.newPage();
        results.push(await capture(page, key, slug, recipe, suffix));
        await page.close();
      }
    }
    await context.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(outputDir, "validation-summary.json"), JSON.stringify({ baseURL, results }, null, 2));
  console.log(JSON.stringify({ ok: true, outputDir, scenarios: results.length }));
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
