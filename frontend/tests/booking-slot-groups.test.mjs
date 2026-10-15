/**
 * The slot groups of the time picker (`DateTimeSelector/TimeSlotsPanel/groups.ts`). With Habesha time every
 * slot sits under the group of its label's period, in English and Amharic, for all 24 hours: "11:00 afternoon"
 * (17:00) is under "Afternoon", not "Evening". 12-hour and 24-hour keep the international parts of the day.
 * Run with `npm run test:dom`.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { strict as assert } from "node:assert";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../src");

/** Loads a TS module with relative and `@/` imports (CommonJS through the TypeScript transpiler). */
function load(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const output = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const require = (name) => {
    if (name.startsWith("@/")) return load(path.join(src, name.slice(2)) + ".ts", cache);
    if (name.startsWith(".")) return load(path.resolve(path.dirname(file), name) + ".ts", cache);
    return {};
  };
  vm.runInNewContext(output, { exports, require, Intl, Date, Math, Number, String, Object, Array });
  return exports;
}

const { groupSlots, slotGroupKey } = load(path.join(src, "pages/booking-v2/components/DateTimeSelector/TimeSlotsPanel/groups.ts"));
const { formatInstant } = load(path.join(src, "lib/time.ts"));
const en = JSON.parse(readFileSync(path.join(src, "lib/i18n/translations/en.json"), "utf8")).bookingPicker;
const am = JSON.parse(readFileSync(path.join(src, "lib/i18n/translations/am.json"), "utf8")).bookingPicker;

const zone = "Africa/Addis_Ababa"; // UTC+3, no daylight saving time
const at = (hour, minute = 0) => new Date(Date.UTC(2026, 9, 16, hour - 3, minute)).toISOString();
const slots = [];
for (let hour = 0; hour < 24; hour += 1) for (const minute of [0, 30, 59]) slots.push({ start_time: at(hour, minute), hour, minute });

// Every slot's label period is the heading of its group, in both languages.
for (const [language, catalog] of [["en", en], ["am", am]]) {
  const groups = groupSlots(slots, "ethiopian", zone);
  assert.equal(groups.reduce((sum, group) => sum + group.slots.length, 0), slots.length, "every slot is in one group");
  for (const group of groups) {
    const heading = catalog[group.key];
    assert.ok(heading, `${language}: bookingPicker.${group.key} exists`);
    for (const slot of group.slots) {
      const label = formatInstant(slot.start_time, "ethiopian", zone, { language });
      const word = label.split(" ").pop();
      assert.equal(word.toLowerCase(), heading.toLowerCase(), `${language} ${slot.hour}:${slot.minute} "${label}" is under "${heading}"`);
    }
  }
  assert.deepEqual(Array.from(groups, (group) => group.key), ["night", "morning", "afternoon", "evening"], "groups in the order of the day");
}

// The example of the owner: 17:00 is "11:00 afternoon" (ሰዓት 11:00 ከሰዓት) and sits under the afternoon.
assert.equal(formatInstant(at(17), "ethiopian", zone, { language: "en" }), "11:00 afternoon");
assert.equal(formatInstant(at(17), "ethiopian", zone, { language: "am" }), "ሰዓት 11:00 ከሰዓት");
assert.equal(slotGroupKey(at(17), "ethiopian", zone), "afternoon");
assert.equal(slotGroupKey(at(18), "ethiopian", zone), "evening");
assert.equal(slotGroupKey(at(5, 59), "ethiopian", zone), "night");
assert.equal(slotGroupKey(at(6), "ethiopian", zone), "morning");
assert.deepEqual([en.night, am.night, am.morning, am.afternoon, am.evening], ["night", "ሌሊት", "ጠዋት", "ከሰዓት", "ምሽት"]);

// 12-hour and 24-hour keep the international parts of the day (the browser's clock, as before).
const local = (hour) => new Date(2026, 9, 16, hour, 0).toISOString();
for (const format of ["12h", "24h"]) {
  assert.equal(slotGroupKey(local(11), format, zone), "morning");
  assert.equal(slotGroupKey(local(16), format, zone), "afternoon");
  assert.equal(slotGroupKey(local(17), format, zone), "evening");
  assert.deepEqual(Array.from(groupSlots([local(9), local(13), local(19)].map((start_time) => ({ start_time })), format, zone), (group) => group.key), ["morning", "afternoon", "evening"]);
}

console.log(`booking-slot-groups: ${slots.length} slots, label period = group in en and am`);
