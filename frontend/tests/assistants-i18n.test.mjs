/**
 * The Tasks & Assistants area is fully translated: no hard-coded user-facing
 * English remains in its pages and components, and every `assistants.*` /
 * `tasks.*` key the code uses exists in both catalogs (English and Amharic).
 *
 * The scan parses each file with the TypeScript compiler and flags English in
 * JSX text, user-facing JSX attributes, `{"literal"}` children, toast calls and
 * label-like object properties. Real exceptions go in ALLOWED.
 *
 * Run with `npm run test:dom`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const SCOPE = [
  "src/pages/assistants",
  "src/pages/tasks",
  "src/components/assistants",
  "src/components/tasks",
  "src/lib/tasks-assistants",
];
// Text that is the same in every language (symbols, codes, data placeholders).
const ALLOWED = new Set(["1:1", "1:2", "1:3", "VA", "AM", "PM"]);
const USER_ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label", "description", "aria-description", "aria-placeholder"]);
const LABEL_PROPS = new Set(["label", "title", "description", "placeholder", "message", "emptyText", "text", "heading", "subtitle", "tooltip"]);

const files = SCOPE.flatMap((dir) => walk(path.join(root, dir))).filter((file) => /\.(tsx?|jsx?)$/.test(file));
assert.ok(files.length > 20, "the scan finds the assistants and tasks sources");

const english = (text) => {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value || ALLOWED.has(value)) return false;
  return /[A-Za-z]{2,}/.test(value);
};

const findings = [];
const usedKeys = new Set();
for (const file of files) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const report = (node, text) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart());
    findings.push(`${path.relative(root, file)}:${line + 1}: ${JSON.stringify(text.replace(/\s+/g, " ").trim())}`);
  };
  const literalText = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
    if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(" ");
    return null;
  };
  const visit = (node) => {
    if (ts.isJsxText(node) && english(node.text)) report(node, node.text);
    if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(source);
      if (USER_ATTRS.has(name)) {
        const init = node.initializer;
        const text = ts.isStringLiteral(init) ? init.text : ts.isJsxExpression(init) && init.expression ? literalText(init.expression) : null;
        if (text && english(text)) report(node, text);
      }
    }
    if (ts.isJsxExpression(node) && node.expression && ts.isJsxElement(node.parent)) {
      const text = literalText(node.expression);
      if (text && english(text)) report(node, text);
    }
    if (ts.isConditionalExpression(node) && (ts.isJsxExpression(node.parent) || ts.isJsxExpression(node.parent?.parent))) {
      for (const branch of [node.whenTrue, node.whenFalse]) {
        const text = literalText(branch);
        if (text && english(text)) report(branch, text);
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(source);
      if (/^toast(\.\w+)?$/.test(callee)) {
        for (const arg of node.arguments) {
          const text = literalText(arg);
          if (text && english(text)) report(arg, text);
          if (ts.isBinaryExpression(arg)) {
            const right = literalText(arg.right);
            if (right && english(right)) report(arg.right, right);
          }
          if (ts.isObjectLiteralExpression(arg)) {
            for (const prop of arg.properties) {
              const value = ts.isPropertyAssignment(prop) ? literalText(prop.initializer) : null;
              if (value && english(value)) report(prop, value);
            }
          }
        }
      }
      if (/^(t|translate)$/.test(callee) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        usedKeys.add(node.arguments[0].text);
      }
    }
    if (ts.isPropertyAssignment(node) && LABEL_PROPS.has(node.name.getText(source).replace(/['"]/g, ""))) {
      const text = literalText(node.initializer);
      if (text && english(text)) report(node, text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  // Template keys like t(`tasks.status.${x}`) are covered by the catalog check below.
}

if (process.argv.includes("--report")) {
  // Working aid: `node tests/assistants-i18n.test.mjs --report [path-fragment]` lists findings only.
  const only = process.argv.slice(2).filter((arg) => arg !== "--report");
  const shown = findings.filter((line) => !only.length || only.some((part) => line.includes(part)));
  console.log(shown.join("\n") || "no findings");
  console.log(`${shown.length} findings`);
  process.exit(0);
}
assert.deepEqual(findings, [], `hard-coded user-facing English in the assistants/tasks area:\n${findings.join("\n")}`);

const flat = (value, prefix = "", out = {}) => {
  for (const [key, item] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (item && typeof item === "object") flat(item, full, out);
    else out[full] = item;
  }
  return out;
};
const en = flat(JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/translations/en.json"), "utf8")));
const am = flat(JSON.parse(fs.readFileSync(path.join(root, "src/lib/i18n/translations/am.json"), "utf8")));
const ownKeys = [...usedKeys].filter((key) => /^(assistants|tasks)\./.test(key));
assert.ok(ownKeys.length > 100, `the area uses its own catalog keys (${ownKeys.length})`);
const missing = [...usedKeys].filter((key) => !(key in en) || !(key in am));
assert.deepEqual(missing, [], `keys missing from en.json or am.json:\n${missing.join("\n")}`);
for (const key of Object.keys(en).filter((item) => /^(assistants|tasks)\./.test(item))) {
  assert.ok(am[key] && am[key] !== en[key] || !/[A-Za-z]{2,}/.test(en[key].replace(/\{\w+\}/g, "")), `${key} has an Amharic translation`);
  const holes = (text) => (text.match(/\{\w+\}/g) || []).sort().join(",");
  assert.equal(holes(am[key]), holes(en[key]), `${key} keeps its placeholders in Amharic`);
}
// Enum labels the shared helpers resolve.
for (const group of ["tasks.status", "tasks.priority", "assistants.status", "assistants.tier", "assistants.proficiency"]) {
  assert.ok(Object.keys(en).some((key) => key.startsWith(`${group}.`)), `${group} labels exist`);
}
// Case-only duplicates break the source-keyed Translation catalog.
const byLower = new Map();
for (const value of new Set(Object.values(en))) {
  if (typeof value !== "string") continue;
  const low = value.toLowerCase();
  byLower.set(low, [...(byLower.get(low) || []), value]);
}
const ownSources = new Set(Object.entries(en).filter(([key]) => /^(assistants|tasks)\.|^server\.assistants\./.test(key)).map(([, value]) => value));
const caseDupes = [...byLower.values()].filter((group) => group.length > 1 && group.some((value) => ownSources.has(value)));
assert.deepEqual(caseDupes, [], "no two English strings differ only by case");

console.log(`assistants-i18n: ${files.length} files scanned, ${ownKeys.length} keys used, all translated`);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
