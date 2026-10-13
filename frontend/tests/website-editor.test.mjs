/**
 * The website section editor's pure helpers: list order, bilingual edits, validation and the live preview.
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
  vm.runInNewContext(output, { exports });
  return exports;
}

const core = load('../src/pages/settings/website-editor/core.ts');
const plain = (value) => JSON.parse(JSON.stringify(value));

// List order.
assert.deepEqual(plain(core.moveItem(['a', 'b', 'c'], 0, 2)), ['b', 'c', 'a']);
assert.deepEqual(plain(core.moveItem(['a', 'b', 'c'], 2, 1)), ['a', 'c', 'b']);
const list = ['a', 'b'];
assert.equal(core.moveItem(list, 0, 5), list, 'an out-of-range move changes nothing');
assert.deepEqual(plain(core.removeItem(['a', 'b', 'c'], 1)), ['a', 'c']);
assert.deepEqual(plain(core.renumber([{ step: 3 }, { step: 1 }], 'step')), [{ step: 1 }, { step: 2 }]);

// New records take the keys the owner does not type.
const benefits = { key: 'items', fields: [], maxItems: 12, add: true, label: 'title', inherit: ['icon'], defaults: { icon: 'check' } };
assert.deepEqual(plain(core.newItem(benefits, [{ icon: 'leaf' }], 'x')), { icon: 'leaf' });
assert.deepEqual(plain(core.newItem(benefits, [], 'x')), { icon: 'check' });
const places = { key: 'items', fields: [], maxItems: 12, add: true, label: 'name', generatedId: 'place' };
assert.equal(core.newItem(places, [], 'k3').id, 'place-k3');

// Bilingual edits: one language changes, the other stays; a cleared language stays as "" for the server.
assert.deepEqual(plain(core.setLocale({ en: 'Questions', am: 'ጥያቄዎች' }, 'en', 'Common questions')), { en: 'Common questions', am: 'ጥያቄዎች' });
assert.deepEqual(plain(core.setLocale({ en: 'Hi', am: 'ሰላም' }, 'am', '')), { en: 'Hi', am: '' });
assert.deepEqual(plain(core.setLocale(undefined, 'am', 'ሰላም')), { am: 'ሰላም' });

// Clean before saving: blank lines go, empty plain text goes, localized values keep their keys.
assert.deepEqual(plain(core.cleanContent({ phone: ' ', title: { en: 'A', am: '' }, notes: [{ en: '', am: '' }, { en: 'Lift', am: 'አሳንሰር' }] })),
  { title: { en: 'A', am: '' }, notes: [{ en: 'Lift', am: 'አሳንሰር' }] });

// Validation mirrors the server and names the field.
const faq = { fields: [{ key: 'title', kind: 'text', required: true, maxLength: 1000 }], image: true,
  list: { key: 'items', maxItems: 2, add: true, label: 'question', fields: [
    { key: 'question', kind: 'text', required: true, maxLength: 1000 }, { key: 'answer', kind: 'long', required: true, maxLength: 5 }] } };
const issues = core.validateSection(faq, { title: { am: 'ጥያቄዎች' }, image: '/files/section-a.webp', items: [{ question: { en: 'Q' }, answer: { en: 'Too long' } }] });
assert.deepEqual(plain(issues).map((issue) => `${issue.path}:${issue.code}`), ['title.en:required', 'imageAlt.en:altRequired', 'items.0.answer.en:tooLong']);
assert.equal(core.validateSection(faq, { title: { en: 'Q' }, image: '/assets/appointment/x.webp', items: [] }).length, 0, 'a template photo needs no owner alt text');

// Session format: the owner's choice, else the location's, else the name's.
assert.deepEqual(plain(core.shownMeet({ id: 's1', format: 'phone' }, { s1: 'online' })), { meet: 'phone', source: 'owner' });
assert.deepEqual(plain(core.shownMeet({ id: 's1' }, { s1: 'online' })), { meet: 'online', source: 'location' });
assert.deepEqual(plain(core.shownMeet({ id: 's2', name: { en: 'Session', am: 'የስልክ ቆይታ' } }, {})), { meet: 'phone', source: 'name' });
assert.equal(core.shownMeet({ id: 'p1' }, { p1: 'phone' }, true).meet, 'online', 'a phone place is shown on the online card');

// Live preview: draft text over the server snapshot, projected links kept.
const snapshot = [{ type: 'services', content: { items: [{ id: 's1', name: { en: 'Old' }, action: { href: '/book/s1', label: { en: 'Book' } } }] } }];
const draft = [{ type: 'services', content: { items: [{ id: 's1', name: { en: 'New', am: 'አዲስ' }, action: { intent: 'service_selection' } }] } }];
const [services] = plain(core.previewSections(snapshot, draft, { services: { s1: 'online' } }));
assert.equal(services.content.items[0].name.am, 'አዲስ');
assert.equal(services.content.items[0].action.href, '/book/s1');
assert.equal(services.content.items[0].format, 'online');

// Media helpers.
assert.deepEqual(plain(core.focusFromPoint(50, 150, 200, 100)), { x: 25, y: 100 });
assert.deepEqual(plain(core.suggestAlt({ en: ' Questions ', am: '' })), { en: 'Questions' });
const limits = { maxBytes: 5 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/webp'] };
assert.equal(core.checkUpload({ size: 10, type: 'image/svg+xml' }, limits), 'type');
assert.equal(core.checkUpload({ size: 6 * 1024 * 1024, type: 'image/png' }, limits), 'tooLarge');
assert.equal(core.checkUpload({ size: 10, type: 'image/webp' }, limits), null);
assert.equal(core.isOwnerUpload('/files/../private/files/a.webp'), false);
assert.equal(core.isOwnerUpload('/files/section-a1.webp'), true);

console.log('website-editor: ok');
