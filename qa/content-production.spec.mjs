import { test, expect } from "playwright/test";
import { writeFile } from "node:fs/promises";
import { stableScreenshot } from "./owner-validation.mjs";

test("production-security-and-cache-upgrade", async ({ browser }, testInfo) => {
  const world = JSON.parse(process.env.SHOWCASE_QA_WORLD);
  const context = await browser.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL,
    viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  const privateRequests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (/membership\.context|socket\.io|list_owned_content/.test(request.url())) privateRequests.push(new URL(request.url()).pathname);
  });
  const checks = [];
  try {
    for (const [key, row] of Object.entries(world)) {
      const response = await page.goto(row.root, { waitUntil: "networkidle" });
      await expect(page.locator("h1").first()).toBeVisible();
      const html = await response.text();
      expect(html).not.toContain("{{");
      expect(html).toContain("/assets/appointment/frontend/assets/");
      const nonce = html.match(/<script[^>]*nonce="([^"]+)"/)?.[1];
      expect(nonce).toBeTruthy();
      expect(response.headers()["content-security-policy"]).toContain(`'nonce-${nonce}'`);
      expect(response.headers()["content-security-policy"]).not.toContain("'unsafe-eval'");
      expect(response.headers()["x-content-type-options"]).toBe("nosniff");
      checks.push({ template: key, production_entry: true, nonce_matches: true });
    }
    expect(errors).toEqual([]);
    expect(privateRequests).toEqual([]);
    const unsolicitedPrivateRequests = [...privateRequests];
    await page.evaluate(async () => {
      for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
      for (const name of ["html-cache", "api-cache", "static-data-cache", "schedule-pages-cache"]) {
        const cache = await caches.open(name);
        await cache.put(new Request(location.origin + "/synthetic-private-previous-session"), new Response("synthetic previous user"));
      }
      const other = await caches.open("unrelated-application-acceptance");
      await other.put(new Request(location.origin + "/synthetic-public-marker"), new Response("public marker"));
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
    const worker = await page.evaluate(async () => ({
      scope: (await navigator.serviceWorker.ready).scope,
      caches: await caches.keys(),
    }));
    expect(new URL(worker.scope).pathname).toBe("/");
    for (const name of ["html-cache", "api-cache", "static-data-cache", "schedule-pages-cache"]) expect(worker.caches).not.toContain(name);
    expect(worker.caches).toContain("unrelated-application-acceptance");
    const privateResponse = await page.request.get("/api/method/appointment.content.api.list_owned_content");
    expect(privateResponse.ok()).toBe(false);
    expect(privateResponse.headers()["cache-control"]).toContain("no-store");
    await page.evaluate(async () => {
      await fetch("/api/method/appointment.content.api.list_owned_content");
    });
    const cachedPrivatePaths = await page.evaluate(async () => {
      const found = [];
      for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) {
        if (/\/api\/|\/settings|\/newsletter\//.test(new URL(request.url).pathname)) found.push(new URL(request.url).pathname);
      }
      return found;
    });
    expect(cachedPrivatePaths).toEqual([]);
    await stableScreenshot(page, { path: testInfo.outputPath("production-public-security.png"), fullPage: true });
    await writeFile(testInfo.outputPath("production-gates.json"), JSON.stringify({
      production_entries: checks, page_errors: errors, guest_private_requests: unsolicitedPrivateRequests,
      worker_root_scope: true, legacy_private_caches_removed: true,
      other_application_cache_preserved: true, private_api_denied: true,
      private_api_network_only: true, cached_private_paths: cachedPrivatePaths,
    }, null, 2));
  } finally {
    await page.evaluate(() => caches.delete("unrelated-application-acceptance")).catch(() => {});
    await context.close();
  }
});
