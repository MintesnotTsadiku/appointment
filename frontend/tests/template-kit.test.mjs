/**
 * Pure logic of the headless template kit (`src/public-experience/templates/kit/core/`):
 * motion levels, Ge'ez numerals and count-ups, pointer math, responsive picture sources,
 * the Addis Ababa clock, opening hours and the Habesha clock, and the next-availability answer.
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
const cache = new Map();

/** Load a TypeScript module and its relative imports as CommonJS. */
function load(file) {
  const resolved = file.endsWith(".ts") ? file : `${file}.ts`;
  if (cache.has(resolved)) return cache.get(resolved);
  const exports = {};
  cache.set(resolved, exports);
  const output = ts.transpileModule(readFileSync(resolved, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const require = (name) => load(name.startsWith("@/") ? path.join(src, name.slice(2)) : path.resolve(path.dirname(resolved), name));
  vm.runInNewContext(output, { exports, require, Intl, Date, Math, Number, String, Object, Array, Set, Map });
  return exports;
}

/** Compare values across the vm realm. */
const same = (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);

const core = path.join(src, "public-experience/templates/kit/core");
const motion = load(path.join(core, "motion"));
const numbers = load(path.join(core, "numbers"));
const pointer = load(path.join(core, "pointer"));
const picture = load(path.join(core, "picture"));
const clock = load(path.join(core, "clock"));
const availability = load(path.join(core, "availability"));

// Motion levels: reduced motion always wins; unknown levels read as "standard".
assert.equal(motion.resolveMotion("expressive", true), "none");
assert.equal(motion.resolveMotion("expressive", false), "expressive");
assert.equal(motion.resolveMotion("calm", false), "calm");
assert.equal(motion.resolveMotion("wild", false), "standard");
assert.ok(motion.allows("expressive", "standard"));
assert.ok(!motion.allows("calm", "standard"));
assert.ok(!motion.allows("none", "calm"));
assert.equal(motion.revealDelay(0), 0);
assert.equal(motion.revealDelay(3), 210);
assert.equal(motion.revealDelay(40), 420);
same(motion.maskTiming(2, "none"), { delay: 0, duration: 0 });
assert.equal(motion.maskTiming(0, "expressive").duration, 1100);
assert.equal(motion.viewProgress(900, 300, 900), 0);
assert.equal(motion.viewProgress(-300, 300, 900), 1);
assert.equal(motion.viewProgress(300, 300, 900), 0.5);
assert.equal(motion.easeOut(1), 1);
assert.equal(motion.easeOut(0), 0);

// Ge'ez numerals.
const geez = { 1: "፩", 9: "፱", 10: "፲", 12: "፲፪", 99: "፺፱", 100: "፻", 101: "፻፩", 123: "፻፳፫", 200: "፪፻", 1000: "፲፻", 2026: "፳፻፳፮", 10000: "፼", 12345: "፼፳፫፻፵፭", 1000000: "፻፼" };
for (const [value, expected] of Object.entries(geez)) assert.equal(numbers.toGeez(Number(value)), expected, `Ge'ez ${value}`);
assert.equal(numbers.toGeez(0), "");
assert.equal(numbers.toGeez(2.5), "");

// Count-ups keep the text around the number.
same(numbers.parseCountable("ETB 1,100"), { prefix: "ETB ", value: 1100, suffix: "", decimals: 0 });
same(numbers.parseCountable("3 options"), { prefix: "", value: 3, suffix: " options", decimals: 0 });
assert.equal(numbers.parseCountable("One-to-one"), null);
assert.equal(numbers.countFrame(numbers.parseCountable("ETB 1,100"), 1), "ETB 1,100");
assert.equal(numbers.countFrame(numbers.parseCountable("ETB 1,100"), 0.5), "ETB 550");
assert.equal(numbers.countFrame(numbers.parseCountable("12 years"), 1, { geez: true }), "፲፪ years");

// Pointer math stays inside its limits.
const box = { left: 100, top: 100, width: 200, height: 100 };
same(pointer.magneticOffset(box, 300, 150, 6), { x: 6, y: 0 });
same(pointer.magneticOffset(box, 1000, 1000, 6), { x: 6, y: 6 });
same(pointer.tiltAngles(box, 200, 100, 4), { x: 4, y: 0 });
same(pointer.glowPosition(box, 150, 125), { x: 25, y: 25 });
assert.equal(pointer.coverRadius(0, 0, 300, 400), 500);

// Picture sources: art direction, night, AVIF and widths.
const asset = { src: "/assets/appointment/a/hero.webp", mobileSrc: "/assets/appointment/a/hero-m.webp", width: 1600, height: 1000, mobileWidth: 720, mobileHeight: 900,
  darkSrc: "/assets/appointment/a/hero-night.webp", darkMobileSrc: "/assets/appointment/a/hero-night-m.webp", formats: ["avif"], widths: [640, 960] };
const day = picture.pictureSet(asset, { sizes: "50vw" });
assert.equal(day.sources.length, 3);
same(day.sources[0], { srcSet: "/assets/appointment/a/hero-m.avif", type: "image/avif", media: "(max-width: 640px)", width: 720, height: 900 });
assert.equal(day.sources[1].srcSet, "/assets/appointment/a/hero-m.webp");
assert.equal(day.sources[2].srcSet, "/assets/appointment/a/hero-w640.avif 640w, /assets/appointment/a/hero-w960.avif 960w, /assets/appointment/a/hero.avif 1600w");
assert.equal(day.img.srcSet, "/assets/appointment/a/hero-w640.webp 640w, /assets/appointment/a/hero-w960.webp 960w, /assets/appointment/a/hero.webp 1600w");
assert.equal(day.img.sizes, "50vw");
assert.equal(day.img.width, 1600);
const night = picture.pictureSet(asset, { night: true });
assert.equal(night.img.src, "/assets/appointment/a/hero-night.webp");
assert.equal(night.sources[1].srcSet, "/assets/appointment/a/hero-night-m.webp");
const owner = picture.pictureSet({ src: "/files/section-abc.webp" }, { night: true });
same(owner.sources, []);
same(owner.img, { src: "/files/section-abc.webp" });
assert.equal(picture.loadingAttributes(true).fetchpriority, "high");
assert.equal(picture.loadingAttributes(false).loading, "lazy");
assert.ok(!("fetchPriority" in picture.loadingAttributes(true)));

// Addis Ababa clock (UTC+3, no daylight saving).
const reading = clock.clockIn(new Date("2026-10-15T16:30:00Z"));
same(reading, { weekday: "Thursday", hour: 19, minute: 30 });
assert.equal(clock.dayPart(7), "morning");
assert.equal(clock.dayPart(13), "afternoon");
assert.equal(clock.dayPart(19), "evening");
assert.equal(clock.dayPart(23), "night");
assert.ok(clock.afterDark(18) && clock.afterDark(5) && !clock.afterDark(6) && !clock.afterDark(17));
same(clock.parseClock("21:30"), { hour: 21, minute: 30 });
assert.equal(clock.parseClock("25:00"), null);

// Open now: Bloom's hours, Tuesday to Sunday 09:00–19:00 (closed Monday).
const days = ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => ({ day, open: "09:00", close: "19:00" }));
same(clock.openState(days, { weekday: "Thursday", hour: 10, minute: 0 }), { open: true, closes: "19:00" });
same(clock.openState(days, { weekday: "Thursday", hour: 8, minute: 15 }), { open: false, opensDay: "Thursday", opens: "09:00", opensToday: true });
same(clock.openState(days, { weekday: "Sunday", hour: 19, minute: 0 }), { open: false, opensDay: "Tuesday", opens: "09:00", opensToday: false });
same(clock.openState([], { weekday: "Sunday", hour: 10, minute: 0 }), { open: false });

// The Habesha clock in spoken form.
assert.equal(clock.habeshaPhrase("09:00"), "ከጠዋቱ 3 ሰዓት");
assert.equal(clock.habeshaPhrase("12:00"), "ከቀኑ 6 ሰዓት");
assert.equal(clock.habeshaPhrase("13:30"), "ከቀኑ 7:30 ሰዓት");
assert.equal(clock.habeshaPhrase("19:00"), "ከምሽቱ 1 ሰዓት");
assert.equal(clock.habeshaPhrase("02:00"), "ከሌሊቱ 8 ሰዓት");

// The next-availability answer: only counts and start times survive validation.
assert.equal(availability.parseAvailability({ enabled: false }), null);
assert.equal(availability.parseAvailability(null), null);
const parsed = availability.parseAvailability({ enabled: true, timezone: "Africa/Addis_Ababa", todayLeft: 4,
  next: { start: "2026-10-15T11:30:00Z", service: "SVC-1", provider: "PRV-1", offering: "EVT-1" },
  services: { "SVC-1": { next: "2026-10-15T11:30:00Z", todayLeft: 2 }, "<bad>": { next: "x", todayLeft: 1 } },
  providers: { "PRV-1": { next: "javascript:alert(1)", todayLeft: -1 } }, customer: "never shown" });
assert.equal(parsed.todayLeft, 4);
assert.equal(parsed.next.offering, "EVT-1");
same(Object.keys(parsed.services), ["SVC-1"]);
same(parsed.providers["PRV-1"], { next: null, todayLeft: 0 });
assert.ok(!("customer" in parsed));
const now = new Date("2026-10-15T08:00:00Z");
same(availability.slotLabel("2026-10-15T11:30:00Z", now), { when: "today", weekday: "Thursday", time: "14:30" });
assert.equal(availability.slotLabel("2026-10-16T06:00:00Z", now).when, "tomorrow");
assert.equal(availability.slotLabel("2026-10-18T06:00:00Z", now).when, "day");

console.log("template-kit: all checks passed");
