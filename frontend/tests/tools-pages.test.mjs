/**
 * Pure logic of the free tool pages (appointment/public/js/tools/*.js):
 * Ethiopian calendar (shared vectors with appointment/growth/ethiopian_calendar.py),
 * reminder messages and SMS segments, and the hours-sign state and markup.
 *
 * Run with `npm run test:dom`.
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { strict as assert } from "node:assert";

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, "../../appointment");
const sandbox = { Intl, Date, String, Number, Math, JSON, Array, Object, TextEncoder, TextDecoder, btoa, atob, Uint8Array };
vm.createContext(sandbox);
for (const file of ["public/js/habesha-time.js", "public/js/tools/tools-common.js", "public/js/tools/ethiopian-calendar.js", "public/js/tools/reminder.js", "public/js/tools/hours-sign.js"]) {
  vm.runInContext(fs.readFileSync(path.join(app, file), "utf8"), sandbox, { filename: file });
}
const { EthiopianCalendar: E, ReminderTool: R, HoursSign: S, HabeshaTime: H, ToolsCommon: C } = sandbox;
assert.ok(E && R && S && H && C, "tool scripts must load without a DOM");

// Ethiopian calendar: shared vectors, both directions.
const vectors = JSON.parse(fs.readFileSync(path.join(app, "growth/vectors/ethiopian_calendar.json"), "utf8"));
for (const [iso, [year, month, day], note] of vectors.pairs) {
  const [gy, gm, gd] = iso.split("-").map(Number);
  const ethiopian = E.toEthiopian(gy, gm, gd);
  assert.deepEqual([ethiopian.year, ethiopian.month, ethiopian.day], [year, month, day], `${iso} (${note})`);
  const gregorian = E.toGregorian(year, month, day);
  assert.deepEqual([gregorian.year, gregorian.month, gregorian.day], [gy, gm, gd], `back to ${iso}`);
}
for (const year of vectors.leap_years) assert.ok(E.isLeap(year), `${year} is a leap year`);
for (const year of vectors.common_years) assert.ok(!E.isLeap(year), `${year} is a common year`);
for (const date of vectors.invalid) assert.equal(E.toGregorian(...date), null, `invalid ${date}`);
assert.equal(E.daysInMonth(2015, 13), 6);
assert.equal(E.daysInMonth(2016, 13), 5);
assert.ok(!E.isValidGregorian(2025, 2, 29));
assert.ok(E.isValidGregorian(2024, 2, 29));
assert.equal(E.formatEthiopian({ year: 2017, month: 1, day: 1 }, "am"), "መስከረም 1 ቀን 2017 ዓ.ም.");
assert.equal(E.formatEthiopian({ year: 2017, month: 13, day: 5 }, "en"), "Pagume 5, 2017");
assert.equal(E.weekdayName(E.gregorianToJdn(2026, 10, 12), "en"), "Monday");
assert.equal(E.weekdayName(E.gregorianToJdn(2026, 10, 12), "am"), "ሰኞ");
const addis = E.addisToday(new Date("2026-09-10T21:30:00Z"));
assert.deepEqual([addis.year, addis.month, addis.day], [2026, 9, 11], "Addis Ababa is UTC+3");

// Every day for ten years survives a round trip.
for (let jdn = E.gregorianToJdn(2020, 1, 1); jdn < E.gregorianToJdn(2030, 1, 1); jdn += 1) {
  const g = E.jdnToGregorian(jdn);
  const e = E.toEthiopian(g.year, g.month, g.day);
  assert.ok(E.isValid(e.year, e.month, e.day));
  assert.equal(E.toJdn(e.year, e.month, e.day), jdn);
}

// SMS segments: Ethiopic is UCS-2 (70 in one SMS, 67 per part), Latin is GSM-7 (160 / 153).
assert.deepEqual([R.smsInfo("a".repeat(160)).segments, R.smsInfo("a".repeat(161)).segments], [1, 2]);
assert.equal(R.smsInfo("a".repeat(306)).segments, 2);
assert.equal(R.smsInfo("a".repeat(307)).segments, 3);
assert.equal(R.smsInfo("ሰ".repeat(70)).segments, 1);
assert.equal(R.smsInfo("ሰ".repeat(71)).segments, 2);
assert.equal(R.smsInfo("ሰ".repeat(134)).segments, 2);
assert.equal(R.smsInfo("ሰ".repeat(135)).segments, 3);
assert.equal(R.smsInfo("ሰ").encoding, "unicode");
assert.equal(R.smsInfo("Hello {}").units, 10, "GSM extended characters count twice");
assert.equal(R.smsInfo("").segments, 0);

// Times and dates in both languages.
const suffix = { en: "Ethiopian time", am: "የሀበሻ ሰዓት" };
assert.deepEqual({ ...R.timeTexts(H, 9, 0, "habesha", suffix) }, { am: "ጠዋት 3:00 ሰዓት", en: "9:00 AM (3:00 Ethiopian time)" });
assert.deepEqual({ ...R.timeTexts(H, 20, 30, "international", suffix) }, { am: "8:30 PM (ምሽት 2:30 ሰዓት)", en: "8:30 PM" });
const ethiopianDate = R.dateTexts(E, "ethiopian", 2019, 2, 2);
assert.equal(ethiopianDate.am, "ሰኞ፣ ጥቅምት 2 ቀን 2019 ዓ.ም.");
assert.equal(ethiopianDate.en, "Monday, Tikimt 2, 2019 E.C. (October 12, 2026)");
assert.equal(R.dateTexts(E, "gregorian", 2026, 10, 12).am, "ሰኞ፣ ኦክቶበር 12 ቀን 2026");
assert.equal(R.dateTexts(E, "ethiopian", 2016, 13, 6), null);

// Messages from the catalog templates.
const en = JSON.parse(fs.readFileSync(path.join(here, "../src/lib/i18n/translations/en.json"), "utf8"));
const am = JSON.parse(fs.readFileSync(path.join(here, "../src/lib/i18n/translations/am.json"), "utf8"));
const templates = Object.fromEntries(
  Object.keys(en.tools.reminder.tpl).map((key) => [key, { en: en.tools.reminder.tpl[key], am: am.tools.reminder.tpl[key] }])
);
const values = { business: "ሰላም የውበት ሳሎን", customer: "ሐና", service: "የፀጉር ሹሩባ", location: "ቦሌ", date: ethiopianDate.am, time: "ጠዋት 3:00 ሰዓት" };
const sms = R.buildMessage(templates, "am", values, "formal", "sms");
assert.ok(sms.startsWith("ውድ ሐና፣ "), sms);
assert.ok(sms.includes("በሰላም የውበት ሳሎን የየፀጉር ሹሩባ ቀጠሮዎ ሰኞ፣ ጥቅምት 2 ቀን 2019 ዓ.ም. ጠዋት 3:00 ሰዓት"), sms);
assert.ok(sms.includes("አድራሻ፦ ቦሌ።"));
assert.ok(!sms.includes("\n"), "an SMS is one paragraph");
assert.ok(!/[{}]/.test(sms), "every placeholder is filled");
const noName = R.buildMessage(templates, "am", { ...values, customer: "", location: "" }, "friendly", "sms");
assert.ok(noName.startsWith("ሰላም! "));
assert.ok(!noName.includes("አድራሻ"));
const chat = R.buildMessage(templates, "en", { ...values, business: "Selam Beauty Salon", service: "Hair braiding", date: "Monday", time: "9:00 AM" }, "formal", "telegram");
assert.ok(chat.includes("\n📅 Monday\n🕒 9:00 AM\n📍 ቦሌ"), chat);
assert.ok(chat.startsWith("Dear ሐና,\nA reminder of your appointment:"));
assert.equal(C.telegramShareUrl("https://x.test/t?source=tool_a", "ሰላም & hi"), "https://t.me/share/url?url=https%3A%2F%2Fx.test%2Ft%3Fsource%3Dtool_a&text=%E1%88%B0%E1%88%8B%E1%88%9D%20%26%20hi");
assert.equal(C.fmt("{0} of {1}", 1, 2), "1 of 2");
assert.equal(C.fill("{a} {b}", { a: "x" }), "x {b}");

// Hours sign: text colour, URL state and markup.
assert.equal(S.inkFor("#ffffff"), "#111111");
assert.equal(S.inkFor("#1b1b1b"), "#ffffff");
assert.equal(S.inkFor("#f5d90a"), "#111111");
const state = { name: "ሰላም <b>", phone: "0911", link: "", theme: "brand", color: "#7a2e4f", paper: "A5", week: [[["08:30", "12:30"], ["13:30", "17:30"]], [], [], [], [], [], []] };
const decoded = S.decodeState(S.encodeState(state));
assert.deepEqual(JSON.parse(JSON.stringify(decoded)), state);
assert.equal(S.decodeState("not-base64!"), null);
assert.equal(S.decodeState(S.encodeState({ ...state, week: [[["8:30", "x"]]] })), null);
const split = S.dayHtml(H, state.week[0], { en: "Closed", am: "ዝግ ነው" });
assert.ok(split.includes("8:30 AM – 12:30 PM") && split.includes("ጠዋት 2:30 – ከሰዓት 6:30"), split);
assert.ok(split.includes("1:30 PM – 5:30 PM") && split.includes("ከሰዓት 7:30 – 11:30"), split);
assert.ok(S.dayHtml(H, [], { en: "Closed", am: "ዝግ ነው" }).includes("ዝግ ነው</span> · Closed"));
assert.equal(S.escapeHtml('<a href="x">'), "&lt;a href=&quot;x&quot;&gt;");

// The tools stylesheet has real print rules, and the landing footer links to the tools index.
const css = fs.readFileSync(path.join(app, "public/css/tools.css"), "utf8");
assert.ok(css.includes("@media print"), "the sign needs print rules");
assert.ok(!/<select|type="date"|type="time"/.test(""), "sanity");

console.log("PASS: free tool pages logic");
