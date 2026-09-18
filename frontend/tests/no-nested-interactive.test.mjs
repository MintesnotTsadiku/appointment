/**
 * Static DOM-nesting guard.
 *
 * Renders are not trivial to mount without a browser, so this test parses the
 * settings/manage tree components and fails if an interactive element (a real
 * `<button>`/`<a>` or the `Button` component, which renders a `<button>`) is
 * nested inside another interactive element. This is the exact defect React's
 * `validateDOMNesting` reported for `HierarchyTree.tsx`.
 *
 * Run with `npm run test:dom`.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parse } from "@babel/parser";

const here = dirname(fileURLToPath(import.meta.url));

const DEFAULT_TARGETS = [
  resolve(here, "../src/pages/settings/manage/components/HierarchyTree.tsx"),
  resolve(here, "../src/pages/settings/manage/components/ItemCard.tsx"),
];
const TARGETS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : DEFAULT_TARGETS;

const INTERACTIVE_IDENTIFIERS = new Set(["button", "a", "Button"]);

function isInteractiveName(node) {
  if (!node) return false;
  if (node.type === "JSXIdentifier") {
    return (
      INTERACTIVE_IDENTIFIERS.has(node.name) ||
      INTERACTIVE_IDENTIFIERS.has(node.name.toLowerCase())
    );
  }
  if (node.type === "JSXMemberExpression") {
    return isInteractiveName(node.property);
  }
  return false;
}

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (typeof node.type === "string") visit(node);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "start" || key === "end") continue;
    walk(node[key], visit);
  }
}

function findNestedInteractive(code) {
  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
  const findings = [];

  walk(ast, (node) => {
    if (node.type !== "JSXElement") return;
    if (!isInteractiveName(node.openingElement.name)) return;
    walk(node, (descendant) => {
      if (descendant === node) return;
      if (descendant.type !== "JSXElement") return;
      if (!isInteractiveName(descendant.openingElement.name)) return;
      findings.push(descendant.loc?.start?.line ?? "?");
    });
  });

  return findings;
}

let failed = false;
for (const file of TARGETS) {
  const code = readFileSync(file, "utf8");
  const lines = findNestedInteractive(code);
  if (lines.length > 0) {
    failed = true;
    console.error(
      `Nested interactive controls in ${file}: lines ${lines.join(", ")}`
    );
  } else {
    console.log(`OK: no nested interactive controls in ${file}`);
  }
}

if (failed) {
  process.exit(1);
}
