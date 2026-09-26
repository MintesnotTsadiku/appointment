import { test, expect } from "playwright/test";

test("independent-owner-journey", async ({ page }, testInfo) => {
  const marker = process.env.SOLO_QA_MARKER;
  await page.goto("/onboarding", { waitUntil: "networkidle" });
  await page.getByLabel("Business structure", { exact: true }).selectOption("individual");
  await page.getByLabel("Independent business name", { exact: true }).fill(marker);
  await page.getByRole("button", { name: "Continue as independent provider", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/website$/);
  await expect(page.getByRole("combobox", { name: "Business", exact: true })).toHaveValue(marker);
  await page.getByLabel("Main visitor action", { exact: true }).selectOption("contact");
  await page.getByLabel("Website name", { exact: true }).fill(marker);
  await page.getByLabel("Website address", { exact: true }).fill(marker.toLowerCase());
  await page.getByRole("button", { name: "Create website draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save draft", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("solo-owner-draft.png"), fullPage: true });
  await page.getByRole("button", { name: "features", exact: true }).click();
  await page.getByLabel("blog", { exact: true }).check();
  await page.getByLabel("gallery", { exact: true }).check();
  await page.getByLabel("newsletter", { exact: true }).check();
  await page.getByRole("button", { name: "readiness", exact: true }).click();
  await page.getByRole("button", { name: "Check readiness", exact: true }).click();
  await expect(page.locator("main")).toContainText("Needs attention: booking");
  await page.getByRole("button", { name: "Publish website", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Your website is published");
  await page.screenshot({ path: testInfo.outputPath("solo-owner-published.png"), fullPage: true });
  await page.goto("/settings/website/content", { waitUntil: "networkidle" });
  await page.getByLabel("Article title", { exact: true }).fill("Independent business notes");
  await page.getByLabel("Article address", { exact: true }).fill("independent-notes");
  await page.getByLabel("Article text", { exact: true }).fill("A factual introduction to this independent business.");
  await page.getByRole("button", { name: "Save article draft", exact: true }).click();
  await expect(page.getByRole("button", { name: "Publish article", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Publish article", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Article published");
  const guest = await page.context().browser().newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL });
  try {
    const visitor = await guest.newPage();
    await visitor.goto(`/${marker.toLowerCase()}`, { waitUntil: "networkidle" });
    await expect(visitor.getByRole("heading", { name: marker, exact: true })).toBeVisible();
    await visitor.screenshot({ path: testInfo.outputPath("solo-guest-landing.png"), fullPage: true });
    await visitor.goto(`/${marker.toLowerCase()}/blog/independent-notes`, { waitUntil: "networkidle" });
    await expect(visitor.getByRole("heading", { name: "Independent business notes", exact: true })).toBeVisible();
    await visitor.screenshot({ path: testInfo.outputPath("solo-guest-article.png"), fullPage: true });
    await visitor.goto(`/${marker.toLowerCase()}/gallery`, { waitUntil: "networkidle" });
    await expect(visitor.locator("main")).toContainText("Check back");
    await visitor.screenshot({ path: testInfo.outputPath("solo-guest-empty-gallery.png"), fullPage: true });
  } finally { await guest.close(); }
});
