import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(root, "src/public-experience/templates");
const templates = ["selam", "bloom", "meron", "abugida", "tena", "tena-v2", "selam-v2", "bloom-v2", "meron-v2", "abugida-v2"];

const registry = fs.readFileSync(path.join(templateRoot, "registry.ts"), "utf8");
for (const template of templates) {
  const directory = path.join(templateRoot, template);
  const source = fs.readdirSync(directory).filter((file) => file.endsWith("Template.tsx"));
  const styles = fs.readdirSync(directory).filter((file) => file.endsWith(".css"));
  assert.equal(source.length, 1, `${template} must own one template component`);
  assert.equal(styles.length, 1, `${template} must own one stylesheet`);
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
assert.ok(registry.includes("rendererVersion"), "the registry resolves by renderer version");
assert.ok(!registry.includes("quiet-trust-warm-editorial"));
assert.ok(!registry.includes("crafted-editorial-atelier"));
assert.ok(!registry.includes("warm-vitality-studio"));
assert.ok(!/tizita|wana/.test(registry), "retired themes stay unregistered");
console.log("PASS: five certified recipes, each with independent, fail-closed v1 and v2 packages");
