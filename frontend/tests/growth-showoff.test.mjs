/**
 * Show-off growth helpers: the template credit link and the year-in-review tiles.
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
  vm.runInNewContext(output, { exports, URL, URLSearchParams, Intl, Date });
  return exports;
}

const credit = load('../src/public-experience/templates/credit-core.ts');
assert.equal(credit.creditHref('https://brand.example'), 'https://brand.example/?source=template_credit');
assert.equal(credit.creditHref('https://brand.example/start?lang=am&source=x'), 'https://brand.example/start?lang=am&source=template_credit');
assert.equal(credit.creditHref(''), '');
assert.equal(credit.creditHref('not a url'), '');
assert.deepEqual({ ...credit.creditParts('Website by {product}') }, { before: 'Website by ', after: '' });
assert.deepEqual({ ...credit.creditParts('ድረ-ገጽ በ{product}') }, { before: 'ድረ-ገጽ በ', after: '' });

const review = load('../src/pages/grow/year-review-core.ts');
const t = (key) => key;
assert.equal(review.hourLabel(10, 'en'), '10 AM');
assert.equal(review.hourLabel(0, 'en'), '12 AM');
assert.equal(review.hourLabel(15, 'en'), '3 PM');
assert.equal(review.hourLabel(10, 'am'), 'ጠዋት 4:00');
assert.equal(review.hourLabel(6, 'am'), 'ጠዋት 12:00');
assert.equal(review.hourLabel(19, 'am'), 'ምሽት 1:00');
assert.equal(review.hourLabel(2, 'am'), 'ሌሊት 8:00');
assert.equal(review.weekdayName(5, 'en'), 'Saturday');
assert.equal(review.weekdayName(0, 'en'), 'Monday');

const minimal = review.reviewTiles({ bookings: 12, clients: 6 }, 'en', t);
assert.deepEqual(Array.from(minimal, (tile) => tile.key), ['clients', 'bookings'], 'Missing stats are not shown.');
const full = review.reviewTiles({
  bookings: 1284, clients: 642, new_clients: 410, returning_rate: 36, busiest_day: { weekday: 5, count: 9 },
  busiest_hour: { hour: 10, count: 9 }, top_service: { name: 'Silk press', count: 9, share: 31 },
  top_provider: { name: 'Hanna', count: 500 }, amharic_share: 58,
}, 'en', (key) => (key === 'shareOfBookings' ? '{share}% of bookings' : key));
assert.deepEqual(Array.from(full, (tile) => tile.key), ['clients', 'bookings', 'new_clients', 'returning_rate', 'busiest_day', 'busiest_hour', 'top_service', 'top_provider', 'amharic_share']);
assert.equal(full[1].value, '1,284');
assert.equal(full[6].note, '31% of bookings');
const amharic = review.reviewTiles({ bookings: 30, clients: 12, busiest_hour: { hour: 10, count: 9 } }, 'am', t);
assert.equal(amharic[2].value, 'ጠዋት 4:00');
assert.equal(amharic[2].note, '10 AM', 'Amharic shows the international hour as a note.');

assert.equal(review.imageUrl('Provider:Abel Fikru', 'ec-2018', 'am', 'story'),
  '/api/method/appointment.growth.year_review.image?business=Provider%3AAbel+Fikru&period=ec-2018&lang=am&size=story');
assert.equal(review.withSource('https://brand.example/bloom-studio', 'year_review'), 'https://brand.example/bloom-studio?source=year_review');
assert.equal(review.withSource('', 'year_review'), '');
assert.ok(review.telegramShareUrl('https://brand.example/b?source=year_review', 'Our year').startsWith('https://t.me/share/url?url=https%3A%2F%2Fbrand.example'));
const plain = (text) => text.replace(/\s/g, ' ');
assert.equal(plain(review.dateRange('2025-09-11', '2026-09-10', 'en')), '11 Sept 2025 – 10 Sept 2026');
assert.equal(plain(review.dateRange('2025-09-11', '2026-09-10', 'am')), 'መስከረም 1 – ጳጉሜ 5፣ 2018', 'Amharic uses the Ethiopian calendar.');
assert.equal(review.dateRange('bad', '2026-09-10', 'en'), 'bad – 2026-09-10');
console.log('PASS: template credit link and year-in-review tiles');
