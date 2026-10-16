/**
 * The quality bar of a certified v3-class template package, as static checks
 * (docs/design/TEMPLATE_REIMAGINATION.md, section 8; docs/design/TEMPLATE_V3_KIT.md, "Expression").
 *
 * - The product contract is never optional: every package with a booking skin meets all of it.
 * - The expressive qualities are checked in the form that the recipe declares under `expression`.
 *
 * A package is a plain object, so a test can check a real package on disk (`certifiedPackages()`) or a
 * small fixture (`tests/fixtures/minimal-template.mjs`). This file is a helper, not a test.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const templateRoot = path.join(root, "src/public-experience/templates");
const designRoot = path.resolve(root, "../appointment/public_experience/manifest/design");

/** The twin of `EXPRESSION_CHOICES` and `EXPRESSION_DEFAULTS` in `appointment/public_experience/recipes.py`. */
export const EXPRESSION_CHOICES = {
  imagery: ["photographic", "illustrative", "typographic", "pattern", "mixed"],
  motion: ["expressive", "standard", "calm"],
  darkMode: ["night-photos", "tonal", "graded"],
  holiday: ["decoration", "greeting"],
  success: ["animated", "static"],
  greeting: ["hero", "header", "tone"],
};
export const EXPRESSION_DEFAULTS = { imagery: "photographic", darkMode: "tonal", holiday: "greeting", success: "static", greeting: "tone" };
const MOTION_ORDER = ["calm", "standard", "expressive"];

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

/** The highest motion level a site on the recipe can get. */
export function offeredMotion(recipe) {
  const choices = recipe.adjustments?.motion?.choices || [recipe.defaultInputs?.motion || "calm"];
  return MOTION_ORDER[Math.max(0, ...choices.map((value) => MOTION_ORDER.indexOf(value)))];
}

/** The declared forms with the defaults filled in, as `recipes._expression` does. */
export function expressionOf(recipe) {
  return recipe.expression ? { ...recipe.expression } : { ...EXPRESSION_DEFAULTS, motion: offeredMotion(recipe) };
}

/** The problems of a recipe's `expression` declaration (empty when it is valid). */
export function expressionProblems(recipe) {
  const declared = recipe.expression;
  if (declared === undefined) return ["the recipe declares no expression"];
  if (!declared || typeof declared !== "object" || Array.isArray(declared)) return ["expression must be an object"];
  const problems = [];
  for (const key of Object.keys(declared)) if (!(key in EXPRESSION_CHOICES)) problems.push(`unknown quality "${key}"`);
  for (const [quality, choices] of Object.entries(EXPRESSION_CHOICES)) {
    if (!choices.includes(declared[quality])) problems.push(`${quality} must be one of ${choices.join(", ")}`);
  }
  if (declared.motion && declared.motion !== offeredMotion(recipe)) problems.push(`motion "${declared.motion}" but the recipe offers up to "${offeredMotion(recipe)}"`);
  return problems;
}

/** Every package with a booking skin, read from disk with its recipe, imagery, registry and moment entries. */
export function certifiedPackages() {
  const registry = fs.readFileSync(path.join(templateRoot, "registry.ts"), "utf8");
  const moments = fs.readFileSync(path.join(templateRoot, "moments.tsx"), "utf8");
  const recipes = fs.readdirSync(path.join(designRoot, "recipes")).map((name) => readJson(path.join(designRoot, "recipes", name)));
  const packages = [];
  for (const folder of fs.readdirSync(templateRoot).sort()) {
    const skin = path.join(templateRoot, folder, "booking.tsx");
    if (!fs.existsSync(skin)) continue;
    const id = fs.readFileSync(skin, "utf8").match(/key: "([a-z-]+@\d+)"/)?.[1];
    const [key, version] = (id || "@").split("@");
    // The renderer version is the layout version that the recipe pins.
    const recipe = recipes.find((item) => item.key === key && item.primitives?.layout?.version === Number(version));
    const imagery = recipe ? readJson(path.join(designRoot, "imagery", `${recipe.primitives.imagery.key}.v${recipe.primitives.imagery.version}.json`)) : null;
    const files = Object.fromEntries(fs.readdirSync(path.join(templateRoot, folder)).filter((name) => /\.(tsx?|css)$/.test(name))
      .map((name) => [name, fs.readFileSync(path.join(templateRoot, folder, name), "utf8")]));
    packages.push({ folder, id, recipe, imagery, files, registry, moments });
  }
  return packages;
}

