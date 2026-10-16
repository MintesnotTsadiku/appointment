import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

import { certifiedPackages, contractFailures } from "./template-contract.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const templateRoot = path.join(root, "src/public-experience/templates");
const templates = ["selam", "bloom", "meron", "abugida", "tena", "tena-v2", "selam-v2", "bloom-v2", "meron-v2", "abugida-v2", "ergata", "bloom-v3", "meron-v3", "abugida-v3", "selam-v3", "tena-v3", "ergata-v2"];

const registry = fs.readFileSync(path.join(templateRoot, "registry.ts"), "utf8");
// One registry entry: from its `"key@version":` to the next entry.
const registered = (id) => (registry.split(`"${id}":`)[1] || "").split(/\n\s*"[a-z-]+@\d+":/)[0];
// Packages load on first use, so a page downloads only its own template (docs/operations/PUBLIC_PERFORMANCE.md).
assert.ok(!/^import .* from "\.\/[^"]+\/[A-Za-z]+(Template|Content)";$/m.test(registry), "the registry imports no template package statically");
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
// Meron v3 ("The Fitting Room"): an independent package on the headless kit, next to v1 and v2.
assert.ok(/Loading: t\.MeronLoading/.test(registered("meron-atelier@3")), "meron-atelier v3 is registered with its loading screen");
{
  const directory = path.join(templateRoot, "meron-v3");
  for (const file of fs.readdirSync(directory).filter((name) => /\.tsx?$/.test(name))) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    for (const match of source.matchAll(/from "\.\.\/([^"]+)"/g)) {
      assert.ok(!/^(selam|bloom|meron|abugida|tena|ergata)(-v\d)?\//.test(match[1]), `meron-v3/${file} must not import another template package (${match[1]})`);
    }
    assert.ok(!/framer-motion/.test(source), `meron-v3/${file} must not use an animation library`);
  }
  const css = fs.readFileSync(path.join(directory, "meron.css"), "utf8");
  assert.ok(/prefers-reduced-motion: reduce/.test(css) && /data-motion-level="none"/.test(css), "meron-v3 stops motion under reduced motion");
  assert.ok(/\.m3 \*, \.m3 \*::before, \.m3 \*::after \{ box-sizing: border-box; border-radius: 0; \}/.test(css), "meron-v3 keeps the radius-0 discipline");
  assert.ok(!/min-height: calc\(100dvh/.test(css), "the Meron v3 hero does not depend on the viewport height");
  const component = fs.readFileSync(path.join(directory, "MeronTemplate.tsx"), "utf8");
  for (const hook of ["useReveal", "useScrollProgress", "usePointerEffects", "useNextAvailability", "useTimeOfDay", "useSectionProgress", "circularModeSwitch", "bookingTransition"]) {
    assert.ok(component.includes(hook), `meron-v3 uses the kit's ${hook}`);
  }
  assert.ok(component.includes('section(snapshot.sections, "process")') && component.includes('section(snapshot.sections, "proof")'), "meron-v3 renders the required process and proof sections");
  for (const role of ["loop2.meron", "loop3.meron", "before.meron", "after.meron", "swatch.meron", "band.meron", "story3.meron"]) {
    assert.ok(component.includes(`"${role}"`), `meron-v3 draws its own photo for ${role}`);
  }
}
// Abugida v3 ("Living Manuscript"): an independent package on the headless kit, next to v1 and v2.
assert.ok(/Loading: t\.AbugidaLoading/.test(registered("abugida-language@3")), "abugida-language v3 is registered with its loading screen");
{
  const directory = path.join(templateRoot, "abugida-v3");
  for (const file of fs.readdirSync(directory).filter((name) => /\.tsx?$/.test(name))) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    for (const match of source.matchAll(/from "\.\.\/([^"]+)"/g)) {
      assert.ok(!/^(selam|bloom|meron|abugida|tena|ergata)(-v\d)?\//.test(match[1]), `abugida-v3/${file} must not import another template package (${match[1]})`);
    }
    assert.ok(!/framer-motion/.test(source), `abugida-v3/${file} must not use an animation library`);
  }
  const css = fs.readFileSync(path.join(directory, "abugida.css"), "utf8");
  assert.ok(/prefers-reduced-motion: reduce/.test(css) && /data-motion-level="none"/.test(css), "abugida-v3 stops motion under reduced motion");
  assert.ok(/clip-path: url\(#a3-ha\)/.test(css), "the Abugida v3 hero photo opens inside the fidel window");
  const component = fs.readFileSync(path.join(directory, "AbugidaTemplate.tsx"), "utf8");
  for (const hook of ["useReveal", "useScrollProgress", "useCountUp", "usePointerEffects", "useNextAvailability", "useTimeOfDay", "useSectionProgress", "circularModeSwitch", "bookingTransition"]) {
    assert.ok(component.includes(hook), `abugida-v3 uses the kit's ${hook}`);
  }
  assert.ok(component.includes('section(snapshot.sections, "process")') && component.includes('section(snapshot.sections, "proof")'), "abugida-v3 renders the required process and proof sections");
  for (const role of ["band.abugida", "faq.abugida", "phrase.abugida", "room1.abugida", "room2.abugida"]) {
    assert.ok(component.includes(`"${role}"`), `abugida-v3 draws its own photo for ${role}`);
  }
  assert.ok(/geez\(/.test(component), "abugida-v3 numbers folios, steps and sections in Ge'ez numerals");
}
// Selam v3 ("Tempo"): an independent package on the headless kit, next to v1 and v2.
assert.ok(/Loading: t\.SelamLoading/.test(registered("selam-movement@3")), "selam-movement v3 is registered with its loading screen");
{
  const directory = path.join(templateRoot, "selam-v3");
  for (const file of fs.readdirSync(directory).filter((name) => /\.tsx?$/.test(name))) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    for (const match of source.matchAll(/from "\.\.\/([^"]+)"/g)) {
      assert.ok(!/^(selam|bloom|meron|abugida|tena|ergata)(-v\d)?\//.test(match[1]), `selam-v3/${file} must not import another template package (${match[1]})`);
    }
    assert.ok(!/framer-motion/.test(source), `selam-v3/${file} must not use an animation library`);
  }
  const css = fs.readFileSync(path.join(directory, "selam.css"), "utf8");
  assert.ok(/prefers-reduced-motion: reduce/.test(css) && /data-motion-level="none"/.test(css), "selam-v3 stops motion under reduced motion");
  assert.ok(/view-timeline: --s3-flow/.test(css) && /\[data-scroll="js"\][^{]*\.s3-flow-frame/.test(css), "the five-frame scrub runs on CSS scroll timelines with the kit's --p fallback");
  const component = fs.readFileSync(path.join(directory, "SelamTemplate.tsx"), "utf8");
  for (const hook of ["useReveal", "useScrollProgress", "usePointerEffects", "useCountUp", "useNextAvailability", "useTimeOfDay", "useSectionProgress", "circularModeSwitch", "bookingTransition"]) {
    assert.ok(component.includes(hook), `selam-v3 uses the kit's ${hook}`);
  }
  assert.ok(component.includes('section(snapshot.sections, "process")') && component.includes('section(snapshot.sections, "proof")'), "selam-v3 renders the required process and proof sections");
  for (const role of ["hero.selam", "flow5.selam", "session1.selam", "beat3.selam", "benefit.selam", "quote.selam", "interlude.selam", "studio.selam", "band.selam"]) {
    assert.ok(component.includes(`"${role}"`), `selam-v3 draws its own photo for ${role}`);
  }
}
// Tena v3 ("Clear Path"): an independent package on the headless kit, next to v1 and v2.
assert.ok(/Loading: t\.TenaLoading/.test(registered("tena-clinic@3")), "tena-clinic v3 is registered with its loading screen");
{
  const directory = path.join(templateRoot, "tena-v3");
  for (const file of fs.readdirSync(directory).filter((name) => /\.tsx?$/.test(name))) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    for (const match of source.matchAll(/from "\.\.\/([^"]+)"/g)) {
      assert.ok(!/^(selam|bloom|meron|abugida|tena|ergata)(-v\d)?\//.test(match[1]), `tena-v3/${file} must not import another template package (${match[1]})`);
    }
    assert.ok(!/framer-motion/.test(source), `tena-v3/${file} must not use an animation library`);
  }
  const css = fs.readFileSync(path.join(directory, "tena.css"), "utf8");
  assert.ok(/prefers-reduced-motion: reduce/.test(css) && /data-motion-level="none"/.test(css), "tena-v3 stops motion under reduced motion");
  assert.ok(/font-family: "Tena Figures"; src: url\("\/assets\/appointment\/fonts\/tena\/tena-figures-400\.woff2"\)[^}]*unicode-range: U\+0030-0039/.test(css), "tena-v3 sets digits in Tena Figures (open zero, no slashed zero)");
  assert.ok(/\.t3-route-ink/.test(css) && /view-timeline: --t3-path/.test(css), "tena-v3 draws the route line down the page");
  const component = fs.readFileSync(path.join(directory, "TenaTemplate.tsx"), "utf8");
  for (const hook of ["useReveal", "useScrollProgress", "usePointerEffects", "useCountUp", "useNextAvailability", "useTimeOfDay", "useSectionProgress", "circularModeSwitch", "bookingTransition"]) {
    assert.ok(component.includes(hook), `tena-v3 uses the kit's ${hook}`);
  }
  assert.ok(component.includes('section(snapshot.sections, "process")') && component.includes('section(snapshot.sections, "proof")'), "tena-v3 renders the required process and proof sections");
  for (const role of ["care1.tena", "visit1.tena", "room1.tena", "faq.tena", "benefit.tena", "proof.tena", "band.tena"]) {
    assert.ok(component.includes(`"${role}"`), `tena-v3 draws its own photo for ${role}`);
  }
  assert.ok(/snapshot\.bookingPaths\?\.\[item\.id\]/.test(component) && /<a className="t3-handoff-row" href=\{href\}/.test(component), "tena-v3 handoff rows link each service's own scheduler");
}
// Ergata v2 (v3 parity): an independent package on the headless kit, next to Ergata v1.
assert.ok(/"ergata-therapy@2"[\s\S]*?ErgataLoading/.test(registry), "ergata-therapy v2 is registered with its loading screen");
assert.ok(registry.includes(`"ergata-therapy@1"`), "ergata-therapy v1 stays registered for releases pinned to it");
{
  const directory = path.join(templateRoot, "ergata-v2");
  for (const file of fs.readdirSync(directory).filter((name) => /\.tsx?$/.test(name))) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    for (const match of source.matchAll(/from "\.\.\/([^"]+)"/g)) {
      assert.ok(!/^(selam|bloom|meron|abugida|tena|ergata)(-v\d)?\//.test(match[1]), `ergata-v2/${file} must not import another template package (${match[1]})`);
    }
    assert.ok(!/framer-motion/.test(source), `ergata-v2/${file} must not use an animation library`);
  }
  const css = fs.readFileSync(path.join(directory, "ergata.css"), "utf8");
  assert.ok(/prefers-reduced-motion: reduce/.test(css) && /data-motion-level="none"/.test(css), "ergata-v2 stops motion under reduced motion");
  assert.ok(!/(^|[^-\w])\.eg[ :\[{.,]/m.test(css.replace(/\.eg2\b/g, "")), "ergata-v2 uses its own class prefix (.eg2), so it never styles Ergata v1 pages");
  assert.ok(/\.eg2-approach \{ color: var\(--e2-on-deep\); background: var\(--e2-deep\); \}/.test(css), "ergata-v2 sets the approaches on one deep-sage band");
  assert.ok(/\.eg2-rail \{ display: flex !important;[^}]*scroll-snap-type: x mandatory/.test(css), "needs and sessions become swipe rails on phones");
  assert.ok(/\.eg2-hero-copy \{ display: contents; \}/.test(css), "on phones the hero arch peeks into the first screen");
  const component = fs.readFileSync(path.join(directory, "ErgataTemplate.tsx"), "utf8");
  for (const hook of ["useReveal", "useScrollProgress", "usePointerEffects", "useNextAvailability", "useTimeOfDay", "useSectionProgress", "circularModeSwitch", "bookingTransition", "useMotionLevel"]) {
    assert.ok(component.includes(hook), `ergata-v2 uses the kit's ${hook}`);
  }
  for (const role of ["needs.ergata", "approach.ergata", "faq.ergata", "office.ergata", "online.ergata", "band.ergata", "testimonial.ergata", "contact.ergata", "window.ergata"]) {
    assert.ok(component.includes(`"${role}"`) || fs.readFileSync(path.join(directory, "ErgataTemplate.tsx"), "utf8").includes(role), `ergata-v2 draws its own photo for ${role}`);
  }
  assert.ok(/night=\{night\} eager/.test(component) && /mode === "dark" \|\| now\.afterDark/.test(component), "ergata-v2 shows the night photos in dark mode and after dark");
  assert.ok(/data-qa="ergata-sticky-book"/.test(component) && /data-qa="ergata-dots"/.test(component), "ergata-v2 has the phone booking bar and section dots");
  assert.ok(!/\b(991|907|939)\b/.test(component), "emergency numbers come from the release, not the template");
  assert.ok(component.includes("snapshot.bookingPaths"), "each Ergata v2 session card books its own session (online or office)");
  assert.ok(fs.existsSync(path.join(directory, "ErgataMoment.tsx")) && fs.readFileSync(path.join(templateRoot, "moments.tsx"), "utf8").includes('"ergata-therapy@2"'), "ergata-v2 has its booking-success moment");
}
assert.ok(registry.includes("rendererVersion"), "the registry resolves by renderer version");

// The quality bar of every certified package (a booking skin): the product contract (booking skin, loading
// screen, success moment, live availability and holiday greeting behind the owner settings, Habesha hours,
// reduced motion, Amharic chrome, a designed dark mode, lazy registration) and the expressive forms that
// its recipe declares under `expression`. See tests/template-contract.mjs and template-expression.test.mjs.
for (const pkg of certifiedPackages()) {
  const failures = contractFailures(pkg);
  assert.equal(failures.length, 0, `${pkg.folder} (${pkg.id}) misses the quality bar: ${failures.join("; ")}`);
}

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
