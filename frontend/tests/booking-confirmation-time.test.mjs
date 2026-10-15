/**
 * Booking confirmation: a friendly zone label from the IANA zone, and Ethiopian local time in Amharic.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/time.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports });
const { clockForLanguage, formatInstant, habeshaLabel, zoneLabel, zoneCityKey } = exports;

const en = JSON.parse(readFileSync(new URL('../src/lib/i18n/translations/en.json', import.meta.url), 'utf8'));
const am = JSON.parse(readFileSync(new URL('../src/lib/i18n/translations/am.json', import.meta.url), 'utf8'));
const cities = (catalog) => (key) => catalog.timeZoneCities?.[key] ?? null;

assert.equal(zoneCityKey('Africa/Addis_Ababa'), 'Addis_Ababa');
assert.equal(zoneCityKey('America/Argentina/Buenos_Aires'), 'Buenos_Aires');
assert.equal(zoneCityKey('UTC'), '');

assert.equal(zoneLabel('Africa/Addis_Ababa', 'en', en.customerBooking.zoneTime, cities(en)), 'Addis Ababa time');
assert.equal(zoneLabel('Africa/Addis_Ababa', 'am', am.customerBooking.zoneTime, cities(am)), 'የአዲስ አበባ ሰዓት');
assert.equal(zoneLabel('Africa/Nairobi', 'am', am.customerBooking.zoneTime, cities(am)), 'የናይሮቢ ሰዓት');
// A zone without a catalogued city keeps its IANA city in English and an Intl name in Amharic.
assert.equal(zoneLabel('Asia/Kolkata', 'en', en.customerBooking.zoneTime, () => null), 'Kolkata time');
const amharicFallback = zoneLabel('Asia/Kolkata', 'am', am.customerBooking.zoneTime, () => null);
assert.ok(!amharicFallback.includes('Asia/') && !amharicFallback.includes('_'), amharicFallback);

// Amharic shows Ethiopian local time with the period; English keeps the chosen clock.
assert.equal(clockForLanguage('am', '12h'), 'ethiopian');
assert.equal(clockForLanguage('en', '24h'), '24h');
const evening = '2026-10-12T16:30:00Z'; // 19:30 in Addis Ababa
assert.equal(formatInstant(evening, clockForLanguage('am', '12h'), 'Africa/Addis_Ababa'), 'ሰዓት 1:30 ምሽት');
assert.equal(formatInstant(evening, clockForLanguage('en', '12h'), 'Africa/Addis_Ababa'), '7:30 PM');

// Habesha time in the page language: English words on English pages, the Amharic label unchanged.
const afternoon = '2026-11-06T09:00:00Z'; // 12:00 in Addis Ababa = 6:00 in the afternoon (Habesha)
assert.equal(formatInstant(afternoon, 'ethiopian', 'Africa/Addis_Ababa'), 'ሰዓት 6:00 ከሰዓት');
assert.equal(formatInstant(afternoon, 'ethiopian', 'Africa/Addis_Ababa', { language: 'am', style: 'full' }), 'ሰዓት 6:00 ከሰዓት');
assert.equal(formatInstant(afternoon, 'ethiopian', 'Africa/Addis_Ababa', { language: 'en', style: 'full' }), '6:00 in the afternoon (Habesha time)');
assert.equal(formatInstant(afternoon, 'ethiopian', 'Africa/Addis_Ababa', { language: 'en', style: 'phrase' }), '6:00 in the afternoon');
assert.equal(formatInstant(afternoon, 'ethiopian', 'Africa/Addis_Ababa', { language: 'en' }), '6:00 afternoon');
assert.equal(formatInstant(evening, 'ethiopian', 'Africa/Addis_Ababa', { language: 'en', style: 'full' }), '1:30 in the evening (Habesha time)');
assert.equal(formatInstant('2026-11-06T09:00:00Z', '12h', 'Africa/Addis_Ababa', { language: 'en', style: 'full' }), '12:00 PM');
// Period boundaries, as the free time converter counts them.
assert.equal(habeshaLabel(6, 0, 'en', 'phrase'), '12:00 in the morning');
assert.equal(habeshaLabel(9, 15, 'en'), '3:15 morning');
assert.equal(habeshaLabel(17, 59, 'en', 'phrase'), '11:59 in the afternoon');
assert.equal(habeshaLabel(18, 0, 'en', 'phrase'), '12:00 in the evening');
assert.equal(habeshaLabel(0, 0, 'en', 'full'), '6:00 at night (Habesha time)');
assert.equal(habeshaLabel(5, 59, 'en'), '11:59 night');
assert.equal(habeshaLabel(9, 0, 'am', 'full'), 'ሰዓት 3:00 ጠዋት');
for (let hour = 0; hour < 24; hour++) assert.ok(!/[\u1200-\u137f]/.test(habeshaLabel(hour, 0, 'en', 'full')), `English Habesha time has no Ethiopic: ${hour}`);

// The booking surfaces pass the page language (picker, "Your time" bar, summary, confirmation, independent booking).
const source = (rel) => readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8');
for (const [rel, pattern] of [
  ['pages/booking-v2/components/DateTimeSelector/TimeSlotsPanel/index.tsx', /formatInstant\(slot\.start_time, timeFormat, timezone, \{ language \}\)/],
  ['pages/booking-v2/components/DateTimeSelector/parts.tsx', /formatInstant\(start, timeFormat, timezone, \{ language, style: "phrase" \}\)/],
  ['pages/booking-v2/components/BookingForm/index.tsx', /formatInstant\(startTime, timeFormat, timezone, \{ language, style: "full" \}\)/],
  ['pages/booking-v2/components/ConfirmationModal/index.tsx', /formatInstant\(startTime, timeFormat, timezone, \{ language, style: "full" \}\)/],
  ['pages/public-experience/independent-booking-parts.tsx', /formatInstant\(start, 'ethiopian', timezone, \{ language, style: 'full' \}\)/],
]) assert.match(source(rel), pattern, rel);
console.log('PASS: booking confirmation shows a friendly zone and Ethiopian time in Amharic');
console.log('PASS: English pages say Habesha time in English');
