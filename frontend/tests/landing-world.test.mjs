/**
 * Platform landing page ("A Day, Coordinated") guards.
 *
 * Proves the day clock and the pretend scheduling rules, that every chapter has
 * English and Amharic copy, and that the page keeps its handoffs to auth,
 * the language toggle, and published showcase sites without legacy sections.
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
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const { default: ts } = await import("typescript");
const load = (rel) => {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(read(rel), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText,
    { exports },
  );
  return exports;
};
const world = load("src/pages/landing/day/world.ts");
const schedule = load("src/pages/landing/day/schedule.ts");

// Day clock.
assert.equal(world.clockLabel(7), "07:00");
assert.equal(world.clockLabel(16.75), "16:45");
assert.equal(world.clockLabel(9.49), "09:25");
assert.equal(world.hourAt(1, 0), 7);
assert.equal(world.hourAt(1, 1), 9.5);
assert.equal(world.hourAt(1, 0.5), 8.25);
assert.equal(world.hourAt(99, 0.5), world.WORLDS.at(-1).hour, "index clamps to the last world");
const hours = Array.from(world.WORLDS, (item) => item.hour);
assert.deepEqual([...hours].sort((a, b) => a - b), hours, "worlds run forward through the day");
assert.equal(world.celestialPosition(12).body, "sun");
assert.equal(world.celestialPosition(21).body, "moon");

// Reception: the next opening respects hours, existing bookings and the buffer on both sides.
const day = (bookings, opens = 840) => ({ name: "P", opens, closes: 1080, bookings });
const busy = day([{ id: "a", who: "A", start: 840, length: 60 }, { id: "b", who: "B", start: 930, length: 60 }]);
assert.equal(schedule.nextOpening([busy], 30, 0, 845).start, 900, "fits in the gap with no buffer");
assert.equal(schedule.nextOpening([busy], 30, 10, 845).start, 1005, "a 10-minute buffer pushes it past the gap");
assert.equal(schedule.nextOpening([busy, day([], 960)], 45, 10, 845).provider, "P", "earliest across providers wins");
assert.equal(schedule.nextOpening([day([{ id: "x", who: "X", start: 840, length: 240 }])], 30, 0, 840), null, "a full day has no opening");
assert.equal(schedule.hhmm(905), "15:05");
assert.match(schedule.reference("walk-1"), /^APT-[A-Z2-9]{6}$/);
assert.equal(schedule.reference("walk-1"), schedule.reference("walk-1"), "references are stable");

// Changes: moves are refused on clashes and outside working hours, and keep the booking's length.
const afternoon = { name: "R", opens: 900, closes: 1140, bookings: [
  { id: "abebe", who: "Abebe", start: 930, length: 45 },
  { id: "hirut", who: "Hirut", start: 1020, length: 60 },
  { id: "yonas", who: "Yonas", start: 1110, length: 30 },
] };
const earlier = schedule.moveBooking(afternoon, "hirut", -30);
assert.equal(earlier.outcome, "moved");
assert.equal(earlier.provider.bookings.find((item) => item.id === "hirut").start, 990);
assert.equal(schedule.moveBooking(earlier.provider, "hirut", -30).outcome, "clash");
assert.equal(schedule.moveBooking(afternoon, "abebe", -60).outcome, "closed");
assert.equal(schedule.moveBooking(afternoon, "yonas", 30).outcome, "closed", "cannot end after closing");
assert.equal(afternoon.bookings[1].start, 1020, "the original day is not mutated");

// Copy exists in both shipped catalogs for every key the page uses.
const flatten = (value, prefix = "") =>
  Object.entries(value).flatMap(([key, item]) =>
    typeof item === "object" ? flatten(item, prefix + key + ".") : [[prefix + key, item]],
  );
const en = Object.fromEntries(flatten(JSON.parse(read("src/lib/i18n/translations/en.json")).world));
const am = Object.fromEntries(flatten(JSON.parse(read("src/lib/i18n/translations/am.json")).world));
assert.deepEqual(Object.keys(am).sort(), Object.keys(en).sort(), "Amharic covers every English landing key");
for (const chapter of world.CHAPTERS) {
  for (const key of ["short", "kicker", "title", "lede", "beat1", "beat2", "beat3", "status"]) {
    assert.ok(en[`${chapter.id}.${key}`], `missing world.${chapter.id}.${key}`);
  }
}
const sources = fs
  .readdirSync(path.join(root, "src/pages/landing"), { recursive: true })
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => read(path.join("src/pages/landing", file)))
  .join("\n");
for (const [, key] of sources.matchAll(/t\("(world\.[\w.]+)"\)/g)) {
  assert.ok(en[key.slice("world.".length)], `unknown translation key ${key}`);
}

for (const key of ["bookedOnline", "movedTo", "clash", "closed", "cancelled", "restored", "stale", "reloaded"]) {
  assert.ok(en[`moves.${key}`], `missing world.moves.${key}`);
}
for (const key of ["last7", "last30", "last90", "mon", "tue", "wed", "thu", "fri", "sat", "sun", "bookings", "utilisation", "noShows", "revenue"]) {
  assert.ok(en[`insights.${key}`], `missing world.insights.${key}`);
}
for (const key of ["cut", "blowdry", "braids"]) assert.ok(en[`team.${key}`], `missing world.team.${key}`);

// Handoffs and containment.
const page = read("src/pages/landing/index.tsx");
assert.ok(page.includes('"./day/DayLanding"'), "the Day concept is the landing page");
assert.ok(!fs.existsSync(path.join(root, "src/pages/landing/shared/concepts.ts")), "no concept switching remains");
assert.ok(!fs.existsSync(path.join(root, "src/pages/landing/sections")), "legacy sections are removed");
assert.ok(!page.includes("layout/Navigation"), "landing owns its chrome");
assert.ok(read("src/pages/landing/day/components/TopBar.tsx").includes("LanguageToggle"), "language toggle stays on /");
assert.ok(sources.includes('href="/login"'), "sign-in handoff");
assert.ok(sources.includes("registration.public_settings"), "sign-up follows the platform policy");
const doors = read("src/pages/landing/shared/useShowcaseDoors.ts");
assert.ok(doors.includes('source !== "experience-release"'), "showcase doors fail closed");
assert.ok(doors.includes("get_public_ui_config"), "doors read the trusted public projection");
assert.ok(read("src/route.tsx").includes('path="/" element={<LandingPage />}'), "landing route unchanged");

console.log("landing-world: ok");
