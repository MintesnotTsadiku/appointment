/**
 * Compiled-design fallback and renderer safety checks.
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
const source = ts.transpileModule(read("src/public-experience/tokens.ts"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const exports = {};
vm.runInNewContext(source, { exports, require: () => ({}), console });

const design = exports.PACKAGED_COMPILED_DESIGN;
assert.equal(design.contract, "appointment-compiled-design.v1");
assert.equal(design.recipeKey, "tena-clinic");
assert.equal(design.layout.contentSchemaVersion, 2);
assert.ok(design.layout.requiredSections.includes("testimonials"));
assert.equal(design.tokens.light.canvas, "#fbf7f1");
assert.equal(design.tokens.dark.text, "#fff7ed");
assert.ok(design.typography.supportedScripts.includes("ethiopic"));
assert.ok(design.assets["hero.primary"].src.startsWith("/assets/appointment/quiet-trust/"));

const fallback = exports.getFallbackPublicUIConfig("am");
assert.equal(fallback.contract, "appointment-public-ui.v2");
assert.equal(fallback.recipeKey, "tena-clinic");
assert.equal(fallback.locale, "am");
assert.deepEqual(Array.from(fallback.supportedLocales), ["en", "am"]);
assert.equal(fallback.identity.applicationName, "Appointment");

const content = read("src/public-experience/templates/content.ts");
assert.ok(!content.includes("dangerouslySetInnerHTML"));
assert.ok(content.includes("safeHref"));
assert.ok(content.includes("supportAsset"));
console.log("PASS: packaged compiled design and safe renderer contract");
