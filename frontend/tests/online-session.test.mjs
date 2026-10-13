/**
 * Online sessions: the join window, the meeting link rule and the session format a template derives.
 * Pure logic from `src/lib/online-session.ts`. Run with `npm run test:dom`.
 */
import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(new URL('../src/lib/online-session.ts', import.meta.url), 'utf8');
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText,
  { exports, URL, Date, Number, Math });
const { joinState, nextChangeIn, isMeetingLink, onlineLabel, sessionMeetOf, placeMeetOf, meetOfFormat, JOIN_LEAD_MINUTES } = exports;

const start = Date.parse('2026-10-20T07:00:00Z');
const minute = 60_000;
const session = {
  platform: 'Google Meet',
  meeting_link: 'https://meet.google.com/abc-defg-hij',
  join_opens_at: new Date(start - JOIN_LEAD_MINUTES * minute).toISOString(),
  ends_at: new Date(start + 50 * minute).toISOString(),
};

// The join window: from 15 minutes before the start until the end.
assert.equal(JOIN_LEAD_MINUTES, 15);
assert.equal(joinState(session, start - 16 * minute), 'waiting');
assert.equal(joinState(session, start - 15 * minute), 'open');
assert.equal(joinState(session, start + 49 * minute), 'open');
assert.equal(joinState(session, start + 50 * minute), 'ended');
// Without a link yet the customer sees "link will appear here", before and during the session.
assert.equal(joinState({ ...session, meeting_link: null }, start - 60 * minute), 'no-link');
assert.equal(joinState({ ...session, meeting_link: null }, start + 5 * minute), 'no-link');
assert.equal(joinState({ ...session, meeting_link: null }, start + 51 * minute), 'ended');
// The timer wakes at the next mark: the window opening, then the end.
assert.equal(nextChangeIn(session, start - 20 * minute), 5 * minute);
assert.equal(nextChangeIn(session, start), 50 * minute);
assert.equal(nextChangeIn(session, start + 60 * minute), null);

// The same link rule as the server: https only, a dotted host, no spaces or credentials.
for (const good of ['https://meet.google.com/abc-defg-hij', 'https://zoom.us/j/9876543210?pwd=x', ' https://teams.microsoft.com/l/meetup-join/1 ']) {
  assert.ok(isMeetingLink(good), good);
}
for (const bad of ['', 'http://meet.google.com/abc', 'javascript:alert(1)', 'meet.google.com/abc', 'https://localhost/room',
  'https://user:secret@meet.example.com/x', 'https://meet.example.com/a b', `https://meet.example.com/${'a'.repeat(500)}`]) {
  assert.ok(!isMeetingLink(bad), bad);
}

assert.equal(onlineLabel('Online video', 'Online video · {0}', 'Zoom'), 'Online video · Zoom');
assert.equal(onlineLabel('Online video', 'Online video · {0}', ' '), 'Online video');
assert.equal(onlineLabel('ኦንላይን ቪዲዮ', 'ኦንላይን ቪዲዮ · {0}', null), 'ኦንላይን ቪዲዮ');

// Templates: content `format` wins, then the location type, then the session name.
assert.equal(sessionMeetOf('in_person', 'online', 'Individual session online'), 'in_person');
assert.equal(sessionMeetOf(undefined, 'online', 'Individual session'), 'online');
assert.equal(sessionMeetOf(undefined, 'in_person', 'Video session'), 'in_person');
assert.equal(sessionMeetOf(undefined, null, 'የግል ቆይታ በኦንላይን'), 'online');
assert.equal(sessionMeetOf(undefined, null, 'Phone check-in'), 'phone');
assert.equal(sessionMeetOf(undefined, null, 'Couples session'), 'in_person');
assert.equal(meetOfFormat({ locationType: 'online', platform: 'Phone' }), 'phone');
assert.equal(meetOfFormat({ locationType: 'online', platform: 'Zoom' }), 'online');
assert.equal(meetOfFormat({ locationType: 'in_person' }), 'in_person');
assert.equal(meetOfFormat({ locationType: 'elsewhere' }), null);
assert.equal(meetOfFormat(undefined), null);
assert.equal(placeMeetOf(undefined, 'online'), 'online');
assert.equal(placeMeetOf(undefined, 'phone'), 'online');
assert.equal(placeMeetOf('in_person', 'online'), 'in_person');
assert.equal(placeMeetOf(undefined, null), 'in_person');

console.log('PASS: online sessions open 15 minutes early, accept https links only, and templates derive the format');
