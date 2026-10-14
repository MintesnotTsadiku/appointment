/**
 * The global floating theme toggle stays off pages that own their controls, including the landing page.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(new URL('../src/components/theme-provider/components/modeToggleRoutes.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports });
const { hidesGlobalModeToggle } = exports;

for (const path of ['/', '/templates', '/home', '/grow', '/settings/profile', '/schedule/org/bloom-studio', '/no-access']) {
  assert.equal(hidesGlobalModeToggle(path), true, `${path} owns its theme control`);
}
for (const path of ['/login', '/signup', '/partners', '/assistant', '/bloom-studio']) {
  assert.equal(hidesGlobalModeToggle(path), false, `${path} keeps the global toggle`);
}
console.log('PASS: the landing page and staff pages hide the global theme toggle');
