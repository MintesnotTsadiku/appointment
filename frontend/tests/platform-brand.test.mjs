/**
 * Platform brand helpers: payload mapping, language fallbacks and placeholder filling.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(new URL('../src/lib/platform-brand-core.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports });
const { toPlatformBrand, withBrand, shareText, localText } = exports;

// Before the server answers there is still a usable name: the host.
const empty = toPlatformBrand(null, 'en', 'brand.example');
assert.equal(empty.productName, 'brand.example');
assert.equal(empty.shortHost, 'brand.example');
assert.equal(empty.loaded, false);
assert.equal(empty.growth.poweredByPages, true);
assert.equal(empty.growth.marketingLiveMinutes, 5);
for (const [key, value] of Object.entries(empty)) assert.notEqual(value, undefined, key);

const payload = {
  brand: { product_name: 'Acme Book', product_url: 'https://acme.example', short_host: 'acme.example', logo: '/files/l.png', logo_dark: '', tagline_en: 'Book fast', tagline_am: '' },
  growth: { powered_by_pages: false, own_page_text_en: 'Get a page', own_page_text_am: 'ገጽ ያግኙ', share_message_en: 'Book {business}: {link}', share_message_am: 'ቀጠሮ ይያዙ፦ {link}', marketing_live_minutes: 9 },
};
const en = toPlatformBrand(payload, 'en', 'ignored.example');
assert.equal(en.productName, 'Acme Book');
assert.equal(en.logoDark, '/files/l.png', 'dark logo falls back to the logo');
assert.equal(en.growth.poweredByPages, false);
assert.equal(en.growth.ownPageText, 'Get a page');
assert.equal(en.growth.marketingLiveMinutes, 9);
assert.equal(en.loaded, true);
const am = toPlatformBrand(payload, 'am', 'ignored.example');
assert.equal(am.growth.ownPageText, 'ገጽ ያግኙ');
assert.equal(am.tagline, 'Book fast', 'empty Amharic falls back to English');
assert.equal(localText({ x_en: 'a', x_am: 'ለ' }, 'x', 'am'), 'ለ');

assert.equal(withBrand('Welcome to {product} at {host}/hana', en), 'Welcome to Acme Book at acme.example/hana');
assert.equal(shareText('Book {business}: {link}', 'Bloom', 'https://x/b'), 'Book Bloom: https://x/b');
assert.equal(shareText('Book {business}', 'Bloom', 'https://x/b'), 'Book Bloom https://x/b', 'a message without {link} still carries the link');
console.log('PASS: platform brand mapping, fallbacks and placeholders');
