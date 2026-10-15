/**
 * The VA "Message" menu offers only channels the contact details allow, with
 * well-formed links; the shared date/time label shows Ethiopian time in Amharic
 * without changing the stored wall time.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const load = (file) => {
  const exports = {};
  const source = readFileSync(new URL(`../src/lib/${file}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  vm.runInNewContext(outputText, { exports, Intl, Number });
  return exports;
};

const { contactLinks } = load('tasks-assistants/contact.ts');
const byChannel = (details) => Object.fromEntries(contactLinks(details).map((link) => [link.channel, link.href]));

assert.deepEqual(byChannel({ phone: '+251911524011', email: 'hiwot.assefa@example.com' }), {
  call: 'tel:+251911524011',
  sms: 'sms:+251911524011',
  whatsapp: 'https://wa.me/251911524011',
  telegram: 'https://t.me/+251911524011',
  email: 'mailto:hiwot.assefa@example.com',
});
// A local number can be dialled, but WhatsApp and Telegram need the international form.
assert.deepEqual(Object.keys(byChannel({ phone: '0911 52 40 11' })), ['call', 'sms']);
assert.equal(byChannel({ phone: '0911 52 40 11' }).call, 'tel:0911524011');
assert.deepEqual(Object.keys(byChannel({ email: 'liya@example.com' })), ['email']);
assert.equal(contactLinks({ phone: '', email: '' }).length, 0);
assert.equal(contactLinks({ phone: '12', email: 'not an email' }).length, 0);
assert.ok(contactLinks({ phone: '+251911524011' }).every((link) => link.external === link.href.startsWith('https://')));

const { formatLocalDateTime } = load('time.ts');
const evening = new Date(2026, 9, 15, 19, 30);
const morning = new Date(2026, 9, 15, 10, 0);
assert.match(formatLocalDateTime(evening, 'am-ET', 'ethiopian'), /ሰዓት 1:30 ምሽት$/);
assert.match(formatLocalDateTime(morning, 'am-ET', 'ethiopian'), /ሰዓት 4:00 ጠዋት$/);
assert.doesNotMatch(formatLocalDateTime(morning, 'am-ET', 'ethiopian'), /ጥዋት/);
assert.equal(formatLocalDateTime(morning, 'en-US', '12h'), new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(morning));
assert.equal(formatLocalDateTime(new Date('nope'), 'en-US', '12h'), '');

console.log('PASS: contact channels and links, Ethiopian date/time label');
