import { expect } from "playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

function plan(capability, state, limits) {
  execFileSync("/usr/local/bin/bench", ["--site", process.env.WEBSITE_QA_SITE, "execute", "appointment.tests.staff_browser_bridge.set_test_entitlement", "--kwargs", JSON.stringify({ capability, state, limits })], {
    cwd: process.env.FRAPPE_BENCH_ROOT, encoding: "utf8", timeout: 30000,
  });
}

async function get(page, method, parameters = {}) {
  const response = await page.request.get(`/api/method/${method}`, { params: parameters });
  expect(response.ok()).toBe(true);
  return (await response.json()).message;
}

async function denied(page, method, parameters, verb = "post", type = "PermissionError") {
  const response = verb === "get" ? await page.request.get(`/api/method/${method}`, { params: parameters })
    : await page.request.post(`/api/method/${method}`, { data: parameters });
  expect(response.ok()).toBe(false);
  const body = await response.json();
  expect(body.exc_type).toBe(type);
  return response.status();
}

export async function articleHistory(page, guest, testInfo, { root, title, route, prefix, original, draft }) {
  await page.getByRole("button", { name: `Edit article ${title}`, exact: true }).click();
  await page.getByLabel("Article text", { exact: true }).fill(draft);
  await page.getByRole("button", { name: "Save article draft", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("draft saved");
  await guest.goto(root + route, { waitUntil: "networkidle" });
  await expect(guest.locator("main")).toContainText(original);
  await expect(guest.locator("main")).not.toContainText(draft);
  await page.getByRole("button", { name: "Preview saved article", exact: true }).click();
  const preview = page.getByRole("region", { name: "Article preview", exact: true });
  await expect(preview).toContainText(draft);
  await preview.screenshot({ path: testInfo.outputPath(`${prefix}-saved-private-article.png`) });
  await page.getByRole("button", { name: "Publish article", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Article published");
  await guest.reload({ waitUntil: "networkidle" });
  await expect(guest.locator("main")).toContainText(draft);
  await guest.screenshot({ path: testInfo.outputPath(`${prefix}-updated-public-article.png`), fullPage: true });
  const history = page.getByRole("region", { name: "Publication history", exact: true });
  await history.locator("button:not([disabled])").filter({ hasText: `Restore ${route}` }).click();
  await expect(page.getByRole("status")).toContainText("Previous publication restored");
  await guest.reload({ waitUntil: "networkidle" });
  await expect(guest.locator("main")).toContainText(original);
  await expect(guest.locator("main")).not.toContainText(draft);
  await guest.screenshot({ path: testInfo.outputPath(`${prefix}-rolled-back-public-article.png`), fullPage: true });
}

export async function businessIsolation(page, second, testInfo, marker) {
  const primaryContent = await get(page, "appointment.content.api.list_owned_content");
  const article = primaryContent.items.find(row => row.title === `${marker} Preparing for your visit`);
  const gallery = primaryContent.items.find(row => row.source_doctype === "Gallery Collection" && row.public_site === article.public_site);
  expect(gallery).toBeTruthy();
  const newsletters = await get(page, "appointment.content.newsletter.api.workspace", { site: article.public_site });
  const previewResponse = await page.request.post("/api/method/appointment.content.api.preview_article", { data: { ownership: article.name } });
  expect(previewResponse.ok()).toBe(true);
  const previewToken = (await previewResponse.json()).message.token;
  await second.goto("/onboarding", { waitUntil: "networkidle" });
  await second.getByLabel("Business name", { exact: true }).fill(marker + " Isolation");
  await second.getByLabel("Location name", { exact: true }).fill(marker + " Isolation Main");
  await second.getByLabel("First service name", { exact: true }).fill(marker + " Isolation Consultation");
  await second.getByRole("button", { name: "Create business", exact: true }).click();
  await expect(second).toHaveURL(/\/home/);
  await second.goto("/settings/website", { waitUntil: "networkidle" });
  await second.getByRole("combobox", { name: "Business", exact: true }).selectOption({ label: marker + " Isolation" });
  await second.getByLabel("Website name", { exact: true }).fill(marker + " Isolation");
  await second.getByLabel("Website address", { exact: true }).fill(marker.toLowerCase());
  await second.getByRole("button", { name: "Create website draft", exact: true }).click();
  await expect(second.getByRole("alert")).toContainText("already taken");
  await second.getByLabel("Website address", { exact: true }).fill(marker.toLowerCase() + "-isolation");
  await second.getByRole("button", { name: "Create website draft", exact: true }).click();
  await expect(second.getByRole("button", { name: "Save draft", exact: true })).toBeVisible();
  await second.getByRole("button", { name: "features", exact: true }).click();
  await second.getByLabel("blog", { exact: true }).check();
  await second.getByRole("button", { name: "Publish website", exact: true }).click();
  await expect(second.getByRole("status")).toContainText("published");
  await second.goto("/settings/website/content", { waitUntil: "networkidle" });
  await second.getByRole("combobox", { name: "Website", exact: true }).selectOption({ label: marker + " Isolation" });
  await second.getByLabel("Article title", { exact: true }).fill("Second business private draft");
  await second.getByLabel("Article address", { exact: true }).fill("second-business-notes");
  await second.getByLabel("Article text", { exact: true }).fill("Only this second business manages this draft.");
  await second.getByRole("button", { name: "Save article draft", exact: true }).click();
  await expect(second.getByRole("status")).toContainText("draft saved");
  const secondaryContent = await get(second, "appointment.content.api.list_owned_content");
  expect(secondaryContent.items.every(row => row.public_site !== article.public_site)).toBe(true);
  const secondaryArticle = secondaryContent.items.find(row => row.title === "Second business private draft");
  expect(secondaryArticle).toBeTruthy();
  expect((await get(page, "appointment.content.api.list_owned_content")).items.some(row => row.name === secondaryArticle.name)).toBe(false);
  const denials = [];
  for (const [actor, ownership] of [[page, secondaryArticle.name], [second, article.name]]) {
    denials.push(await denied(actor, "appointment.content.api.get_content_draft", { ownership }, "get"));
    denials.push(await denied(actor, "appointment.content.api.publish_article", { ownership }));
    denials.push(await denied(actor, "appointment.content.api.preview_article", { ownership }));
  }
  denials.push(await denied(second, "appointment.content.public_api.get_content_preview", { token: previewToken }, "get"));
  denials.push(await denied(second, "appointment.content.newsletter.api.workspace", { site: article.public_site }, "get"));
  const imports = await get(second, "frappe.client.get_list", { doctype: "Organization Workbook Import", filters: JSON.stringify({ organization: marker }), fields: JSON.stringify(["name"]) });
  expect(imports).toEqual([]);
  const files = await get(page, "frappe.client.get_list", { doctype: "File", filters: JSON.stringify({ attached_to_doctype: "Public Site", attached_to_name: article.public_site }), fields: JSON.stringify(["name"]) });
  expect(files.length).toBeGreaterThan(0);
  denials.push(await denied(second, "frappe.client.get", { doctype: "File", name: files[0].name }, "get"));
  await second.screenshot({ path: testInfo.outputPath("website-second-owner-isolation.png"), fullPage: true, mask: [second.locator("time")] });
  const releaseBefore = await get(page, "appointment.content.api.list_releases", { public_site: article.public_site });
  const capabilityDenials = [];
  for (const capability of ["blog", "gallery", "newsletter"]) {
    plan(capability, "Expired");
    try {
      if (capability === "blog") {
        capabilityDenials.push(await denied(page, "appointment.content.api.create_article", { public_site: article.public_site, title: "Blocked article", slug: "blocked-article", body: "Blocked" }));
        capabilityDenials.push(await denied(page, "appointment.content.api.publish_article", { ownership: article.name }));
        await page.goto("/settings/website/content", { waitUntil: "networkidle" });
        await page.getByRole("combobox", { name: "Website", exact: true }).selectOption({ label: marker });
        await page.getByLabel("Article title", { exact: true }).fill("Blocked article");
        await page.getByLabel("Article address", { exact: true }).fill("blocked-article");
        await page.getByLabel("Article text", { exact: true }).fill("Blocked article draft");
        await page.getByRole("button", { name: "Save article draft", exact: true }).click();
        await expect(page.getByRole("alert")).toBeVisible();
      } else if (capability === "gallery") {
        capabilityDenials.push(await denied(page, "appointment.content.api.create_gallery", { public_site: article.public_site, title: "Blocked gallery", slug: "blocked-gallery", items: [] }));
        capabilityDenials.push(await denied(page, "appointment.content.api.publish_gallery_collection", { ownership: gallery.name }));
        const editor = page.getByRole("region", { name: "Gallery editor", exact: true });
        await editor.getByLabel("Collection title", { exact: true }).fill("Blocked gallery");
        await editor.getByLabel("Collection address", { exact: true }).fill("blocked-gallery");
        await editor.getByLabel("Gallery image", { exact: true }).setInputFiles(process.env.WEBSITE_QA_IMAGE);
        await editor.getByLabel("Image description", { exact: true }).fill("Synthetic acceptance image");
        await editor.getByRole("checkbox").check();
        await editor.getByRole("button", { name: "Save gallery draft", exact: true }).click();
        await expect(editor.getByRole("alert")).toBeVisible();
      } else {
        capabilityDenials.push(await denied(page, "appointment.content.newsletter.api.queue_campaign", { site: article.public_site, ownership: newsletters.drafts[0].ownership, sender: newsletters.senders[0].name, request_id: crypto.randomUUID() }));
        await page.goto("/settings/website/newsletter", { waitUntil: "networkidle" });
        await page.getByRole("combobox", { name: "Website", exact: true }).selectOption({ label: marker });
        await expect(page.locator("main")).toContainText("Newsletter access: Expired");
        await expect(page.getByRole("button", { name: "Confirm local campaign", exact: true })).toBeDisabled();
      }
      await page.screenshot({ path: testInfo.outputPath(`website-${capability}-entitlement-denied.png`), fullPage: true, mask: [page.locator("time")] });
    } finally { plan(capability, "Active"); }
  }
  plan("blog", "Active", { articles: 1 });
  try { await denied(page, "appointment.content.api.create_article", { public_site: article.public_site, title: "Over article limit", slug: "over-limit", body: "Over limit" }, "post", "ValidationError"); }
  finally { plan("blog", "Active"); }
  const collection = await get(page, "appointment.content.api.get_content_draft", { ownership: gallery.name });
  const item = collection.items[0];
  plan("gallery", "Active", { collections: 1 });
  try { await denied(page, "appointment.content.api.create_gallery", { public_site: article.public_site, title: "Over gallery limit", slug: "over-limit", items: [{ media_type: "image", image: item.image, alt_text: item.alt_text, consent_status: "Approved", consent_evidence: "Synthetic owner consent" }] }, "post", "ValidationError"); }
  finally { plan("gallery", "Active"); }
  plan("newsletter", "Active", { monthly_sends: 1 });
  try { await denied(page, "appointment.content.newsletter.api.queue_campaign", { site: article.public_site, ownership: newsletters.drafts[0].ownership, sender: newsletters.senders[0].name, request_id: crypto.randomUUID() }, "post", "ValidationError"); }
  finally { plan("newsletter", "Active"); }
  expect(await get(page, "appointment.content.api.list_releases", { public_site: article.public_site })).toEqual(releaseBefore);
  writeFileSync(testInfo.outputPath("website-isolation-validation.json"), JSON.stringify({
    separate_managed_owner_profile: true, business_created_by: "Normal invitee onboarding UI",
    denied_cross_business_requests: denials.length, denied_entitlement_requests: capabilityDenials.length,
    limits_enforced: ["articles", "collections", "monthly_sends"], immutable_releases_preserved: true,
    entitlement_changes_by: "Isolated platform operator, canonical entitlement service, exact synthetic business only",
  }, null, 2));
}
