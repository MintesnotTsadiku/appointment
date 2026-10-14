/**
 * Platform landing page ("A Day, Coordinated") guards.
 *
 * Proves the day clock and the pretend scheduling rules, that every chapter has
 * English and Amharic copy, and that the page keeps its handoffs to auth,
 * the language toggle, the template gallery and published showcase sites without legacy sections.
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
    { exports, URLSearchParams },
  );
  return exports;
};
const world = load("src/pages/landing/day/world.ts");
const schedule = load("src/pages/landing/day/schedule.ts");
const offer = load("src/pages/landing/shared/offer.ts");
const gallery = load("src/pages/landing/shared/templateGallery.ts");

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

// Promise: the free wording follows the server's fee facts and falls back to the careful claim.
assert.equal(offer.parseOffer(null, 5).free, "free_setup", "no answer yet: the claim true for every configuration");
assert.equal(offer.parseOffer(null, 5).loaded, false);
assert.equal(offer.parseOffer(null, 0).liveMinutes, 5, "minutes never show as zero");
assert.equal(offer.parseOffer({ free: "no_fee", live_minutes: 7 }, 5).liveMinutes, 7, "server minutes win");
assert.equal(offer.parseOffer({ free: "free_allowance", free_bookings: 0 }, 5).free, "free_setup", "an allowance of zero is not an allowance");
assert.equal(offer.parseOffer({ free: "free_allowance", free_bookings: 30 }, 5).freeBookings, 30);
assert.equal(offer.parseOffer({ free: "no_fee", free_bookings: 30 }, 5).freeBookings, 0);
assert.equal(offer.parseOffer({ free: "anything" }, 5).free, "free_setup");
assert.equal(offer.freeDetailKey(offer.parseOffer({ free: "no_fee" }, 5)), "world.promise.freeNoFee");
assert.equal(offer.freeDetailKey(offer.parseOffer({ free: "free_allowance", free_bookings: 3 }, 5)), "world.promise.freeAllowance");
assert.equal(offer.fill("Live in {minutes} minutes, {minutes}!", { minutes: 5 }), "Live in 5 minutes, 5!");
assert.equal(offer.partnersPath("am"), "/am/partners");
assert.equal(offer.partnersPath("en"), "/partners");

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

for (const key of ["freeNoFee", "freeAllowance", "freeSetup", "liveLabel", "liveDetail", "amharicLabel", "amharicDetail"]) {
  assert.ok(en[`promise.${key}`], `missing world.promise.${key}`);
}
assert.ok(en["promise.liveLabel"].includes("{minutes}"), "the minutes are configured, never written into the copy");
assert.ok(en["promise.freeAllowance"].includes("{count}"), "the free allowance is configured, never written into the copy");
assert.ok(!/\d/.test(en["promise.liveLabel"] + en["promise.freeAllowance"] + en["promise.freeNoFee"]), "no hard-coded numbers in promises");
assert.ok(read("src/pages/landing/day/components/Finale.tsx").includes("partnersPath(language)"), "the footer links the partners page");
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
// Template gallery: every certified template comes from the server list, never from this page.
assert.ok(world.STOPS.some((item) => item.id === "gallery"), "the timetable and rail stop at the gallery");
assert.ok(!world.CHAPTERS.some((item) => item.id === "gallery"), "the gallery is not a persona chapter");
for (const key of ["short", "status", "eyebrow", "title", "lede", "preview", "live", "use", "noLive", "desktop", "mobile", "light", "dark", "close"]) {
  assert.ok(en[`gallery.${key}`], `missing world.gallery.${key}`);
}
for (const industry of ["wellness", "beauty", "creative", "education", "health", "therapy"]) {
  assert.ok(en[`gallery.industry.${industry}`] && en[`gallery.for.${industry}`], `missing gallery copy for ${industry}`);
}
assert.ok(en["nav.templates"] && en["night.templates"], "the top bar and footer link the gallery");
const galleryRows = {
  templates: [
    { key: "bloom-hair", label: "Bloom Hair", audience: "Hair salons", industry: "beauty", locales: ["en", "am", "fr"], themes: ["light", "dark"],
      accent: "#4a1f55", hero: "/assets/appointment/brand-experience/heroes/bloom-hair.webp",
      previews: { desktop: "/assets/appointment/brand-experience/template-gallery/bloom-hair-desktop.webp", mobile: "https://example.com/x.webp" },
      showcase: { path: "/bloom-studio", title: "Bole Bloom Hair Studio" } },
    { key: "new-recipe", label: "New Recipe", industry: "", locales: ["en"], themes: ["light"], accent: "red; x", previews: {}, showcase: { path: "//evil.example" } },
    { key: "bloom-hair", label: "Duplicate" },
    { key: "Bad Key", label: "Rejected" },
    { key: "no-label" },
  ],
};
const parsed = gallery.parseGallery(galleryRows);
assert.deepEqual(Array.from(parsed, (item) => item.key), ["bloom-hair", "new-recipe"], "any new template is listed; malformed rows are dropped");
assert.deepEqual(Array.from(parsed[0].locales), ["en", "am"]);
assert.equal(parsed[0].previews.mobile, undefined, "remote preview images are refused");
assert.equal(parsed[0].showcase.path, "/bloom-studio");
assert.equal(parsed[1].showcase, null, "a template without a safe published showcase has no live link");
assert.equal(parsed[1].accent, null, "colours are hex only");
assert.equal(gallery.parseGallery(null).length, 0, "a failed request shows no cards");
assert.equal(gallery.previewSrc("/bloom-studio", "am", "dark"), "/bloom-studio/am?display=dark");
assert.equal(gallery.previewSrc("/tena-studio", "en", "light"), "/tena-studio?display=light");
assert.equal(gallery.templateStartHref("/signup", "tena-clinic"), "/signup?source=template_gallery&template=tena-clinic");
assert.equal(gallery.templateStartHref("/signup?ref=abc", "tena-clinic"), "/signup?ref=abc&source=template_gallery&template=tena-clinic");
assert.equal(gallery.fitScale(400, 800, 414, 868), Math.min(400 / 414, 800 / 868));
assert.equal(gallery.fitScale(2000, 2000, 414, 868), 1, "never enlarges the page");
const galleryView = read("src/pages/landing/day/components/TemplateGallery.tsx");
assert.ok(galleryView.includes("templates.map("), "cards are drawn from the server list");
assert.ok(!/bloom-hair|selam-movement|tena-clinic|ergata-therapy|meron-atelier|abugida-language/.test(galleryView + read("src/pages/landing/day/components/TemplatePreview.tsx")),
  "the gallery never hard-codes a template");
assert.ok(read("src/pages/landing/day/DayLanding.tsx").includes("<TemplateGallery"), "the landing page shows the gallery");
assert.ok(read("src/pages/landing/day/components/TopBar.tsx").includes("world.nav.templates"), "the top bar links the gallery");
assert.ok(read("src/pages/landing/day/components/Finale.tsx").includes('href="/templates"'), "the footer links the gallery page");
assert.ok(read("src/route.tsx").includes('path="/templates" element={<TemplatesPage />}'), "the gallery has its own page");
assert.ok(read("src/public-experience/routes.ts").includes('"templates"'), "/templates can never become a site slug");
assert.ok(read("src/public-experience/PublicExperienceProvider.tsx").includes('get("display")'), "the preview opens a showcase in a chosen mode");
assert.ok(read("src/route.tsx").includes('path="/" element={<LandingPage />}'), "landing route unchanged");

console.log("landing-world: ok");
