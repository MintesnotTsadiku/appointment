/**
 * Grow page sharing helpers and referral-source capture: message filling, share URLs and slug input.
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
  vm.runInNewContext(output, { exports, URL, URLSearchParams, encodeURIComponent });
  return exports;
}

const { fillMessage, swapLink, telegramShareUrl, whatsappShareUrl, withSource, normalizeSlug, localSlugProblem } = load('../src/pages/grow/share-core.ts');
const link = 'https://book.example/bloom?source=telegram_share';

// One pass: a name that contains a placeholder stays as typed.
assert.equal(fillMessage('Book with {business}: {link}', 'Bloom {link}', link), `Book with Bloom {link}: ${link}`);
assert.equal(fillMessage('ከ{business} ጋር ቀጠሮ ይያዙ፦ {link}', 'ብሉም', link), `ከብሉም ጋር ቀጠሮ ይያዙ፦ ${link}`);
// A template without {link} still carries the link; an empty template falls back to the name.
assert.equal(fillMessage('Book with {business}', 'Bloom', link), `Book with Bloom ${link}`);
assert.equal(fillMessage('', 'Bloom', link), `Bloom ${link}`);
assert.equal(fillMessage('{business} {business}', 'A', 'L'), 'A A L');

// Each channel gets its own ?source= link inside the owner's edited text.
const whatsapp = 'https://book.example/bloom?source=whatsapp_share';
assert.equal(swapLink(`Edited ${link} text`, link, whatsapp), `Edited ${whatsapp} text`);
assert.equal(swapLink('No link here', link, whatsapp), 'No link here');

// Telegram gets the URL once (as url=) and the text without it.
const telegram = new URL(telegramShareUrl(link, `Book with Bloom: ${link}`));
assert.equal(telegram.origin + telegram.pathname, 'https://t.me/share/url');
assert.equal(telegram.searchParams.get('url'), link);
assert.equal(telegram.searchParams.get('text'), 'Book with Bloom');
assert.equal(new URL(telegramShareUrl(link, `ከብሉም ጋር ቀጠሮ ይያዙ፦ ${link}`)).searchParams.get('text'), 'ከብሉም ጋር ቀጠሮ ይያዙ');
assert.ok(telegramShareUrl(link, 'a & b').includes('text=a%20%26%20b'), 'text is URL-encoded');
assert.equal(new URL(whatsappShareUrl(`Hi ${link}`)).searchParams.get('text'), `Hi ${link}`);

assert.equal(withSource('https://book.example/bloom?lang=am', 'qr_poster'), 'https://book.example/bloom?lang=am&source=qr_poster');
assert.equal(withSource('https://book.example/bloom?source=x', 'copy_link'), 'https://book.example/bloom?source=copy_link');

assert.equal(normalizeSlug('  Bole Bloom__Studio. '), 'bole-bloom-studio');
assert.equal(normalizeSlug('--Ab!!c--'), 'abc');
const rules = { min: 3, max: 30 };
assert.equal(localSlugProblem('ab', rules), 'length');
assert.equal(localSlugProblem('a'.repeat(31), rules), 'length');
assert.equal(localSlugProblem('bloom-', rules), 'format');
assert.equal(localSlugProblem('bloom-studio', rules), null);

const { sourceFromSearch, viewLogUrl } = load('../src/lib/referral-source-core.ts');
assert.equal(sourceFromSearch('?source=telegram_share'), 'telegram_share');
assert.equal(sourceFromSearch('?utm_source=QR_Poster'), 'qr_poster');
assert.equal(sourceFromSearch('?source=<script>'), null);
assert.equal(sourceFromSearch(''), null);
const log = new URL(viewLogUrl('telegram_share', 'https://t.me/x?y=1'), 'https://book.example');
assert.equal(log.pathname, '/api/method/frappe.website.doctype.web_page_view.web_page_view.make_view_log');
assert.equal(log.searchParams.get('source'), 'telegram_share');
assert.equal(log.searchParams.get('referrer'), 'https://t.me/x');

console.log('growth-sharing: ok');
