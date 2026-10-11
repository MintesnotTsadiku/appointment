/**
 * Conversion rules of the free Ethiopian time converter
 * (`appointment/public/js/habesha-time.js`, served at /tools/ethiopian-time-converter).
 *
 * Run with `npm run test:dom`.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "../appointment/public/js/habesha-time.js"), "utf8");
const sandbox = { Intl, Date, String, Number };
vm.runInNewContext(source, sandbox);
const H = sandbox.HabeshaTime;
assert.ok(H, "habesha-time.js must expose HabeshaTime without a DOM");

const toHabesha = (hour, minute) => {
  const result = H.toHabesha(hour, minute);
  return `${result.text} ${result.halfAm} ${result.periodAm}`;
};
// International -> Habesha.
assert.equal(toHabesha(6, 0), "12:00 ቀን ጠዋት");
assert.equal(toHabesha(7, 0), "1:00 ቀን ጠዋት");
assert.equal(toHabesha(8, 0), "2:00 ቀን ጠዋት");
assert.equal(toHabesha(12, 0), "6:00 ቀን ከሰዓት");
assert.equal(toHabesha(13, 30), "7:30 ቀን ከሰዓት");
assert.equal(toHabesha(17, 59), "11:59 ቀን ከሰዓት");
assert.equal(toHabesha(18, 0), "12:00 ሌሊት ምሽት");
assert.equal(toHabesha(20, 0), "2:00 ሌሊት ምሽት");
assert.equal(toHabesha(23, 59), "5:59 ሌሊት ምሽት");
assert.equal(toHabesha(0, 0), "6:00 ሌሊት ሌሊት");
assert.equal(toHabesha(5, 59), "11:59 ሌሊት ሌሊት");

// Habesha -> international, both halves.
const fromHabesha = (hour, minute, half) => {
  const result = H.fromHabesha(hour, minute, half);
  return H.format24(result.hour, result.minute);
};
assert.equal(fromHabesha(12, 0, "day"), "06:00");
assert.equal(fromHabesha(2, 0, "day"), "08:00");
assert.equal(fromHabesha(2, 0, "night"), "20:00");
assert.equal(fromHabesha(7, 30, "day"), "13:30");
assert.equal(fromHabesha(6, 0, "night"), "00:00");
assert.equal(fromHabesha(11, 59, "day"), "17:59");
assert.equal(fromHabesha(12, 0, "night"), "18:00");
assert.equal(fromHabesha(11, 59, "night"), "05:59");
assert.equal(H.format12(8, 0), "8:00 AM");
assert.equal(H.format12(0, 5), "12:05 AM");
assert.equal(H.format12(12, 0), "12:00 PM");

// Every minute of the day survives a round trip.
for (let hour = 0; hour < 24; hour += 1) {
  for (const minute of [0, 1, 30, 59]) {
    const habesha = H.toHabesha(hour, minute);
    const back = H.fromHabesha(habesha.hour, habesha.minute, habesha.half);
    assert.deepEqual([back.hour, back.minute], [hour, minute], `${hour}:${minute}`);
  }
}

// Input parsing accepts 24-hour and 12-hour forms.
const parse = (text) => {
  const parsed = H.parseInternational(text);
  return parsed ? H.format24(parsed.hour, parsed.minute) : null;
};
assert.equal(parse("13:30"), "13:30");
assert.equal(parse("1:30 pm"), "13:30");
assert.equal(parse("12:15 AM"), "00:15");
assert.equal(parse("12 pm"), "12:00");
assert.equal(parse("8am"), "08:00");
assert.equal(parse("0800"), "08:00");
assert.equal(parse("24:00"), null);
assert.equal(parse("13:30 pm"), null);
assert.equal(parse("noon"), null);

// "Now in Addis Ababa" is computed in Africa/Addis_Ababa (UTC+3, no DST).
const addis = H.addisParts(new Date("2026-01-15T21:30:00Z"));
assert.deepEqual([addis.hour, addis.minute], [0, 30]);

const finale = fs.readFileSync(path.join(root, "src/pages/landing/day/components/Finale.tsx"), "utf8");
assert.ok(finale.includes('href="/tools"'), "landing footer must link to the free tools index");

// Shared vectors with the Python twin (appointment/growth/habesha.py).
const vectors = JSON.parse(fs.readFileSync(path.join(root, "../appointment/growth/vectors/habesha.json"), "utf8"));
for (const [hour, minute, habeshaHour, period] of vectors.to_habesha) {
  const result = H.toHabesha(hour, minute);
  assert.deepEqual([result.hour, result.minute, result.period], [habeshaHour, minute, period], `${hour}:${minute}`);
  assert.equal(H.PERIODS[period].am, vectors.periods[period]);
}
for (const [habeshaHour, minute, half, hour] of vectors.from_habesha) {
  assert.deepEqual([H.fromHabesha(habeshaHour, minute, half).hour, minute], [hour, minute]);
}
for (const [start, end, english, amharic] of vectors.ranges) {
  assert.equal(H.formatHoursRange(start, end, "en"), english);
  assert.equal(H.formatHoursRange(start, end, "am"), amharic);
}
assert.equal(H.formatHabesha(20, 0), "ምሽት 2:00");

console.log("PASS: Habesha time conversion");
