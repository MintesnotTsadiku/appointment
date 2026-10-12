/**
 * Shared sign-out: end the session once, clear user caches, then leave with a full page load.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(new URL('../src/lib/sign-out-core.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports });
const { runSignOut, SIGN_IN_PATH } = exports;

const steps = [];
await runSignOut({
  endSession: async () => steps.push('logout'),
  clearCaches: () => steps.push('clear'),
  leave: (path) => steps.push(`leave:${path}`),
});
assert.deepEqual(steps, ['logout', 'clear', `leave:${SIGN_IN_PATH}`]);
assert.equal(SIGN_IN_PATH, '/login');

// A failed logout call still clears caches and leaves, so the user is never stuck on a stale page.
const failed = [];
const errors = [];
await runSignOut({
  endSession: async () => { throw new Error('network'); },
  clearCaches: () => failed.push('clear'),
  leave: (path) => failed.push(path),
  onError: (error) => errors.push(error.message),
});
assert.deepEqual(failed, ['clear', '/login']);
assert.deepEqual(errors, ['network']);

// No call site may use the SDK logout, which revalidates the session as Guest (403).
const { execSync } = await import('node:child_process');
const hits = execSync("grep -rln 'useFrappeAuth()' src | xargs grep -l 'logout' || true", { cwd: new URL('..', import.meta.url).pathname }).toString().trim();
assert.equal(hits, '', `use useSignOut() instead of the SDK logout in: ${hits}`);
console.log('PASS: sign-out ends the session once, clears caches and reloads to /login');
