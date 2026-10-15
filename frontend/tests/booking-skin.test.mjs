// Booking skins: the contract between the shared booking flow and each template package.
// See docs/design/TEMPLATE_V3_KIT.md, "Booking skins".
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const templates = path.join(root, "src/public-experience/templates");

// The registry knows each skin by renderer key and version; unknown designs get the default skin.
const registry = read("src/public-experience/templates/booking-skin.ts");
assert.match(registry, /export const DEFAULT_BOOKING_SKIN: BookingSkin = \{[^}]*frame: "rounded"/s, "the default skin uses plain rounded frames");
assert.match(registry, /return SKINS\[`\$\{layout\.rendererKey\}@\$\{layout\.rendererVersion \|\| 1\}`\] \|\| DEFAULT_BOOKING_SKIN/, "an unknown design falls back to the default skin");
const skinPackages = [...registry.matchAll(/^import .* from "\.\/([^/"]+)\/booking";$/gm)].map((match) => match[1]);
assert.ok(skinPackages.includes("bloom-v3") && skinPackages.includes("meron-v3"), "Bloom v3 and Meron v3 have skins");
for (const name of skinPackages) assert.ok(/-v3$/.test(name), `${name}: only v3 packages have skins`);

// Every template's booking skin stays inside its own package.
for (const directory of fs.readdirSync(templates)) {
  const file = path.join(templates, directory, "booking.tsx");
  if (!fs.existsSync(file)) continue;
  const source = fs.readFileSync(file, "utf8");
  for (const [, from] of source.matchAll(/from "([^"]+)"/g)) {
    assert.ok(from === "../booking-skin" || from.startsWith("./"), `${directory} skin imports ${from}: only its own files and the skin contract`);
  }
  assert.ok(/import type \{[^}]*\} from "\.\.\/booking-skin"/.test(source), `${directory} skin imports the contract as types only`);
  const name = source.match(/name: "([a-z0-9-]+)"/)?.[1];
  assert.ok(name, `${directory} skin has a name`);
  const css = fs.readFileSync(path.join(templates, directory, "booking.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const rule of css.split("}").map((part) => part.split("{")[0].trim()).filter((part) => part && !part.startsWith("@") && !/^[\d.]+%$|^(from|to)$/.test(part))) {
    for (const selector of rule.split(",").map((part) => part.trim())) {
      assert.ok(selector.includes(`[data-bk-skin="${name}"]`) || /^\.[a-z0-9]+k-/.test(selector), `${directory} booking.css selector "${selector}" must be scoped to its skin`);
    }
  }
  assert.ok(!/animation\s*:/.test(css) || /prefers-reduced-motion/.test(css), `${directory} skin animations stop with reduced motion`);
  assert.ok(!/useScrollProgress|useMarquee|useCountUp|data-scroll|data-count/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), `${directory} skin keeps booking pages calm`);
}

// The shared flow: one skin hook, the backdrop uses the smallest file and never loads eagerly with high priority.
const skin = read("src/pages/booking-v2/components/skin/index.tsx");
assert.match(skin, /Math\.min\(\.\.\.asset\.widths\)/, "the backdrop uses the smallest packaged width");
assert.match(skin, /fetchpriority: "low"/, "the backdrop loads with low priority");
assert.match(skin, /aria-hidden="true" data-qa="booking-backdrop"/, "the backdrop is decorative");
const css = read("src/pages/booking-v2/components/skin/skin.css");
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/, "selection feedback stops with reduced motion");

// The organization scheduler shows one card per service and books the chosen time's own offering.
const page = read("src/pages/organization-appointment/index.tsx");
assert.match(page, /function groupServices\(/, "the chooser groups offerings by service");
assert.match(page, /const offeringId = chosenSlot\?\.offeringId \|\| type/, "a booking is made for the chosen time's offering");
assert.match(page, /allProviders: offerings\.length > 1/, "the time picker reads all providers of the service");

// Handoff rows are real links (keyboard and screen readers) to each service's scheduler.
const bloom = read("src/public-experience/templates/bloom-v3/BloomTemplate.tsx");
assert.match(bloom, /<a className="b3-handoff-row" href=\{href\}/, "Bloom handoff rows are links");
const meron = read("src/public-experience/templates/meron-v3/MeronTemplate.tsx");
assert.match(meron, /<a className="m3-handoff-row" href=\{href\}/, "Meron handoff rows are links");
assert.match(meron, /snapshot\.bookingPaths\?\.\[item\.id\]/, "Meron handoff rows open each service's own scheduler");
const abugida = read("src/public-experience/templates/abugida-v3/AbugidaTemplate.tsx");
assert.match(abugida, /<a className="a3-toc-row a3-handoff-row" href=\{href\}/, "Abugida handoff rows are links");
assert.match(abugida, /snapshot\.bookingPaths\?\.\[item\.id\]/, "Abugida handoff rows open each lesson's own scheduler");
const selam = read("src/public-experience/templates/selam-v3/SelamTemplate.tsx");
assert.match(selam, /<a className="s3-handoff-row" href=\{href\} lang=\{locale\}/, "Selam handoff rows are links in the page language");
assert.match(selam, /snapshot\.bookingPaths\?\.\[item\.id\]/, "Selam handoff rows open each session's own scheduler");
assert.ok(skinPackages.includes("selam-v3"), "Selam v3 has a skin");
assert.ok(skinPackages.includes("tena-v3"), "Tena v3 has a skin");
const tenaSkin = read("src/public-experience/templates/tena-v3/booking.tsx");
assert.match(tenaSkin, /key: "tena-clinic@3"/, "the Tena skin is keyed by renderer version 3");
assert.match(read("src/public-experience/templates/tena-v3/booking.css"), /\.bk-slot\[aria-pressed="true"\][\s\S]*background: var\(--t3k-plate\)/, "Tena marks the chosen time with a yellow plate");
for (const file of ["bloom-v2/BloomTemplate.tsx", "meron-v2/MeronTemplate.tsx", "abugida-v2/AbugidaTemplate.tsx", "tena-v2/TenaTemplate.tsx", "selam-v2/SelamTemplate.tsx"]) {
  assert.match(read(`src/public-experience/templates/${file}`), /paths=\{snapshot\.bookingPaths\}/, `${file} handoff links its services`);
}
console.log("booking-skin: all checks passed");
