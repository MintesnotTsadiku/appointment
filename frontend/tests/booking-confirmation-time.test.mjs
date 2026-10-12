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
const { clockForLanguage, formatInstant, zoneLabel, zoneCityKey } = exports;

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
console.log('PASS: booking confirmation shows a friendly zone and Ethiopian time in Amharic');
