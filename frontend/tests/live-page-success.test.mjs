/**
 * The setup success screen's pure helpers: page state and the short and full links.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

function load(path) {
  const exports = {};
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(output, { exports });
  return exports;
}

const { liveState, shortLink, fullLink } = load('../src/components/live-page-success/core.ts');

assert.equal(liveState({ path: '/schedule/org/tena', published: true }), 'published');
assert.equal(liveState({ path: '/schedule/org/tena', published: false }), 'draft');
assert.equal(liveState({ path: '', published: true }), 'no-page', 'no page is never shown as live');

assert.equal(shortLink('book.example', '/tena-studio'), 'book.example/tena-studio');
assert.equal(shortLink('https://book.example/', '/tena-studio'), 'book.example/tena-studio');
assert.equal(shortLink('book.example', 'tena-studio'), 'book.example/tena-studio');
assert.equal(shortLink('book.example', '/schedule/p/rahel-nutrition'), 'book.example/rahel-nutrition', 'a provider page reads as its short address');
assert.equal(shortLink('book.example', '/schedule/p/rahel-nutrition/EVT-1'), 'book.example/schedule/p/rahel-nutrition/EVT-1');

assert.equal(fullLink('https://book.example', '/tena-studio'), 'https://book.example/tena-studio');
assert.equal(fullLink('https://book.example/', 'tena-studio'), 'https://book.example/tena-studio');

console.log('live-page-success: ok');
