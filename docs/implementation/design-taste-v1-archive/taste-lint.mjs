#!/usr/bin/env node
// Mechanical taste checks for public template packages.
// Usage: node .claude/skills/design-taste/scripts/taste-lint.mjs [template ...] [--json]
// Exit code 1 when any error is found. Warnings never fail.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const TEMPLATES = join(ROOT, "frontend/src/public-experience/templates");

class TemplateLinter {
  constructor(name) {
    this.name = name;
    const dir = join(TEMPLATES, name);
    const files = readdirSync(dir);
    this.tsx = readFileSync(join(dir, files.find((f) => f.endsWith(".tsx"))), "utf8");
    this.css = readFileSync(join(dir, files.find((f) => f.endsWith(".css"))), "utf8");
    this.findings = [];
  }

  run() {
    this.checkLiteralCopy();
    this.checkLiteralAlt();
    this.checkFakeControls();
    this.checkCharacters();
    this.checkNumbering();
    this.checkForcedBreaks();
    this.checkEyebrows();
    this.checkCss();
    return this.findings;
  }

  add(level, rule, message) {
    this.findings.push({ template: this.name, level, rule, message });
  }

  // Visible JSX text that does not come from content or i18n.
  checkLiteralCopy() {
    const nodes = textNodes(this.tsx).filter((t) => /[A-Za-zሀ-፿]{3,}/.test(t));
    if (nodes.length) this.add("error", "literal-copy", `${nodes.length} hard-coded strings, e.g. ${sample(nodes)}`);
  }

  checkLiteralAlt() {
    const alts = [...this.tsx.matchAll(/alt="([^"]+)"/g)].map((m) => m[1]);
    if (alts.length) this.add("error", "literal-alt", `${alts.length} hard-coded alt texts, e.g. ${sample(alts)}`);
  }

  checkFakeControls() {
    const options = [...this.tsx.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]);
    if (options.length) this.add("error", "fake-control", `select with invented options: ${sample(options)}`);
  }

  checkCharacters() {
    // Whole file: dashes also hide between expressions, e.g. {name} — {role}.
    const dashes = count(this.tsx.replace(/\/\/.*$/gm, ""), /[—–]/g);
    if (dashes) this.add("error", "dash", `${dashes} em/en dashes in visible text`);
    const arrows = count(this.tsx, /[→↗]/g);
    if (arrows > 1) this.add("warn", "arrow", `${arrows} decorative arrows appended to links`);
    const dotted = textNodes(this.tsx).filter((t) => /\w.*·.*\w/.test(t));
    if (dotted.length) this.add("warn", "middot", `middle-dot meta strings: ${sample(dotted)}`);
  }

  checkNumbering() {
    const markers = count(this.tsx, /0\{index ?\+ ?1\}|>0[1-9]</g);
    if (markers) this.add("warn", "numbering", `${markers} numbered markers; keep only on real sequences (process steps)`);
  }

  checkForcedBreaks() {
    const breaks = count(this.tsx, /<br ?\/>/g);
    if (breaks > 2) this.add("warn", "forced-break", `${breaks} forced <br/> line breaks in copy`);
  }

  checkEyebrows() {
    const sections = count(this.tsx, /<section\b/g) + 1;
    const labels = count(this.tsx, /className="[a-z]+-(label|overline|eyebrow)"/g);
    const limit = Math.ceil(sections / 3);
    if (labels > limit) this.add("warn", "eyebrow", `${labels} eyebrow labels for ${sections} sections (limit ${limit})`);
  }

  checkCss() {
    const css = this.css;
    const tracked = count(css, /text-transform:\s*uppercase/g);
    if (tracked > 2) this.add("warn", "eyebrow", `${tracked} uppercase rules; Ethiopic has no case, scope them to Latin chrome`);
    const radii = new Set([...css.matchAll(/border-radius:\s*([^;}]+)/g)].map((m) => m[1].trim()));
    if (radii.size > 4) this.add("warn", "radius-sprawl", `${radii.size} distinct radius values: ${[...radii].join(", ")}`);
    if (/#000(000)?\b/i.test(css)) this.add("warn", "pure-black", "pure #000 used");
    const families = [...css.matchAll(/font-family:\s*([^;}]+)/g)].map((m) => m[1].split(",")[0].trim().replace(/"/g, ""));
    const defaults = families.filter((f) => /^(Georgia|Arial|Inter|Times|Fraunces|Instrument Serif|serif|sans-serif)$/i.test(f));
    if (defaults.length) this.add("warn", "default-font", `default face as primary: ${[...new Set(defaults)].join(", ")}`);
    if (/\b100vh\b/.test(css)) this.add("warn", "100vh", "use min-height: 100dvh");
    const animates = /@keyframes|animation\s*:|transition\s*:[^;}]*transform/.test(css);
    if (animates && !/prefers-reduced-motion/.test(css)) this.add("error", "motion-guard", "motion without a prefers-reduced-motion guard");
  }
}

// JSX text between tags, ignoring expressions and whitespace.
function textNodes(source) {
  return [...source.matchAll(/>([^<>{}]+)(?=[<{])/g)]
    .map((m) => m[1])
    .filter((t) => !/\b(export|function|const|return)\b|=>|;\s*$/.test(t))
    .map((t) => t.replace(/&nbsp;|&amp;/g, " ").trim())
    .filter(Boolean);
}

function count(text, re) {
  return (text.match(re) || []).length;
}

function sample(list) {
  return list.slice(0, 3).map((s) => JSON.stringify(s.slice(0, 40))).join(", ") + (list.length > 3 ? ", ..." : "");
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const names = args.filter((a) => !a.startsWith("--"));
  const all = readdirSync(TEMPLATES, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const targets = names.length ? names : all;
  const missing = targets.filter((n) => !existsSync(join(TEMPLATES, n)));
  if (missing.length) throw new Error(`unknown template: ${missing.join(", ")}`);

  const findings = targets.flatMap((name) => new TemplateLinter(name).run());
  if (json) console.log(JSON.stringify(findings, null, 2));
  else report(targets, findings);
  process.exit(findings.some((f) => f.level === "error") ? 1 : 0);
}

function report(targets, findings) {
  for (const name of targets) {
    const own = findings.filter((f) => f.template === name);
    const errors = own.filter((f) => f.level === "error").length;
    console.log(`\n${name}: ${errors} errors, ${own.length - errors} warnings`);
    for (const f of own) console.log(`  ${f.level.padEnd(5)} ${f.rule.padEnd(14)} ${f.message}`);
  }
}

main();
