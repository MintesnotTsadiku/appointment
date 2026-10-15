/**
 * Business and provider names in the page language (`src/lib/local-names.ts`).
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const plain = (value) => JSON.parse(JSON.stringify(value));
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(read('src/lib/local-names.ts'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, Array });
const { localName, siteName, localizeBookingPayload } = exports;

// The page language, else the plain field, else the other language.
assert.equal(localName({ en: 'Hanna Tesfaye', am: 'ሐና ተስፋዬ' }, 'am', 'Hanna Tesfaye'), 'ሐና ተስፋዬ');
assert.equal(localName({ en: 'Hanna Tesfaye', am: 'ሐና ተስፋዬ' }, 'en', 'x'), 'Hanna Tesfaye');
assert.equal(localName({ en: 'Hanna Tesfaye' }, 'am', 'Hanna Tesfaye'), 'Hanna Tesfaye');
assert.equal(localName({ am: ' ' }, 'am', 'Hanna'), 'Hanna');
assert.equal(localName(undefined, 'am', 'Hanna'), 'Hanna');
assert.equal(localName({ am: 'ሐና' }, 'en', ''), 'ሐና');

// The website name: the Amharic title on Amharic pages only.
assert.equal(siteName('Bole Bloom Hair Studio', 'ቦሌ ብሉም የፀጉር ስቱዲዮ', 'am'), 'ቦሌ ብሉም የፀጉር ስቱዲዮ');
assert.equal(siteName('Bole Bloom Hair Studio', 'ቦሌ ብሉም የፀጉር ስቱዲዮ', 'en'), 'Bole Bloom Hair Studio');
assert.equal(siteName('Bole Bloom Hair Studio', '', 'am'), 'Bole Bloom Hair Studio');

// The scheduler's answer: business, description, chips, service cards and the picker's offerings.
const answer = {
  company: 'Bole Bloom Hair Studio', full_name: 'Bole Bloom Hair Studio', description: 'A Bole studio.',
  local_company: { en: 'Bole Bloom Hair Studio', am: 'ቦሌ ብሉም የፀጉር ስቱዲዮ' },
  local_business_description: { en: 'A Bole studio.', am: 'የቦሌ ስቱዲዮ።' },
  providers: [{ id: 'p1', name: 'Hanna Tesfaye', avatar: '/a-192.webp', local_name: { en: 'Hanna Tesfaye', am: 'ሐና ተስፋዬ' } }, { id: 'p2', name: 'Eden' }],
  services: [{ name: 'Cut', provider_name: 'Hanna Tesfaye', provider_local_name: { en: 'Hanna Tesfaye', am: 'ሐና ተስፋዬ' } }],
  offerings: [{ id: 'o1', provider: { id: 'p1', name: 'Hanna Tesfaye', local_name: { am: 'ሐና ተስፋዬ' } } }, { id: 'o2', provider: null }],
};
const am = plain(localizeBookingPayload(answer, 'am'));
assert.equal(am.company, 'ቦሌ ብሉም የፀጉር ስቱዲዮ');
assert.equal(am.full_name, 'ቦሌ ብሉም የፀጉር ስቱዲዮ');
assert.equal(am.description, 'የቦሌ ስቱዲዮ።');
assert.deepEqual(am.providers.map((row) => row.name), ['ሐና ተስፋዬ', 'Eden']);
assert.equal(am.providers[0].avatar, '/a-192.webp');
assert.equal(am.services[0].provider_name, 'ሐና ተስፋዬ');
assert.equal(am.offerings[0].provider.name, 'ሐና ተስፋዬ');
assert.equal(am.offerings[1].provider, null);
const en = plain(localizeBookingPayload(answer, 'en'));
assert.equal(en.company, 'Bole Bloom Hair Studio');
assert.equal(en.providers[0].name, 'Hanna Tesfaye');
// An answer without names by language, or an error, stays as it is.
assert.deepEqual(plain(localizeBookingPayload({ error: 'Business not found' }, 'am')), { error: 'Business not found' });
assert.equal(localizeBookingPayload(undefined, 'am'), undefined);
assert.equal(plain(localizeBookingPayload({ company: 'Tena', description: 'Clinic' }, 'am')).description, 'Clinic');

// The pages read the names through these helpers.
const page = read('src/pages/organization-appointment/index.tsx');
assert.match(page, /localizeBookingPayload\(answer\.message, language\)/);
assert.match(read('src/pages/booking-v2/hooks/useTimeSlots.ts'), /localName\(slot\.provider_local_name, language, slot\.provider_name\)/);
assert.match(read('src/public-experience/PublicSiteHome.tsx'), /siteName\(/);
console.log('local-names: ok');
