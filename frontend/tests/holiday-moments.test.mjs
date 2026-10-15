/**
 * Ethiopian holiday moments (`src/public-experience/templates/kit/core/holidays.ts`): the calendar
 * conversion that the kit re-exports from `src/lib/ethiopian-calendar.ts`, against the shared vectors, the known holiday dates, and the window on both sides of each
 * holiday. Also checks that every v3 template draws its own holiday moment and that the preview
 * override is development-only. Run with `npm run test:dom`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { strict as assert } from "node:assert";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../src");
const templates = path.join(src, "public-experience/templates");

/** Loads a TS module with relative imports (CommonJS through the TypeScript transpiler). */
function load(file, cache = new Map()) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  const output = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const require = (name) => (name.startsWith(".") ? load(path.resolve(path.dirname(file), name) + ".ts", cache) : {});
  vm.runInNewContext(output, { exports, require, Intl, Date, Math, Number, String, Object, Array });
  return exports;
}

const same = (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
const holidays = load(path.join(templates, "kit/core/holidays.ts"));
const day = (iso) => holidays.parseIsoDate(iso);

// 1. The calendar port gives the same answers as the Python and JavaScript twins.
const vectors = JSON.parse(readFileSync(path.resolve(here, "../../appointment/growth/vectors/ethiopian_calendar.json"), "utf8"));
for (const [iso, [year, month, dayOfMonth], why] of vectors.pairs) {
  same(holidays.toEthiopian(day(iso)), { year, month, day: dayOfMonth }, `to Ethiopian: ${why}`);
  assert.equal(holidays.isoDate(holidays.toGregorian({ year, month, day: dayOfMonth })), iso, `to Gregorian: ${why}`);
}
for (const year of vectors.leap_years) assert.ok(holidays.isEthiopianLeap(year), `${year} is a leap year`);
for (const year of vectors.common_years) assert.ok(!holidays.isEthiopianLeap(year), `${year} is a common year`);
assert.equal(holidays.parseIsoDate("2026-02-30"), null);
assert.equal(holidays.parseIsoDate("tomorrow"), null);

// 2. Known holiday dates (published Ethiopian public holidays).
const KNOWN = [
  ["enkutatash", "2023-09-12", 2016], ["enkutatash", "2024-09-11", 2017], ["enkutatash", "2025-09-11", 2018],
  ["enkutatash", "2026-09-11", 2019], ["enkutatash", "2027-09-12", 2020],
  ["meskel", "2023-09-28", 2016], ["meskel", "2024-09-27", 2017], ["meskel", "2025-09-27", 2018], ["meskel", "2027-09-28", 2020],
  ["genna", "2024-01-07", 2016], ["genna", "2025-01-07", 2017], ["genna", "2026-01-07", 2018], ["genna", "2028-01-07", 2020],
  ["timket", "2024-01-20", 2016], ["timket", "2025-01-19", 2017], ["timket", "2026-01-19", 2018], ["timket", "2028-01-20", 2020],
  ["adwa", "2024-03-02", 128], ["adwa", "2025-03-02", 129], ["adwa", "2026-03-02", 130], ["adwa", "2028-03-02", 132],
];
for (const [key, iso, count] of KNOWN) {
  const found = holidays.activeHoliday(day(iso));
  assert.ok(found, `${key} on ${iso}`);
  assert.equal(found.key, key, `${iso} is ${key}`);
  assert.equal(found.date, iso);
  assert.equal(found.offset, 0);
  assert.equal(found.count, count, `${key} ${iso} count`);
}
same(holidays.activeHoliday(day("2026-09-11")).ethiopian, { year: 2019, month: 1, day: 1 }, "Meskerem 1, 2019");
same(holidays.activeHoliday(day("2026-01-07")).ethiopian, { year: 2018, month: 4, day: 29 }, "Genna is Tahsas 29 in a common year");
same(holidays.activeHoliday(day("2024-01-07")).ethiopian, { year: 2016, month: 4, day: 28 }, "Genna is Tahsas 28 after a leap year");

// 3. Each window, both directions: the first and last day inside, and the day just outside.
const shift = (iso, days) => holidays.isoDate(holidays.jdnToGregorian(holidays.gregorianToJdn(day(iso)) + days));
for (const [key, iso] of KNOWN) {
  const { before, after } = holidays.HOLIDAY_WINDOWS[key];
  const first = holidays.activeHoliday(day(shift(iso, -before)));
  assert.equal(first?.key, key, `${key}: ${before} days before ${iso} is inside`);
  assert.equal(first.offset, -before);
  const last = holidays.activeHoliday(day(shift(iso, after)));
  assert.equal(last?.key, key, `${key}: ${after} days after ${iso} is inside`);
  assert.equal(last.offset, after);
  const early = holidays.activeHoliday(day(shift(iso, -before - 1)));
  assert.notEqual(early?.key, key, `${key}: ${before + 1} days before ${iso} is outside`);
  const late = holidays.activeHoliday(day(shift(iso, after + 1)));
  assert.notEqual(late?.key, key, `${key}: ${after + 1} days after ${iso} is outside`);
}
assert.equal(holidays.activeHoliday(day("2026-10-15")), null, "an ordinary day has no moment");
assert.equal(holidays.activeHoliday(day("2026-06-01")), null);
// A window that crosses the Gregorian new year (Genna on 7 January).
assert.equal(holidays.activeHoliday(day("2026-01-05")).key, "genna");
assert.equal(holidays.activeHoliday(day("2026-01-04")), null);
// Enkutatash crosses the Ethiopian new year: the eve is in the old year, the count is the new year.
assert.equal(holidays.activeHoliday(day("2026-09-09")).count, 2019);

// 4. The preview helper finds the next occurrence.
assert.equal(holidays.nextHoliday("meskel", day("2026-10-15")).date, "2027-09-28");
assert.equal(holidays.nextHoliday("genna", day("2026-10-15")).date, "2027-01-07");
assert.equal(holidays.nextHoliday("enkutatash", day("2026-09-11")).date, "2026-09-11");
assert.ok(holidays.isHolidayKey("timket"));
assert.ok(!holidays.isHolidayKey("eid"), "Eid dates follow the moon sighting; they are not computed");
same(holidays.dateIn(new Date("2026-09-10T21:30:00Z")), { year: 2026, month: 9, day: 11 }, "Addis Ababa is UTC+3");

// 5. The kit keeps the preview override development-only and out of the pure core.
const hook = readFileSync(path.join(templates, "kit/holidays.ts"), "utf8");
assert.match(hook, /import\.meta\.env\.DEV/);
assert.doesNotMatch(readFileSync(path.join(templates, "kit/core/holidays.ts"), "utf8"), /import\.meta|window\./);

// 6. Every v3 template (and Ergata v2) draws its own moment, gated by the owner setting, and stops for reduced motion.
const PACKAGES = ["bloom-v3", "selam-v3", "tena-v3", "abugida-v3", "meron-v3", "ergata-v2"];
for (const folder of PACKAGES) {
  const file = path.join(templates, folder, "holiday.tsx");
  assert.ok(existsSync(file), `${folder} has its own holiday.tsx`);
  const code = readFileSync(file, "utf8");
  assert.doesNotMatch(code, /from "\.\.\/(?!kit|chrome|types)[^"]+"/, `${folder}/holiday.tsx imports only the kit, chrome and types`);
  assert.match(code, /useHoliday\(/, `${folder} uses the kit's useHoliday`);
  assert.match(code, /holidayGreetings === true/, `${folder} reads the owner setting`);
  const css = readFileSync(path.join(templates, folder, "holiday.css"), "utf8");
  assert.match(css, /prefers-reduced-motion: reduce/, `${folder} holiday CSS stops for reduced motion`);
  assert.doesNotMatch(css, /position:\s*fixed/, `${folder} holiday moment never floats over content`);
  const page = readdirSync(path.join(templates, folder)).find((name) => /Template\.tsx$/.test(name));
  assert.match(readFileSync(path.join(templates, folder, page), "utf8"), /<\w+Holiday\b/, `${folder} renders its holiday moment`);
}

console.log("holiday moments: ok");
