import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/time.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports });
const { parseDisplayTime, formatWallTime } = exports;
for (const format of ['12h', '24h', 'ethiopian']) {
  for (let minute = 0; minute < 1440; minute++) {
    const stored = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
    assert.equal(parseDisplayTime(formatWallTime(stored, format), format), stored, `${format} ${stored}`);
  }
}
assert.equal(parseDisplayTime('1:00 ማታ', 'ethiopian'), '19:00');
assert.equal(parseDisplayTime('6:00 ለሊት', 'ethiopian'), '00:00');
for (const text of ['13:99 PM', '00:00 AM', '13:00 AM', '9:60 PM', 'text 9:30 AM', '9:30 AM garbage', '03:00']) assert.equal(parseDisplayTime(text, '12h'), null, text);
for (const text of ['03:00', '13:00 ጠዋት', '1:60 ጠዋት', '1:00 ከሰዓት', '6:00 ምሽት']) assert.equal(parseDisplayTime(text, 'ethiopian'), null, text);
console.log('PASS: 4,320 minute/format round trips, evening/midnight aliases and invalid/ambiguous input rejection');
