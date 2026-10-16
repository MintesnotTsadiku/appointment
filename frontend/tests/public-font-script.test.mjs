import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import assert from "node:assert/strict";
const source = fs.readFileSync(new URL("../src/public-experience/fonts.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
const checks = [], loads = [];
const exports = {};
vm.runInNewContext(code, {exports, document: {fonts: {
  check: (...args) => {checks.push(args); return args[1] === "ሰላም";},
  load: (...args) => {loads.push(args); return Promise.resolve([]);},
}}});
const config = {locale: "am", compiledDesign: {typography: {roles: {display: {family: "Field Sans", weight: 800}, body: {family: "Field Sans", weight: 400}}}}};
assert.equal(exports.designFontsReady(config), true);
await exports.loadDesignFonts(config);
assert.equal(checks.length, 2);
assert.equal(loads.length, 2);
assert.ok(checks.concat(loads).every(([, sample]) => sample === "ሰላም"));
loads.length = 0;
await exports.loadDesignFonts({...config, locale: "en"});
assert.ok(loads.every(([, sample]) => sample === "BESbswy"));
console.log("public fonts: readiness and loading use the page script");