const sources = (pkg, pattern) => Object.entries(pkg.files).filter(([name]) => pattern.test(name)).map(([, text]) => text);
const code = (pkg) => sources(pkg, /\.tsx?$/).join("\n");
const css = (pkg) => sources(pkg, /\.css$/).join("\n");
const file = (pkg, pattern) => Object.entries(pkg.files).find(([name]) => pattern.test(name));
const entryOf = (text, id) => (text.split(`"${id}":`)[1] || "").split(/\n\s*"[a-z-]+@\d+":/)[0];
const ANIMATES = /@keyframes|animation\s*:|animation-name\s*:/;

/** Follow local template imports so a header can own the holiday rendering. */
function landingSource(pkg) {
  const pending = Object.keys(pkg.files).filter((name) => /Template\.tsx$/.test(name));
  const visited = new Set();
  const result = [];
  while (pending.length) {
    const name = pending.pop();
    if (visited.has(name)) continue;
    visited.add(name);
    const source = pkg.files[name] || "";
    result.push(source);
    for (const match of source.matchAll(/from\s+["']\.\/([^"']+)["']/g)) {
      for (const extension of [".tsx", ".ts"]) {
        if (pkg.files[match[1] + extension]) pending.push(match[1] + extension);
      }
    }
  }
  return result.join("\n");
}

