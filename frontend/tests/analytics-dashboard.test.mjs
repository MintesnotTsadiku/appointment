import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const source = readFileSync(new URL('../src/components/analytics/WorkspaceDashboard.tsx', import.meta.url), 'utf8');

assert.match(source, /qa="analytics-no-show"/);
assert.match(source, /No Show ÷.*Completed \+ No Show/);
assert.match(source, /qa="analytics-utilization"/);
assert.match(source, /booked hours ÷.*available hours/);
assert.match(source, /data-qa="analytics-export"/);
assert.match(source, /appointment\.scheduler\.analytics\.export_csv/);
assert.match(source, /encodeURIComponent\(organization\)/);
assert.match(source, /download className=/);
assert.match(source, /Current-schedule estimate:/);
assert.match(source, /current\.no_show_rate\.available \? .* : "Unavailable"/);
assert.match(source, /current\.utilization\.available \? .* : "Unavailable"/);
assert.doesNotMatch(source, /client_email|client_name|appointment_id/);

console.log('PASS: analytics rates, honest empty states, aggregate export, and non-PII UI contract');
