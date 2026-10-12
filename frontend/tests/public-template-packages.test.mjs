import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(root, "src/public-experience/templates");
const templates = ["selam", "bloom", "meron", "abugida", "tena", "tena-v2", "selam-v2", "bloom-v2", "meron-v2", "abugida-v2", "ergata"];

const registry = fs.readFileSync(path.join(templateRoot, "registry.ts"), "utf8");
for (const template of templates) {
  const directory = path.join(templateRoot, template);
  const source = fs.readdirSync(directory).filter((file) => file.endsWith("Template.tsx"));
  const styles = fs.readdirSync(directory).filter((file) => file.endsWith(".css"));
  assert.equal(source.length, 1, `${template} must own one template component`);
  assert.ok(styles.includes(`${template.replace(/-v2$/, "")}.css`), `${template} must own its main stylesheet`);
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
assert.ok(registry.includes(`"ergata-therapy@1"`), "ergata-therapy v1 is registered");
assert.ok(!registry.includes(`"ergata-therapy@2"`), "ergata-therapy has no second version yet");
assert.ok(registry.includes("rendererVersion"), "the registry resolves by renderer version");

// Ergata (therapy practices) keeps its safety notice as owner content: numbers are never hard-coded.
const ergata = fs.readFileSync(path.join(templateRoot, "ergata", "ErgataTemplate.tsx"), "utf8");
assert.ok(!/\b(991|907|939)\b/.test(ergata), "emergency numbers come from the release, not the template");
assert.ok(ergata.includes('section(snapshot.sections, "notice")') || ergata.includes('get("notice")'), "the template renders the notice section");
assert.ok(ergata.includes("data-qa=\"template-credit\""), "the template draws the growth footer credit");
assert.ok(ergata.includes("prefers-reduced-motion") || fs.readFileSync(path.join(templateRoot, "ergata", "ergata.css"), "utf8").includes("prefers-reduced-motion"), "motion respects reduced motion");
assert.ok(!registry.includes("quiet-trust-warm-editorial"));
assert.ok(!registry.includes("crafted-editorial-atelier"));
assert.ok(!registry.includes("warm-vitality-studio"));
assert.ok(!/tizita|wana/.test(registry), "retired themes stay unregistered");
console.log("PASS: six certified recipes with independent, fail-closed versioned packages");
