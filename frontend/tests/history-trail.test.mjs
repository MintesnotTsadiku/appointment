/**
 * The in-app history trail (`src/lib/history-trail.ts`) that the booking header's Back uses to find the page
 * before the booking pages. Run with `npm run test:dom`.
 */
import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import vm from "node:vm";
import ts from "typescript";

const exports = {};
const source = readFileSync(new URL("../src/lib/history-trail.ts", import.meta.url), "utf8");
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, JSON, Object, Number, String });
const { nextTrail } = exports;
const plain = (trail) => JSON.parse(JSON.stringify(trail));

// The website, /book, then the time picker (push) and the chooser in its place (replace).
let trail = nextTrail({}, 0, "/bloom-studio", "POP", true);
trail = nextTrail(trail, 1, "/bloom-studio/book", "PUSH", false);
trail = nextTrail(trail, 2, "/schedule/org/bloom-studio/EVT-1?type=EVT-1", "PUSH", false);
trail = nextTrail(trail, 2, "/schedule/org/bloom-studio", "REPLACE", false);
assert.deepEqual(plain(trail), { 0: "/bloom-studio", 1: "/bloom-studio/book", 2: "/schedule/org/bloom-studio" });
// A browser Back keeps the entries after it; a push drops them (the browser does too).
trail = nextTrail(trail, 1, "/bloom-studio/book", "POP", false);
assert.equal(plain(trail)[2], "/schedule/org/bloom-studio");
trail = nextTrail(trail, 2, "/bloom-studio/journal", "PUSH", false);
assert.deepEqual(plain(trail), { 0: "/bloom-studio", 1: "/bloom-studio/book", 2: "/bloom-studio/journal" });
// The first entry of a new document starts a new trail.
assert.deepEqual(plain(nextTrail(trail, 0, "/schedule/org/bloom-studio", "POP", true)), { 0: "/schedule/org/bloom-studio" });

console.log("history-trail: ok");
