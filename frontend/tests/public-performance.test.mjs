/**
 * Website pages load fast on phones (docs/operations/PUBLIC_PERFORMANCE.md). These checks keep the
 * structure that makes them fast:
 * - the website entry (site-main.tsx) never loads staff code, the Frappe SDK or the motion library;
 * - website code translates only with the English groups that the website entry bundles;
 * - the scheduler data that lib/scheduler-prefetch.ts starts early is the request that the pages make.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

function resolveImport(from, specifier) {
  const base = specifier.startsWith("@/") ? path.join(src, specifier.slice(2)) : specifier.startsWith(".") ? path.resolve(path.dirname(from), specifier) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Every module the entry loads before it renders: static imports only (`import()` loads later). */
function staticGraph(entry) {
  const seen = new Map();
  const stack = [path.join(src, entry)];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file) || !/\.(ts|tsx)$/.test(file)) continue;
    const source = fs.readFileSync(file, "utf8");
    seen.set(file, source);
    for (const match of source.matchAll(/^\s*import\s+(?!type\b)(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/gm)) {
      const target = resolveImport(file, match[1]);
      if (target) stack.push(target);
      else if (!match[1].startsWith(".") && !match[1].startsWith("@/")) seen.set(`package:${match[1]}`, "");
    }
  }
  return seen;
}

const site = staticGraph("site-main.tsx");
const packages = [...site.keys()].filter((key) => key.startsWith("package:")).map((key) => key.slice(8));
for (const forbidden of ["frappe-react-sdk", "frappe-js-sdk", "framer-motion", "socket.io-client", "react-hook-form", "sonner"]) {
  assert.ok(!packages.some((name) => name === forbidden || name.startsWith(`${forbidden}/`)), `the website entry must not load ${forbidden}`);
}
for (const staff of ["full-app.tsx", "app.tsx", "route.tsx", "components/realtime", "context/session", "components/theme-provider", "lib/i18n/english.ts"]) {
  assert.ok(![...site.keys()].some((file) => file.includes(`${path.sep}src${path.sep}${staff}`)), `the website entry must not load ${staff} before it renders`);
}
assert.ok([...site.keys()].some((file) => file.endsWith("english-site.ts")), "the website entry registers the website translation groups");
assert.ok(read("src/main.tsx").indexOf("./lib/i18n/english") < read("src/main.tsx").indexOf("./full-app"), "the full catalog registers before the application code");

// Website code translates only with the groups that the website entry bundles.
const config = read("vite.config.ts");
const groups = JSON.parse(/WEBSITE_TRANSLATION_GROUPS = (\[[^\]]*\])/.exec(config)[1]);
const english = JSON.parse(read("src/lib/i18n/translations/en.json"));
for (const group of groups) assert.ok(group in english, `${group} is an English group`);
const websiteFiles = [...site.keys()].filter((file) => !file.startsWith("package:"));
const templateRoot = path.join(src, "public-experience/templates");
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(path.join(directory, entry.name)) : /\.(ts|tsx)$/.test(entry.name) ? [path.join(directory, entry.name)] : []);
for (const file of [...websiteFiles, ...walk(templateRoot), path.join(src, "pages/public-experience/booking.tsx")]) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/\bt\(\s*["'`]([A-Za-z]+)\.[A-Za-z0-9_.]+["'`]/g)) {
    // Template chrome keys (`chrome.t("…")`) carry no group: they live under `publicSite`.
    if (/chrome\.t\($/.test(source.slice(Math.max(0, match.index - 7), match.index + 2))) continue;
    if (!(match[1] in english)) continue;
    assert.ok(groups.includes(match[1]), `${path.relative(root, file)} translates "${match[1]}.…", which website pages do not bundle; add the group to WEBSITE_TRANSLATION_GROUPS`);
  }
}
assert.ok(read("src/public-experience/templates/chrome.ts").includes("`publicSite.${key}`"), "template chrome keys live under publicSite");

// The early scheduler request is the one the pages make (same method, parameters and SWR key).
const prefetch = read("src/lib/scheduler-prefetch.ts");
const scheduler = read("src/pages/organization-appointment/index.tsx");
for (const method of ["appointment.api.personal_meet.get_organization_meeting_windows", "appointment.api.personal_meet.get_organization_services"]) {
  assert.ok(prefetch.includes(`"${method}"`) && scheduler.includes(`"${method}"`), `${method} is the scheduler's first request`);
}
assert.ok(scheduler.includes("{ org_slug: orgSlug, service_slug: serviceSlug }") && scheduler.includes("{ org_slug: orgSlug }"), "the scheduler parameters match the early request");
assert.ok(scheduler.includes("apiParams,\n    undefined,"), "the scheduler uses the SDK's own key, which the early request repeats");
const provider = read("src/pages/public-experience/provider-page.tsx");
assert.ok(provider.includes("`provider-page-${providerSlug}`") && prefetch.includes("`provider-page-${slug}`"), "the provider page key matches the early request");

// The website page and its server rules.
const index = read("index.html");
assert.ok(index.indexOf('name="viewport"') < index.indexOf("{{ public_meta_tags"), "the viewport comes before the preload hints, so their media queries see the phone width");
assert.ok(read("../appointment/www/index.html").includes("shell_template"), "the shell can serve site.html");

console.log("public-performance: website entry lean, translation groups and early requests consistent");
