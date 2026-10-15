/**
 * The public provider page: price and format labels, the format chooser and the scheduler links.
 * Pure logic from `src/pages/public-experience/provider-core.ts`, plus source guards on the page.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

// Values made inside the sandbox come from another realm; compare them as plain JSON.
const plain = (value) => JSON.parse(JSON.stringify(value));
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(read('src/pages/public-experience/provider-core.ts'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
{ exports, Intl, URLSearchParams, Map, Set, Number, Array });
const { localized, priceLabel, formatLabel, groupFormats, serviceFormats, offeringPath, initials, providerBio, providerName, PROVIDER_PAGE_API } = exports;

// Words in the reader's language, else English, else the record's own text.
assert.equal(localized({ en: 'Meal plan', am: 'የምግብ እቅድ' }, 'am'), 'የምግብ እቅድ');
assert.equal(localized({ en: 'Meal plan' }, 'am'), 'Meal plan');
assert.equal(localized(undefined, 'am', 'From the record'), 'From the record');

// The bio in the page language, else the bio in the other language.
assert.equal(providerBio({ bio: 'Dietitian', bio_am: 'የሥነ-ምግብ ባለሙያ' }, 'am'), 'የሥነ-ምግብ ባለሙያ');
assert.equal(providerBio({ bio: 'Dietitian', bio_am: 'የሥነ-ምግብ ባለሙያ' }, 'en'), 'Dietitian');
assert.equal(providerBio({ bio: 'Dietitian', bio_am: ' ' }, 'am'), 'Dietitian');
assert.equal(providerBio({ bio: '', bio_am: 'የሥነ-ምግብ ባለሙያ' }, 'en'), 'የሥነ-ምግብ ባለሙያ');
assert.equal(providerBio({ bio: '' }, 'am'), '');

// The name: the website's person name in the page language, else the provider's own Amharic name, else the record.
assert.equal(providerName({ name: 'Rahel Girma', local_name: { en: 'Rahel Girma', am: 'ራሔል ግርማ' } }, 'am'), 'ራሔል ግርማ');
assert.equal(providerName({ name: 'Rahel Girma', local_name: { en: 'Rahel Girma', am: 'ራሔል ግርማ' } }, 'en'), 'Rahel Girma');
assert.equal(providerName({ name: 'Rahel Girma', person: { name: { en: 'Rahel G.', am: 'ራሔል ግ.' } }, local_name: { am: 'ራሔል ግርማ' } }, 'am'), 'ራሔል ግ.');
assert.equal(providerName({ name: 'Rahel Girma' }, 'am'), 'Rahel Girma');

// Prices: free when zero, else the currency code and a grouped amount.
assert.equal(priceLabel(0, 'ETB', 'en', 'Free'), 'Free');
assert.equal(priceLabel(1200, 'ETB', 'en', 'Free'), 'ETB 1,200');
assert.equal(priceLabel(1200, 'ETB', 'am', 'ነጻ'), 'ETB 1,200');
assert.equal(priceLabel(Number.NaN, 'ETB', 'en', 'Free'), 'Free');

// Formats: the online label carries the platform; never a meeting link.
const place = (type, platform = '', name = 'Room') => ({ location_type: type, platform, name, address: '' });
assert.equal(formatLabel(place('online', 'Zoom'), 'Online video', 'Online video · {0}', 'In person'), 'Online video · Zoom');
assert.equal(formatLabel(place('online'), 'Online video', 'Online video · {0}', 'In person'), 'Online video');
assert.equal(formatLabel(place('in_person'), 'Online video', 'Online video · {0}', 'In person'), 'In person');

// The chooser: one choice per offering; a place name only when two choices look the same.
const offering = (id, type, platform = '', name = 'Room') => ({ offering: id, path: `/schedule/p/x/${id}`, duration: 60, price: 900, location: place(type, platform, name) });
const both = { offerings: [offering('E1', 'in_person', '', 'Kazanchis'), offering('E2', 'online', 'Zoom')] };
assert.deepEqual(plain(groupFormats(both)).map((row) => [row.offering, row.type, row.place]), [['E1', 'in_person', ''], ['E2', 'online', '']]);
const twoOffices = { offerings: [offering('E1', 'in_person', '', 'Bole'), offering('E3', 'in_person', '', 'Piassa')] };
assert.deepEqual(plain(groupFormats(twoOffices)).map((row) => row.place), ['Bole', 'Piassa']);
assert.deepEqual(plain(serviceFormats(both)), ['online', 'in_person'], 'online first');
assert.deepEqual(plain(serviceFormats({ offerings: [offering('E2', 'online', 'Zoom')] })), ['online']);

// Scheduler links keep the share channel and a friend's code, and nothing else.
assert.equal(offeringPath('rahel-nutrition', 'EVT-1'), '/schedule/p/rahel-nutrition/EVT-1');
assert.equal(offeringPath('rahel-nutrition', 'EVT-1', '?source=qr_poster&ref=ABCD12&lang=am&x=1'), '/schedule/p/rahel-nutrition/EVT-1?source=qr_poster&ref=ABCD12');

assert.equal(initials('Rahel Girma'), 'RG');
assert.equal(initials('ሐና ግርማ'), 'ሐግ');
assert.equal(initials(''), '');

// The page reads its data from the guest endpoint, keeps one canonical address and has stable QA hooks.
assert.equal(PROVIDER_PAGE_API, 'appointment.scheduler.provider_page.public_provider');
const page = read('src/pages/public-experience/provider-page.tsx');
const parts = read('src/pages/public-experience/provider-page-parts.tsx');
// The unavailable state is the shared BookingState, which takes its hook as `qa`.
for (const hook of ['provider-page', 'provider-page-unavailable']) assert.ok(page.includes(`data-qa="${hook}"`) || page.includes(` qa="${hook}"`), hook);
for (const hook of ['provider-page-name', 'provider-service', 'provider-service-book', 'provider-format']) assert.ok(parts.includes(`data-qa="${hook}"`), hook);
assert.ok(page.includes('canonical_slug') && page.includes('replace: true'), 'a former address is replaced by the current one');
assert.ok(page.includes('useBookingBrand(page?.site_slug'), 'a published website brands the page');
assert.ok(parts.includes('providerBio(page, language)') && page.includes('providerBio(page, language)'), 'the hero and the meta description show the bio in the page language');
assert.ok(!/meeting_link/.test(page + parts + read('src/pages/public-experience/provider-core.ts')), 'the page never reads a meeting link');
assert.ok(parts.includes("from '@/components/toggle-group'"), 'the format chooser is the shadcn toggle group');
const scheduler = read('src/pages/public-experience/independent-booking.tsx');
assert.ok(scheduler.includes('slug: providerSlug') && scheduler.includes('independent-booking-all-services'), 'the scheduler checks the page address and links back');

console.log('provider-page: ok');
