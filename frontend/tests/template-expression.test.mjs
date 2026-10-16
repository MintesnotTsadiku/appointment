/**
 * Template expression: the recipe declares how a template meets each expressive quality, and the
 * checks follow the declaration (docs/design/TEMPLATE_V3_KIT.md, "Expression"). The product contract
 * stays the same for every certified package. A minimal fixture with no photo and no animation must
 * pass the same contract. Run with `npm run test:dom`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { strict as assert } from "node:assert";
import ts from "typescript";

import { certifiedPackages, contractFailures, EXPRESSION_CHOICES, EXPRESSION_DEFAULTS, expressionOf, expressionProblems, templateRoot } from "./template-contract.mjs";
import { minimalPackage } from "./fixtures/minimal-template.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const same = (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);

function load(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const require = (name) => (name.startsWith(".") ? load(path.resolve(path.dirname(file), name) + ".ts", cache) : {});
  vm.runInNewContext(output, { exports, require, Intl, Date, Math, Number, String, Object, Array });
  return exports;
}

// 1. One vocabulary: the backend contract, the kit and the test helper agree.
const python = fs.readFileSync(path.resolve(here, "../../appointment/public_experience/recipes.py"), "utf8");
const block = (name) => python.split(`${name}: Mapping`)[1].split("\n}\n")[0];
for (const [quality, choices] of Object.entries(EXPRESSION_CHOICES)) {
  const row = block("EXPRESSION_CHOICES").match(new RegExp(`"${quality}": \\(([^)]*)\\)`));
  same(row && [...row[1].matchAll(/"([a-z-]+)"/g)].map((match) => match[1]), choices, `recipes.py offers the same ${quality} forms`);
}
for (const [quality, value] of Object.entries(EXPRESSION_DEFAULTS)) {
  assert.match(block("EXPRESSION_DEFAULTS"), new RegExp(`"${quality}": "${value}"`), `recipes.py defaults ${quality} to ${value}`);
}
const kit = load(path.join(templateRoot, "kit/core/expression.ts"));
same(kit.EXPRESSION_CHOICES, EXPRESSION_CHOICES, "the kit offers the same forms");
same(kit.EXPRESSION_DEFAULTS, EXPRESSION_DEFAULTS, "the kit has the same defaults");

// 2. The kit resolves a design's forms; a release without a declaration gets the defaults.
same(kit.resolveExpression({ motion: "standard" }), { imagery: "photographic", motion: "standard", darkMode: "tonal", holiday: "greeting", success: "static", greeting: "tone" });
same(kit.resolveExpression(null).motion, "calm");
same(kit.resolveExpression({ motion: "calm", expression: { ...minimalPackage.recipe.expression, imagery: "neon" } }).imagery, "photographic", "an unknown form falls back");
same(kit.resolveExpression({ motion: "calm", expression: minimalPackage.recipe.expression }), minimalPackage.recipe.expression);

// 3. The headless pieces for templates without a drawn decoration or a hero greeting.
const holidays = load(path.join(templateRoot, "kit/core/holidays.ts"));
const genna = holidays.activeHoliday(holidays.parseIsoDate("2026-01-07"));
same(holidays.holidayGreeting(genna, "en"), { key: "genna", label: "holiday.label", title: "holiday.genna", line: "holiday.gennaLine", values: { count: 2018 }, geez: "መልካም ገና" });
assert.equal(holidays.holidayGreeting(genna, "am").geez, null, "Amharic pages show the Amharic title only");
const clock = load(path.join(templateRoot, "kit/core/clock.ts"));
same(["morning", "afternoon", "evening", "night"].map(clock.greetingKey), ["greetingMorning", "greetingAfternoon", "greetingEvening", "greetingNight"]);
const english = JSON.parse(fs.readFileSync(path.resolve(here, "../src/lib/i18n/translations/en.json"), "utf8")).publicSite;
const amharic = JSON.parse(fs.readFileSync(path.resolve(here, "../src/lib/i18n/translations/am.json"), "utf8")).publicSite;
for (const key of [genna.key, `${genna.key}Line`, "label"]) assert.ok(english.holiday[key] && amharic.holiday[key], `holiday.${key} is in English and Amharic`);

// 4. Every certified package declares its forms and meets the product contract and its declared forms.
const packages = certifiedPackages();
assert.equal(packages.length, 11, "all certified packages have a booking skin");
// The forms the current packages draw today: the declaration describes them, it changes nothing.
const CURRENT = { imagery: "mixed", motion: "expressive", darkMode: "night-photos", holiday: "decoration", success: "animated", greeting: "hero" };
const CALM = { imagery: "mixed", motion: "calm", darkMode: "tonal", holiday: "greeting", success: "static", greeting: "header" };
const calmPackages = new Set(["enkua-v3", "mizan-v3", "meseret-v3", "buna-v3", "hana-v3"]);
for (const pkg of packages) {
  assert.ok(pkg.recipe, `${pkg.folder}: a recipe pins renderer ${pkg.id}`);
  same(expressionProblems(pkg.recipe), [], `${pkg.folder} declares a valid expression`);
  same(pkg.recipe.expression, calmPackages.has(pkg.folder) ? CALM : CURRENT, `${pkg.folder} declares the forms it draws`);
  same(contractFailures(pkg), [], `${pkg.folder} meets the quality bar`);
}

// 5. The minimal fixture: no photo, no animation, and it passes the same contract.
const fixture = minimalPackage;
for (const [name, source] of Object.entries(fixture.files).filter(([name]) => name.endsWith(".tsx"))) {
  const result = ts.transpileModule(source, { fileName: name, reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.Preserve } });
  same(result.diagnostics.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")), [], `the fixture's ${name} is valid TSX`);
}
same(expressionProblems(fixture.recipe), [], "the fixture recipe declares a valid expression");
same(expressionOf(fixture.recipe), { imagery: "typographic", motion: "calm", darkMode: "tonal", holiday: "greeting", success: "static", greeting: "header" });
const all = Object.values(fixture.files).join("\n");
assert.ok(!/pictureSet\(|<img\b|<picture\b|<svg\b/.test(all), "the fixture draws no photo and no illustration");
assert.ok(!/@keyframes|animation\s*:/.test(all), "the fixture has no animation");
same(contractFailures(fixture), [], "a minimal typographic, calm, tonal template meets the quality bar");

// 6. The checks still bite: the product contract never relaxes, and a declared form must be drawn.
const variant = (changes = {}, recipe = {}) => ({ ...fixture, recipe: { ...fixture.recipe, ...recipe }, files: { ...fixture.files, ...changes } });
const expressionVariant = (changes) => variant({}, { expression: { ...fixture.recipe.expression, ...changes } });
const fails = (pkg, pattern, message) => assert.ok(contractFailures(pkg).some((failure) => pattern.test(failure)), `${message}: ${JSON.stringify(contractFailures(pkg))}`);
const template = fixture.files["QuietTemplate.tsx"];
fails(variant({ "QuietTemplate.tsx": template.replace("snapshot.booking?.liveAvailability === true", "true") }), /live availability/, "live availability follows the owner setting");
fails(variant({ "QuietTemplate.tsx": template.replace(/habeshaPhrase\(open\.closesAt\)/, "open.closesAt") }), /Habesha/, "opening hours need the Habesha clock");
fails(variant({ "QuietTemplate.tsx": template.replace("<QuietHoliday", "<Quiet") }), /holiday moment on the landing page/, "the holiday greeting is rendered");
fails(variant({ "quiet.css": fixture.files["quiet.css"].replace(/@media \(prefers-reduced-motion: reduce\)[^\n]*\n/, "") }), /reduced motion/, "reduced motion is required");
fails(variant({ "quiet.css": fixture.files["quiet.css"].replace(/\.ql\[data-pe-mode="dark"\][^\n]*\n/, "") }), /dark mode/, "a designed dark mode is required");
fails(variant({ "QuietMoment.tsx": fixture.files["QuietMoment.tsx"].replace(' data-qa="booking-moment"', "") }), /success moment/, "a success acknowledgement is required");
fails({ ...fixture, moments: "const MOMENTS = {};" }, /success moment/, "the success moment is registered");
fails({ ...fixture, registry: fixture.registry.replace(", Loading: t.QuietLoading", "") }, /loading screen/, "a loading screen is required");
fails(variant({ "booking.tsx": undefined }), /booking skin/, "a booking skin is required");
fails(variant({ "holiday.css": ".ql-holiday { position: fixed; }" }), /holiday greeting only when/, "the holiday greeting never floats over content");
fails(expressionVariant({ holiday: "decoration" }), /holiday "decoration"/, "a declared decoration must be drawn");
fails(expressionVariant({ success: "animated" }), /success "animated"/, "a declared animated moment must animate");
fails(expressionVariant({ darkMode: "night-photos" }), /darkMode "night-photos"/, "declared night photos must exist");
fails(expressionVariant({ imagery: "photographic" }), /imagery "photographic"/, "declared photography must draw photos");
fails(expressionVariant({ greeting: "tone" }), /greeting "tone"/, "a declared tone needs the day part on the page");
fails(variant({ "moment.css": "@keyframes ql-in { from { opacity: 0; } } .ql-moment { animation: ql-in 1s; }" }), /success "static"/, "a static moment does not animate");
fails(variant({ "QuietTemplate.tsx": template.replace("useNextAvailability(", "useScrollProgress(root, level, \"standard\"); useNextAvailability(") }), /motion "calm"/, "calm motion keeps to micro-feedback");
same(expressionProblems({ ...fixture.recipe, expression: { ...fixture.recipe.expression, motion: "expressive" } }), ['motion "expressive" but the recipe offers up to "calm"'], "the declared motion matches the offered levels");
assert.ok(expressionProblems({ ...fixture.recipe, expression: { ...fixture.recipe.expression, sparkle: "yes" } }).includes('unknown quality "sparkle"'));
assert.ok(expressionProblems({ ...fixture.recipe, expression: { ...fixture.recipe.expression, imagery: "neon" } }).some((problem) => problem.startsWith("imagery must be one of")));
fails({ ...fixture, recipe: { ...fixture.recipe, expression: undefined } }, /declares its expressive forms/, "a certified package must declare its forms");

console.log("template expression: declared forms checked, product contract kept, minimal fixture passes");
