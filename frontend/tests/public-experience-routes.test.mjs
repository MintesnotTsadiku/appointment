/**
 * Public route wiring and editor containment guards.
 *
 * Proves the tenant website/booking routes exist, the public pages are free of
 * legacy dependencies, and the editor only talks to the capability-checked
 * management API.
 *
 * Run with `npm run test:dom`.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const { default: ts } = await import("typescript");
const routesModule = {};
vm.runInNewContext(
  ts.transpileModule(read("src/public-experience/routes.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  { exports: routesModule, require: () => ({}) },
);
assert.equal(routesModule.isPublicExperiencePath("/demo-clinic"), true);
assert.equal(routesModule.isPublicExperiencePath("/demo-clinic/book"), true);
assert.equal(routesModule.isPublicExperiencePath("/demo-clinic/am"), true);
assert.equal(routesModule.isPublicExperiencePath("/settings/public-experience"), false);
assert.equal(routesModule.isPublicExperiencePath("/app"), false);
assert.equal(routesModule.isPublicExperiencePath("/"), false);
assert.equal(routesModule.publicRootFromPath("/tena-studio/book"), "/tena-studio");
assert.equal(routesModule.publicRootFromPath("/schedule/org/tena-studio"), "/");
assert.equal(routesModule.publicRootForSlug("bloom-studio"), "/bloom-studio");
assert.equal(routesModule.publicRootForSlug("settings"), "/");

const app = read("src/app.tsx");
assert.ok(app.includes("isPublicExperiencePath"), "app shell must detect public paths");
assert.ok(app.includes("{standalone ? null : <ModeToggle />}"), "app shell must hide the toggle on public paths");

const routes = read("src/route.tsx");
for (const expected of ['path="/:slug"', 'path="/:slug/book"', 'path="/:slug/:locale"', 'path="/settings/public-experience"']) {
  assert.ok(routes.includes(expected), `route.tsx must declare ${expected}`);
}

const site = read("src/pages/public-experience/site.tsx");
assert.ok(!site.includes("landingPageSettings"), "public site must not read legacy settings");
assert.ok(!site.includes("theme-provider"), "public site must not use the legacy theme provider");
assert.ok(site.includes("PublicExperienceProvider"), "public site must use the public provider");

const booking = read("src/pages/public-experience/booking.tsx");
assert.ok(!booking.includes("landingPageSettings"), "booking entry must not read legacy settings");
assert.ok(booking.includes("PublicExperienceProvider"), "booking entry must use the public provider");
assert.ok(booking.includes("publicRootForSlug"), "booking entry must link back to its tenant site");
assert.ok(booking.includes("hero?.content.title"), "booking title must use editable hero copy, not the combined SEO title");
assert.ok(booking.includes("pe-booking-media"), "booking entry must preserve recipe imagery");

const bookingTheme = read("src/public-experience/bookingTheme.ts");
assert.ok(bookingTheme.includes("fetchPublicConfig(undefined, publicRootForSlug(orgSlug))"), "scheduler must resolve the organization public release");
assert.ok(bookingTheme.includes('"--accent-primary": primary'), "scheduler must map the public primary token");
assert.ok(bookingTheme.includes('"--booking-font-display"'), "scheduler must map public typography");

const scheduler = read("src/pages/organization-appointment/index.tsx");
assert.ok(scheduler.includes("useBookingBrand"), "shared scheduler must adopt the public brand");
assert.ok(scheduler.includes("data-booking-branded"), "shared scheduler must expose branding state for QA");
assert.ok(scheduler.includes("href={bookingBrand.publicRoot}"), "shared scheduler must link back to the tenant site");

const editor = read("src/pages/settings/public-experience.tsx");
assert.ok(editor.includes("appointment.public_experience.api."), "editor must call the management API");
assert.ok(!editor.includes("ignore_permissions"), "editor must not bypass permissions");
assert.ok(!editor.includes("frappe.client"), "editor must not use the generic client API");

console.log("PASS: public routes wired and public/editor surfaces contained");
