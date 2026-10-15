/**
 * The booking pages' Ethiopian calendar (`src/lib/ethiopian-calendar.ts`) against the shared vectors
 * (`appointment/growth/vectors/ethiopian_calendar.json`): conversion both ways, Pagume, the month grid
 * and the dates in words. Also checks that the time picker uses it for Habesha time. Run with `npm run test:dom`.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { strict as assert } from "node:assert";
import ts from "typescript";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, "../src");

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

const cal = load(path.join(src, "lib/ethiopian-calendar.ts"));
const local = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const iso = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const vectors = JSON.parse(readFileSync(path.resolve(here, "../../appointment/growth/vectors/ethiopian_calendar.json"), "utf8"));
for (const [day, [year, month, dayOfMonth], why] of vectors.pairs) {
  const found = cal.ethiopianOf(local(day));
  assert.deepEqual([found.year, found.month, found.day], [year, month, dayOfMonth], `${day} -> ${why}`);
  assert.equal(iso(cal.fromEthiopian({ year, month, day: dayOfMonth })), day, `${why} -> ${day}`);
}
for (const year of vectors.leap_years) assert.equal(cal.daysInEthiopianMonth(year, 13), 6, `Pagume ${year} has six days`);
for (const year of vectors.common_years) assert.equal(cal.daysInEthiopianMonth(year, 13), 5, `Pagume ${year} has five days`);
assert.equal(cal.daysInEthiopianMonth(2019, 2), 30);

// The owner's example: 15 October 2026 is Tikimt 5, 2019 (a Thursday).
assert.deepEqual({ ...cal.ethiopianOf(local("2026-10-15")) }, { year: 2019, month: 2, day: 5 });
assert.equal(cal.formatEthiopianDate(local("2026-10-15"), "am"), "ሐሙስ፣ ጥቅምት 5 ቀን 2019");
assert.equal(cal.formatEthiopianDate(local("2026-10-15"), "en"), "Thursday, Tikimt 5, 2019");
assert.equal(cal.formatEthiopianDate(local("2026-10-15"), "en", { weekday: "short", year: false }), "Thu, Tikimt 5");
assert.equal(cal.ethiopianMonthLabel({ year: 2018, month: 13 }, "am"), "ጳጉሜ 2018");

// Month navigation runs through Pagume into the new year and back.
assert.deepEqual({ ...cal.shiftEthiopianMonth({ year: 2018, month: 12 }, 1) }, { year: 2018, month: 13 });
assert.deepEqual({ ...cal.shiftEthiopianMonth({ year: 2018, month: 13 }, 1) }, { year: 2019, month: 1 });
assert.deepEqual({ ...cal.shiftEthiopianMonth({ year: 2019, month: 1 }, -1) }, { year: 2018, month: 13 });

// The grid: whole weeks from Sunday, every day of the month once, in order.
for (const view of [{ year: 2019, month: 2 }, { year: 2018, month: 13 }, { year: 2019, month: 13 }]) {
  const weeks = cal.ethiopianMonthGrid(view);
  const days = weeks.flat();
  assert.ok(weeks.every((week) => week.length === 7 && week[0].getDay() === 0), "weeks start on Sunday");
  const inMonth = days.filter((day) => { const e = cal.ethiopianOf(day); return e.year === view.year && e.month === view.month; });
  assert.equal(inMonth.length, cal.daysInEthiopianMonth(view.year, view.month), `${view.year}/${view.month} has every day once`);
  inMonth.forEach((day, index) => assert.equal(cal.ethiopianOf(day).day, index + 1));
}
// Pagume 2018 (5 days) runs from 6 to 10 September 2026; Pagume 2019 has six days and ends on 11 September 2027.
const pagume = cal.ethiopianMonthGrid({ year: 2018, month: 13 }).flat().filter((day) => cal.ethiopianOf(day).month === 13);
assert.deepEqual(pagume.map(iso), ["2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10"]);
assert.equal(iso(cal.fromEthiopian({ year: 2019, month: 13, day: 6 })), "2027-09-11");

// The time picker draws the Ethiopian grid for Habesha time and keeps the Gregorian grid for the other clocks.
const picker = readFileSync(path.join(src, "pages/booking-v2/components/DateTimeSelector/index.tsx"), "utf8");
assert.match(picker, /timeFormat === "ethiopian"/, "the picker switches calendars with Habesha time");
assert.match(readFileSync(path.join(src, "pages/booking-v2/components/DateTimeSelector/EthiopianCalendar/index.tsx"), "utf8"), /ethiopianMonthGrid\(/, "the Ethiopian grid uses the shared month grid");
// The picker opens on the next open day when the first day has no open time, and says so (Ethiopian dates with Habesha time).
assert.match(picker, /useOpeningDay\(/, "the picker uses the opening-day rule");
assert.match(picker, /formatEthiopianDate\(date, language, \{ weekday: "short", year: false \}\)/, "the note shows Ethiopian dates with Habesha time");
for (const language of ["en", "am"]) {
  const catalog = JSON.parse(readFileSync(path.join(src, `lib/i18n/translations/${language}.json`), "utf8"));
  assert.ok(catalog.bookingLayout.noTimesToday.includes("{0}") && catalog.bookingLayout.noTimesOn.includes("{1}"), `${language}: the opening note is translated`);
}

// One conversion: the template kit re-exports this module instead of keeping its own port.
const kitHolidays = readFileSync(path.join(src, "public-experience/templates/kit/core/holidays.ts"), "utf8");
assert.match(kitHolidays, /from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/ethiopian-calendar"/, "the kit takes the conversion from lib/ethiopian-calendar");
assert.ok(!/const EPOCH|function jdnToEthiopian/.test(kitHolidays), "the kit has no second calendar port");

// One spelling of the 13th month (ጳጉሜ) in the Python and JavaScript twins and in every frontend source file.
const pagumeFiles = [
  path.resolve(here, "../../appointment/growth/ethiopian_calendar.py"),
  path.resolve(here, "../../appointment/public/js/tools/ethiopian-calendar.js"),
];
const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(path.join(directory, entry.name)) : /\.(tsx?|json)$/.test(entry.name) ? [path.join(directory, entry.name)] : []);
for (const file of [...pagumeFiles, ...walk(src)]) {
  assert.ok(!/ጳጉሜን|ጷጉሜ|ጳግሜ/.test(readFileSync(file, "utf8")), `${path.relative(path.resolve(here, "../.."), file)} spells Pagume ጳጉሜ`);
}
for (const file of pagumeFiles) assert.match(readFileSync(file, "utf8"), /"ጳጉሜ", "Pagume"/, `${path.basename(file)} names month 13 ጳጉሜ`);
console.log("ethiopian-calendar: all checks passed");