/** Each check: [what it promises, a test that returns true when the package keeps the promise]. */
const PRODUCT_CONTRACT = [
  ["declares its expressive forms in the recipe", (pkg) => pkg.recipe && expressionProblems(pkg.recipe).length === 0],
  ["is an AA, focus-visible, reduced-motion certified recipe", (pkg) => pkg.recipe?.accessibility?.level === "AA" && pkg.recipe.accessibility.focusVisible === true && pkg.recipe.accessibility.reducedMotion === true],
  ["is registered lazily with its loading screen", (pkg) => {
    const entry = entryOf(pkg.registry, pkg.id);
    return entry.includes(`import("./${pkg.folder}/`) && /Loading: t\.\w+Loading/.test(entry) && /export function \w+Loading\b/.test(code(pkg));
  }],
  ["has a booking skin with its own lazily loaded stylesheet", (pkg) => Boolean(pkg.files["booking.tsx"] && pkg.files["booking.css"]) && pkg.files["booking.tsx"].includes(`key: "${pkg.id}"`) && pkg.files["booking.tsx"].includes('style: () => import("./booking.css")')],
  ["acknowledges a booking with its own success moment", (pkg) => {
    const match = entryOf(pkg.moments, pkg.id).match(new RegExp(`^\\s*lazy\\(\\(\\) => import\\("\\./${pkg.folder}/(\\w+)"\\)\\)`));
    return Boolean(match && pkg.files[`${match[1]}.tsx`] && /data-qa="booking-moment"/.test(pkg.files[`${match[1]}.tsx`]));
  }],
  ["follows the page language (English and Amharic chrome)", (pkg) => code(pkg).includes("usePublicChrome(locale)")],
  ["has a designed dark mode with a translated switch", (pkg) => {
    const source = code(pkg);
    return source.includes("data-pe-mode={mode}") && source.includes("toggleMode") && source.includes("aria-label={chrome.modeSwitchLabel(mode)}") && /\[data-pe-mode="dark"\]/.test(css(pkg));
  }],
  ["gates motion on the kit's level and stops it for reduced motion", (pkg) => code(pkg).includes("useMotionLevel(") && /data-motion-level/.test(code(pkg)) && /prefers-reduced-motion: reduce/.test(css(pkg))],
  ["shows live availability only when the owner turns it on", (pkg) => /useNextAvailability\(\s*snapshot\.booking\?\.liveAvailability === true/.test(code(pkg))],
  ["shows opening hours with the Habesha clock", (pkg) => code(pkg).includes("openState(") && code(pkg).includes("habeshaPhrase(")],
  ["shows the holiday greeting only when the owner turns it on, in the page flow", (pkg) => {
    const source = code(pkg);
    const holidayCss = sources(pkg, /^holiday\.css$/).join("\n");
    return /useHoliday\(\s*snapshot\.booking\?\.holidayGreetings === true\s*\)/.test(source) && /data-qa="holiday-moment"/.test(source)
      && /data-holiday=\{/.test(source) && /aria-label=\{[^}]*label/.test(source) && !/position:\s*fixed/.test(holidayCss)
      && (!ANIMATES.test(holidayCss) || /prefers-reduced-motion: reduce/.test(holidayCss));
  }],
  ["renders its holiday moment on the landing page", (pkg) => /<\w+Holiday\b/.test(landingSource(pkg))],
  ["knows the time of day in Addis Ababa", (pkg) => code(pkg).includes("useTimeOfDay(")],
];

/** Each declared form: what the package must then draw. Forms that need no photo or animation demand none. */
const EXPRESSION_CHECKS = {
  imagery: {
    photographic: ["draws photos through pictureSet", (pkg) => code(pkg).includes("pictureSet(")],
    illustrative: ["draws its own illustrations", (pkg) => /<svg\b/.test(code(pkg))],
    typographic: ["carries sections with type (no photo required)", () => true],
    pattern: ["draws a pattern", (pkg) => /<pattern\b|repeating-(linear|radial|conic)-gradient|background-image\s*:/.test(code(pkg) + css(pkg))],
    mixed: ["draws photos and illustrations", (pkg) => code(pkg).includes("pictureSet(") && /<svg\b/.test(code(pkg))],
  },
  motion: {
    expressive: ["uses the kit's reveals and scroll or pointer motion", (pkg) => code(pkg).includes("useReveal(") && /useScrollProgress\(|usePointerEffects\(/.test(code(pkg))],
    standard: ["uses the kit's reveals", (pkg) => code(pkg).includes("useReveal(")],
    calm: ["keeps to micro-feedback: no scroll, marquee, count-up or pointer motion", (pkg) => !/useScrollProgress\(|useMarquee\(|useCountUp\(|usePointerEffects\(|data-scroll\b|data-count\b/.test(code(pkg))],
  },
  darkMode: {
    "night-photos": ["shows night photos in dark mode", (pkg) => Object.values(pkg.imagery?.assets || {}).some((asset) => asset.darkSrc) && /pictureSet\([^)]*\bnight\b/.test(code(pkg))],
    tonal: ["redefines its palette for dark mode", (pkg) => /\[data-pe-mode="dark"\][^{]*\{[^}]*--[\w-]+\s*:/.test(css(pkg))],
    graded: ["grades its images for dark mode", (pkg) => /\[data-pe-mode="dark"\][^{]*\{[^}]*filter\s*:/.test(css(pkg))],
  },
  holiday: {
    decoration: ["draws a decoration in its own language (decorative, aria-hidden)", (pkg) => {
      const holiday = sources(pkg, /^holiday\.tsx$/).join("\n");
      return /<svg\b/.test(holiday) && /aria-hidden="true"/.test(holiday) && /prefers-reduced-motion: reduce/.test(sources(pkg, /^holiday\.css$/).join("\n"));
    }],
    greeting: ["sets the greeting and its line in the template's type", (pkg) => /holidayGreeting\(/.test(code(pkg)) || (/`holiday\.\$\{holiday\.key\}`|holiday\.key\)/.test(code(pkg)) && /Line`/.test(code(pkg)))],
  },
  success: {
    animated: ["animates the success moment and stops it for reduced motion", (pkg) => {
      const moment = sources(pkg, /^moment\.css$/).join("\n");
      return ANIMATES.test(moment) && /prefers-reduced-motion: reduce/.test(moment);
    }],
    static: ["crafts a still success moment", (pkg) => {
      const moment = sources(pkg, /^moment\.css$/).join("\n");
      return Boolean(file(pkg, /Moment\.tsx$/)) && !ANIMATES.test(moment) && (!/transition\s*:/.test(moment) || /prefers-reduced-motion: reduce/.test(moment));
    }],
  },
  greeting: {
    hero: ["greets by the time of day in the hero", (pkg) => /greetingMorning|greetingKey\(/.test(code(pkg)) && /data-qa="[a-z0-9-]*greeting"/.test(code(pkg))],
    header: ["greets by the time of day in the header", (pkg) => /greetingMorning|greetingKey\(/.test(code(pkg)) && /data-qa="[a-z0-9-]*greeting"/.test(code(pkg))],
    tone: ["sets its tone by the time of day", (pkg) => /data-day-part=\{now\.part\}/.test(code(pkg))],
  },
};

/** The failed promises of a package: an empty list when it meets the product contract and its declared forms. */
export function contractFailures(pkg) {
  const failures = PRODUCT_CONTRACT.filter(([, test]) => !test(pkg)).map(([promise]) => `product contract: ${promise}`);
  if (!pkg.recipe) return failures;
  const expression = expressionOf(pkg.recipe);
  for (const [quality, forms] of Object.entries(EXPRESSION_CHECKS)) {
    const check = forms[expression[quality]];
    if (!check) failures.push(`${quality}: unknown form "${expression[quality]}"`);
    else if (!check[1](pkg)) failures.push(`${quality} "${expression[quality]}": ${check[0]}`);
  }
  return failures;
}

/** Only the holiday promises (the product contract's greeting rule and the declared holiday form). */
export function holidayFailures(pkg) {
  return contractFailures(pkg).filter((failure) => /holiday/i.test(failure));
}
