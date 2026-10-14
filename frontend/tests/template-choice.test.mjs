/**
 * The template chosen in the landing gallery is carried from sign-up to website setup.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(new URL('../src/lib/template-choice.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports, URLSearchParams });
const { cleanTemplate, templateFromSearch, pickGalleryTemplate, websiteSetupPath, signInPath, withoutTemplate, choiceFirst, addressFromName } = exports;
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

// Keys are read like the gallery writes them; anything else is dropped without an error.
assert.equal(templateFromSearch('?source=template_gallery&template=ergata-therapy'), 'ergata-therapy');
assert.equal(cleanTemplate(' Bloom-Hair '), 'bloom-hair');
assert.equal(cleanTemplate('../etc'), '');
assert.equal(cleanTemplate('<script>'), '');
assert.equal(templateFromSearch('?source=template_gallery'), '');

// Only a certified key applies; the link wins over the choice kept with the sign-up.
const known = ['bloom-hair', 'ergata-therapy'];
assert.equal(pickGalleryTemplate('ergata-therapy', 'bloom-hair', known), 'ergata-therapy');
assert.equal(pickGalleryTemplate('', 'bloom-hair', known), 'bloom-hair');
assert.equal(pickGalleryTemplate('retired-template', 'bloom-hair', known), 'bloom-hair', 'an unknown link key falls back');
assert.equal(pickGalleryTemplate('retired-template', null, known), '');

// Links that carry the choice across sign-in and onboarding.
assert.equal(websiteSetupPath('ergata-therapy'), '/settings/website?source=template_gallery&template=ergata-therapy');
assert.equal(websiteSetupPath('bad key'), '/settings/website');
const login = new URL(signInPath('ergata-therapy'), 'http://site.test');
assert.equal(login.pathname, '/login');
assert.equal(login.searchParams.get('redirect-to'), '/settings/website?source=template_gallery&template=ergata-therapy');
assert.equal(signInPath(''), '/login');

// Once used or dismissed, the gallery parameters leave the address; others stay.
assert.equal(withoutTemplate('?source=template_gallery&template=bloom-hair'), '');
assert.equal(withoutTemplate('?organization=ORG-1&template=bloom-hair'), '?organization=ORG-1');
assert.equal(withoutTemplate('?source=telegram_share&template=bloom-hair'), '?source=telegram_share');

// The chosen card leads the chooser; the ranking order is otherwise kept.
const rows = [{ key: 'tena-clinic' }, { key: 'bloom-hair' }, { key: 'ergata-therapy' }];
assert.equal(choiceFirst(rows, 'ergata-therapy').map((row) => row.key).join(), ['ergata-therapy', 'tena-clinic', 'bloom-hair'].join());
assert.equal(choiceFirst(rows, '').map((row) => row.key).join(), ['tena-clinic', 'bloom-hair', 'ergata-therapy'].join());

// A website address suggestion from the business name.
assert.equal(addressFromName('Yared Tesfaye Counselling'), 'yared-tesfaye-counselling');
assert.equal(addressFromName('ሰላም ስቱዲዮ'), '');

// Every sign-up path sends the template with the account.
const signup = read('../src/pages/auth/signup.tsx');
assert.match(signup, /templateFromSearch\(window\.location\.search\)/);
assert.match(signup, /\.\.\.\(template \? \{ template \} : \{\}\)/, 'the organization and solo sign-up sends the template');
assert.match(signup, /<QuickStartSignup[^>]*template=\{templateFromSearch/, 'the prefilled quick start receives it');
assert.match(signup, /to=\{loginPath\}/, 'sign-in from sign-up keeps the choice');
const quick = read('../src/pages/auth/quick-start.tsx');
assert.match(quick, /template: template \|\| undefined/, 'quick start signs up with the template');

// Onboarding success offers the website with the chosen template; website setup reads it.
assert.match(read('../src/pages/onboarding/OnboardingSuccess.tsx'), /next=\{<GalleryTemplateNext/);
const setup = read('../src/pages/settings/website-setup.tsx');
assert.match(setup, /pickGalleryTemplate\(fromLink, existing \? null : result\.galleryTemplate/, 'a stored choice never applies to an existing site');
assert.match(setup, /function rerank\(\) \{\s*if \(!gallery\) setRecipe\(""\);/, 'preferences do not replace the gallery template');
assert.doesNotMatch(setup, /setRecipe\(""\); \}\}/);

console.log('template choice: ok');
