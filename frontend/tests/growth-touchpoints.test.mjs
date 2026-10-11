/**
 * Customer touchpoints: manage token parsing, prompt dismissal storage and sign-up paths.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(new URL('../src/lib/growth-touchpoints.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, URLSearchParams });
const { manageTokenFromPath, isPromptDismissed, rememberPromptDismissed, signupPath, safeLocalPath, PROMPT_DISMISSED_KEY } = exports;

// Both manage routes carry the token as the last path segment.
assert.equal(manageTokenFromPath('/bloom-studio/booking/APT-1.0.abc'), 'APT-1.0.abc');
assert.equal(manageTokenFromPath('/schedule/individual/booking/APT-2.3.def?pay=chapa'), 'APT-2.3.def');
assert.equal(manageTokenFromPath(undefined), '');
assert.equal(manageTokenFromPath('/bloom-studio/book'), '');

// Dismissal survives a missing or throwing storage.
const memory = new Map();
const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
assert.equal(isPromptDismissed(storage), false);
rememberPromptDismissed(storage);
assert.equal(memory.get(PROMPT_DISMISSED_KEY), '1');
assert.equal(isPromptDismissed(storage), true);
const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
assert.equal(isPromptDismissed(broken), false);
assert.doesNotThrow(() => rememberPromptDismissed(broken));
assert.equal(isPromptDismissed(null), false);

// Sign-up paths carry the channel, and extra values only when set. No personal data goes in.
assert.equal(signupPath('powered_by_page'), '/signup?source=powered_by_page');
assert.equal(signupPath('customer_prompt', { prefill: 'n.1.s', ref: '' }), '/signup?source=customer_prompt&prefill=n.1.s');

// Server answers are followed only as same-site paths.
assert.equal(safeLocalPath('/signup?source=x'), '/signup?source=x');
assert.equal(safeLocalPath('//evil.example/x'), '');
assert.equal(safeLocalPath('https://evil.example'), '');
assert.equal(safeLocalPath(undefined), '');

console.log('growth-touchpoints tests passed');
