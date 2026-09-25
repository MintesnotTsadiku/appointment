/**
 * Public provider first-paint and compiled-design contract guards.
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

const firstPaint = ts.transpileModule(read("src/public-experience/firstPaint.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const firstExports = {};
vm.runInNewContext(firstPaint, { exports: firstExports, require: () => ({}), console });

const fallbackSource = ts.transpileModule(read("src/public-experience/tokens.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const tokenExports = {};
vm.runInNewContext(fallbackSource, { exports: tokenExports, require: () => ({}), console });
const fallback = tokenExports.getFallbackPublicUIConfig("en");

assert.equal(firstExports.resolveMode("system", true), "dark");
assert.equal(firstExports.resolveMode("system", false), "light");
const dark = firstExports.buildThemeAttributes(fallback, "dark", false);
assert.equal(dark.variables["--pe-color-canvas"], "#211b18");
assert.equal(dark.variables["--pe-color-text"], "#fff7ed");
assert.ok(dark.variables["--pe-font-display"].includes("Quiet Trust Display"));

const rejected = firstExports.mergeConfig(
  { contract: "appointment-public-ui.v2", compiledDesign: { contract: "not-certified" } },
  fallback,
);
assert.equal(rejected.compiledDesign.recipeKey, "quiet-trust-warm-editorial");

const provider = read("src/public-experience/PublicExperienceProvider.tsx");
assert.ok(provider.includes("fetchPublicConfig"));
assert.ok(provider.includes("getFallbackPublicUIConfig"));
assert.ok(!provider.includes("landingPageSettings"));
assert.ok(!provider.includes("theme-provider"));
console.log("PASS: compiled-design first paint, strict config fallback and provider containment");
