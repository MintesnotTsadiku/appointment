import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(root, "src/public-experience/templates");
const templates = ["selam", "bloom", "meron", "abugida", "tena", "tena-v2", "selam-v2", "bloom-v2", "meron-v2", "abugida-v2", "ergata", "bloom-v3"];

const registry = fs.readFileSync(path.join(templateRoot, "registry.ts"), "utf8");
for (const template of templates) {
  const directory = path.join(templateRoot, template);
  const source = fs.readdirSync(directory).filter((file) => file.endsWith("Template.tsx"));
  const styles = fs.readdirSync(directory).filter((file) => file.endsWith(".css"));
  assert.equal(source.length, 1, `${template} must own one template component`);
  assert.ok(styles.includes(`${template.replace(/-v[23]$/, "")}.css`), `${template} must own its main stylesheet`);
  for (const stylesheet of styles) {
    const css = fs.readFileSync(path.join(directory, stylesheet), "utf8");
    assert.ok(!/@import[^;]*\.\.\//.test(css), `${template} cannot import another package stylesheet`);
  }
  const component = fs.readFileSync(path.join(directory, source[0]), "utf8");
  assert.ok(component.includes("data-pe-mode={mode}"), `${template} must expose its resolved mode`);
  assert.ok(component.includes("toggleMode"), `${template} must own a mode switch`);
  assert.ok(component.includes("aria-label={chrome.modeSwitchLabel(mode)}"), `${template} switch must have a translated accessible label`);
  assert.ok(component.includes("usePublicChrome(locale)"), `${template} chrome must follow the page locale`);
  assert.ok(!/<option>|<form\b/.test(component), `${template} cannot ship fake booking controls`);
  assert.ok(!component.includes("renderSection"), `${template} cannot use the shared visual renderer`);
  assert.ok(!component.includes("dangerouslySetInnerHTML"), `${template} cannot render arbitrary HTML`);
  assert.ok(registry.includes(`./${template}/`), `${template} must be registered explicitly`);
}

for (const key of ["selam-movement", "bloom-hair", "meron-atelier", "abugida-language", "tena-clinic"]) {
  assert.ok(registry.includes(`"${key}@1"`), `${key} v1 stays registered for releases pinned to it`);
  assert.ok(registry.includes(`"${key}@2"`), `${key} v2 is registered`);
}
assert.ok(registry.includes(`"bloom-hair@3"`), "bloom-hair v3 (Golden Hour Salon) is registered next to v1 and v2");
assert.ok(registry.includes(`"ergata-therapy@1"`), "ergata-therapy v1 is registered");

// v3 packages: visual components stay in the package; behaviour comes from the headless kit only.
const kitRoot = path.join(templateRoot, "kit");
for (const file of fs.readdirSync(kitRoot).concat(fs.readdirSync(path.join(kitRoot, "core")).map((name) => `core/${name}`))) {
  if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
  assert.ok(file.endsWith(".ts"), `the kit is headless: ${file} must not be a JSX component file`);
  const source = fs.readFileSync(path.join(kitRoot, file), "utf8");
  assert.ok(!/\.css["']/.test(source), `the kit ships no stylesheet (${file})`);
  assert.ok(!/framer-motion/.test(source), `no animation library in public templates (${file})`);
}
for (const template of ["bloom-v3"]) {
  const directory = path.join(templateRoot, template);
  for (const file of fs.readdirSync(directory).filter((name) => /\.tsx?$/.test(name))) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    for (const match of source.matchAll(/from "\.\.\/([^"]+)"/g)) {
      assert.ok(!/^(selam|bloom|meron|abugida|tena|ergata)(-v\d)?\//.test(match[1]), `${template}/${file} must not import another template package (${match[1]})`);
    }
    assert.ok(!/framer-motion/.test(source), `${template}/${file} must not use an animation library`);
  }
  const css = fs.readFileSync(path.join(directory, "bloom.css"), "utf8");
  assert.ok(/prefers-reduced-motion: reduce/.test(css) && /data-motion-level="none"/.test(css), `${template} stops motion under reduced motion`);
  const component = fs.readFileSync(path.join(directory, "BloomTemplate.tsx"), "utf8");
  for (const hook of ["useReveal", "useScrollProgress", "usePointerEffects", "useNextAvailability", "useTimeOfDay", "circularModeSwitch", "bookingTransition"]) {
    assert.ok(component.includes(hook), `${template} uses the kit's ${hook}`);
  }
  assert.ok(component.includes('section(snapshot.sections, "process")') && component.includes('section(snapshot.sections, "proof")'), `${template} renders the required process and proof sections`);
}
assert.ok(!registry.includes(`"ergata-therapy@2"`), "ergata-therapy has no second version yet");
assert.ok(registry.includes("rendererVersion"), "the registry resolves by renderer version");

// Ergata (therapy practices) keeps its safety notice as owner content: numbers are never hard-coded.
const ergata = fs.readFileSync(path.join(templateRoot, "ergata", "ErgataTemplate.tsx"), "utf8");
assert.ok(!/\b(991|907|939)\b/.test(ergata), "emergency numbers come from the release, not the template");
assert.ok(ergata.includes('section(snapshot.sections, "notice")') || ergata.includes('get("notice")'), "the template renders the notice section");
assert.ok(ergata.includes("data-qa=\"template-credit\""), "the template draws the growth footer credit");
assert.ok(ergata.includes("prefers-reduced-motion") || fs.readFileSync(path.join(templateRoot, "ergata", "ergata.css"), "utf8").includes("prefers-reduced-motion"), "motion respects reduced motion");
const ergataCss = fs.readFileSync(path.join(templateRoot, "ergata", "ergata.css"), "utf8");
assert.ok(ergata.includes("snapshot.bookingPaths"), "each Ergata session card books its own session (online or office)");
for (const role of ["needs.ergata", "approach.ergata", "faq.ergata", "office.ergata", "online.ergata", "band.ergata"]) {
  assert.ok(ergata.includes(`"${role}"`), `Ergata draws its own picture for ${role} when the owner has none`);
}
assert.ok(/srcSet=/.test(ergata) && /loading=\{eager \? undefined : "lazy"\}/.test(ergata), "Ergata photos load lazily with a mobile source");
assert.ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none !important/.test(ergataCss), "breathing shapes stop under reduced motion");
assert.ok(!registry.includes("quiet-trust-warm-editorial"));
assert.ok(!registry.includes("crafted-editorial-atelier"));
assert.ok(!registry.includes("warm-vitality-studio"));
assert.ok(!/tizita|wana/.test(registry), "retired themes stay unregistered");
console.log("PASS: six certified recipes with independent, fail-closed versioned packages");
