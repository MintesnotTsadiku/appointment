/**
 * Referral loop helpers: codes, sign-up params, the friend's code per business and reward wording.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(new URL('../src/lib/referral-link.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, URLSearchParams, JSON });
const { cleanCode, cleanSource, signupParams, referralScope, captureCustomerRef, customerRefFor, percentFromLabel, telegramShare, progressPercent, CUSTOMER_REF_KEY } = exports;

function memory() {
  const values = new Map();
  return { getItem: (key) => (values.has(key) ? values.get(key) : null), setItem: (key, value) => values.set(key, String(value)), values };
}

// Codes and sources are normalised the same way as on the server.
assert.equal(cleanCode(' bloomh-427 '), 'BLOOMH427');
assert.equal(cleanCode('ab'), '');
assert.equal(cleanCode('<script>'), 'SCRIPT');
assert.equal(cleanSource('Telegram_Share'), 'telegram_share');
assert.equal(cleanSource('bad source!'), '');
assert.deepEqual({ ...signupParams('?ref=tena123&source=directory') }, { ref: 'TENA123', source: 'directory' });
assert.deepEqual({ ...signupParams('') }, { ref: '', source: '' });

// The scope is the business of the scheduler path.
assert.equal(referralScope('/schedule/org/bloom-studio/haircut'), 'org:bloom-studio');
assert.equal(referralScope('/schedule/individual/ET-0042'), 'ind:ET-0042');
assert.equal(referralScope('/schedule/p/rahel-nutrition'), 'pro:rahel-nutrition');
assert.equal(referralScope('/schedule/p/rahel-nutrition/EVT-2026-000100'), 'pro:rahel-nutrition', 'the page and its schedulers share one scope');
assert.equal(referralScope('/schedule/individual/booking/APT-1'), '');
assert.equal(referralScope('/bloom-studio'), '');

// A friend's code is kept for the visit and only reused at the same business.
const storage = memory();
assert.equal(captureCustomerRef('?ref=hanna482', '/schedule/org/bloom-studio', storage), 'HANNA482');
assert.ok(storage.values.has(CUSTOMER_REF_KEY));
assert.equal(customerRefFor('', '/schedule/org/bloom-studio/cut', storage), 'HANNA482');
assert.equal(customerRefFor('', '/schedule/org/other-salon', storage), '');
assert.equal(customerRefFor('?ref=selam101', '/schedule/org/other-salon', storage), 'SELAM101');
const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
assert.equal(captureCustomerRef('?ref=hanna482', '/schedule/org/bloom-studio', broken), 'HANNA482');
assert.equal(customerRefFor('', '/schedule/org/bloom-studio', broken), '');

// Reward wording and sharing.
assert.equal(percentFromLabel('10%'), 10);
assert.equal(percentFromLabel('Free hair wash'), null);
assert.equal(telegramShare('https://x.et/a?ref=B1', 'Book here https://x.et/a?ref=B1'),
  'https://t.me/share/url?url=https%3A%2F%2Fx.et%2Fa%3Fref%3DB1&text=Book%20here');
assert.equal(progressPercent(5, 20), 25);
assert.equal(progressPercent(30, 20), 100);
assert.equal(progressPercent(1, 0), 0);

console.log('referral-link tests passed');
