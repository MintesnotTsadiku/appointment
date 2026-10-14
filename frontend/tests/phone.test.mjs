// Phone numbers: the browser rules (src/lib/phone.ts) and the server-rendered pages'
// rules (appointment/public/js/phone.js) against the cases the server is tested with.
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const vectors = JSON.parse(readFileSync(new URL('../../appointment/helpers/phone_vectors.json', import.meta.url), 'utf8')).cases;
const app = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/phone.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: app });
const page = { exports: {} };
vm.runInNewContext(readFileSync(new URL('../../appointment/public/js/phone.js', import.meta.url), 'utf8'), { module: page, window: {} });

const owner = ['+251911223344', '0911223344', '911223344', '+251711223344', '0711223344', '711223344'];
for (const input of owner) assert.ok(vectors.some((row) => row.input === input), `the owner's example ${input} is a shared case`);

let checked = 0;
for (const row of vectors) {
  if (row.server_only) continue;
  assert.equal(app.normalizePhone(row.input), row.e164, `app ${JSON.stringify(row.input)}`);
  assert.equal(page.exports.normalize(row.input), row.e164, `page ${JSON.stringify(row.input)}`);
  if (row.display) {
    assert.equal(app.formatPhone(row.input), row.display, `app display ${row.input}`);
    assert.equal(page.exports.format(row.input), row.display, `page display ${row.input}`);
  }
  if (row.e164) assert.equal(app.formatPhone(row.input), page.exports.format(row.input), `same display ${row.input}`);
  checked++;
}
for (const row of vectors.filter((item) => item.server_only)) {
  // The browser lets these through; the server refuses them with the same hint.
  assert.equal(app.normalizePhone(row.input), page.exports.normalize(row.input), `same lenient answer ${row.input}`);
}
assert.deepEqual([...app.splitPhones('0911223344, 0711223344;\n+44 7911 123456,,')], ['0911223344', '0711223344', '+44 7911 123456']);
assert.deepEqual([...app.phoneList('+251911223344\n0911223344\nnot a phone\n0711223344')], ['+251911223344', '+251711223344']);
assert.equal(app.formatPhone('+447911123456'), '+44 791 112 3456');
assert.equal(app.phoneHref('0911 22 33 44'), 'tel:+251911223344');
assert.equal(app.phoneHref('call me'), '');
console.log(`PASS: ${checked} shared phone cases in the app and the server-rendered pages, splitting, lists and display`);
