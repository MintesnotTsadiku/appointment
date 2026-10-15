/**
 * The Ethiopian calendar: the date conversion, month names, month lengths, a month grid and dates in
 * words. Pure: no React, no DOM.
 *
 * The conversion is the twin of `appointment/growth/ethiopian_calendar.py` and
 * `public/js/tools/ethiopian-calendar.js`: both directions go through the Julian Day Number (JDN), and
 * all three are tested with the shared vectors (`appointment/growth/vectors/ethiopian_calendar.json`).
 * The booking pages use it directly; the template kit re-exports it (`templates/kit/core/holidays.ts`).
 *
 * Dates in and out of the `Date` helpers are local `Date` objects at midnight, the convention of the
 * booking picker. The API and the stored values stay Gregorian.
 */

/** JDN of the day before Meskerem 1, year 1 (Amete Mihret era), as in the Python twin. */
const EPOCH = 1723856;

export interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const div = (a: number, b: number) => Math.floor(a / b);

export function isEthiopianLeap(year: number): boolean {
  return ((year % 4) + 4) % 4 === 3;
}

export function ethiopianToJdn({ year, month, day }: CalendarDate): number {
  return EPOCH + 365 + 365 * (year - 1) + div(year, 4) + 30 * month + day - 31;
}

export function jdnToEthiopian(jdn: number): CalendarDate {
  const cycle = div(jdn - EPOCH, 1461);
  const rest = jdn - EPOCH - cycle * 1461;
  const year = 4 * cycle + div(rest, 365) - div(rest, 1460);
  const dayOfYear = (rest % 365) + 365 * div(rest, 1460);
  return { year, month: div(dayOfYear, 30) + 1, day: (dayOfYear % 30) + 1 };
}

export function gregorianToJdn({ year, month, day }: CalendarDate): number {
  const a = div(14 - month, 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + div(153 * m + 2, 5) + 365 * y + div(y, 4) - div(y, 100) + div(y, 400) - 32045;
}

export function jdnToGregorian(jdn: number): CalendarDate {
  const a = jdn + 32044;
  const b = div(4 * a + 3, 146097);
  const c = a - div(146097 * b, 4);
  const d = div(4 * c + 3, 1461);
  const e = c - div(1461 * d, 4);
  const m = div(5 * e + 2, 153);
  return { year: 100 * b + d - 4800 + div(m, 10), month: m + 3 - 12 * div(m, 10), day: e - div(153 * m + 2, 5) + 1 };
}

/** JDN of a date in the Julian calendar (for Genna, 25 December Julian). */
export function julianToJdn({ year, month, day }: CalendarDate): number {
  const a = div(14 - month, 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + div(153 * m + 2, 5) + 365 * y + div(y, 4) - 32083;
}

export function toEthiopian(date: CalendarDate): CalendarDate {
  return jdnToEthiopian(gregorianToJdn(date));
}

export function toGregorian(date: CalendarDate): CalendarDate {
  return jdnToGregorian(ethiopianToJdn(date));
}

/** "2026-09-11" as a calendar date, or null. */
export function parseIsoDate(value: string | null | undefined): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const back = jdnToGregorian(gregorianToJdn(date));
  return back.year === date.year && back.month === date.month && back.day === date.day ? date : null;
}

export function isoDate({ year, month, day }: CalendarDate): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Month names: Amharic and the usual English transliteration, the same as the Python and JavaScript twins. Month 13 is Pagume. */
export const ETHIOPIAN_MONTHS: ReadonlyArray<readonly [string, string]> = [
  ["መስከረም", "Meskerem"], ["ጥቅምት", "Tikimt"], ["ኅዳር", "Hidar"], ["ታኅሣሥ", "Tahsas"],
  ["ጥር", "Tir"], ["የካቲት", "Yekatit"], ["መጋቢት", "Megabit"], ["ሚያዝያ", "Miyazya"],
  ["ግንቦት", "Ginbot"], ["ሰኔ", "Sene"], ["ሐምሌ", "Hamle"], ["ነሐሴ", "Nehase"], ["ጳጉሜ", "Pagume"],
];

/** Weekday names, Sunday first: Amharic and English. */
export const ETHIOPIAN_WEEKDAYS: ReadonlyArray<readonly [string, string]> = [
  ["እሑድ", "Sunday"], ["ሰኞ", "Monday"], ["ማክሰኞ", "Tuesday"], ["ረቡዕ", "Wednesday"],
  ["ሐሙስ", "Thursday"], ["ዓርብ", "Friday"], ["ቅዳሜ", "Saturday"],
];

export interface EthiopianMonth {
  year: number;
  /** 1 to 13. */
  month: number;
}

/** Thirty days, or five (six in a leap year) for Pagume. */
export function daysInEthiopianMonth(year: number, month: number): number {
  return month === 13 ? (isEthiopianLeap(year) ? 6 : 5) : 30;
}

/** The Ethiopian date of a local calendar day. */
export function ethiopianOf(date: Date): CalendarDate {
  return toEthiopian({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() });
}

/** The local `Date` (midnight) of an Ethiopian date. */
export function fromEthiopian(date: CalendarDate): Date {
  const gregorian = toGregorian(date);
  return new Date(gregorian.year, gregorian.month - 1, gregorian.day);
}

/** The month after (or before, with a negative step) an Ethiopian month. */
export function shiftEthiopianMonth({ year, month }: EthiopianMonth, step: number): EthiopianMonth {
  const index = year * 13 + (month - 1) + step;
  return { year: Math.floor(index / 13), month: (((index % 13) + 13) % 13) + 1 };
}

export function monthName(month: number, language: string): string {
  const names = ETHIOPIAN_MONTHS[month - 1];
  return names ? names[language === "am" ? 0 : 1] : "";
}

/** "ጥቅምት 2019" or "Tikimt 2019". */
export function ethiopianMonthLabel({ year, month }: EthiopianMonth, language: string): string {
  return `${monthName(month, language)} ${year}`;
}

/**
 * The weeks of an Ethiopian month, Sunday first, as local dates. The first and last weeks are filled
 * with the days of the months around it, as in the Gregorian grid.
 */
export function ethiopianMonthGrid(view: EthiopianMonth): Date[][] {
  const first = fromEthiopian({ year: view.year, month: view.month, day: 1 });
  const length = daysInEthiopianMonth(view.year, view.month);
  const start = new Date(first.getFullYear(), first.getMonth(), first.getDate() - first.getDay());
  const cells = first.getDay() + length;
  const count = Math.ceil(cells / 7) * 7;
  const days = Array.from({ length: count }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
  return Array.from({ length: count / 7 }, (_, week) => days.slice(week * 7, week * 7 + 7));
}

export interface EthiopianDateOptions {
  weekday?: "long" | "short" | "none";
  year?: boolean;
}

/**
 * An Ethiopian date in words.
 * Amharic: "ሐሙስ፣ ጥቅምት 5 ቀን 2019" (short weekday: "ሐሙስ፣ ጥቅምት 5"). English: "Thursday, Tikimt 5, 2019".
 */
export function formatEthiopianDate(date: Date | CalendarDate, language: string, options: EthiopianDateOptions = {}): string {
  const local = date instanceof Date ? date : fromEthiopian(date);
  const ethiopian = date instanceof Date ? ethiopianOf(date) : date;
  const withYear = options.year ?? true;
  const weekdayStyle = options.weekday ?? "long";
  const am = language === "am";
  const [weekdayAm, weekdayEn] = ETHIOPIAN_WEEKDAYS[local.getDay()];
  const weekday = weekdayStyle === "none" ? "" : am ? weekdayAm : weekdayStyle === "short" ? weekdayEn.slice(0, 3) : weekdayEn;
  const month = monthName(ethiopian.month, language);
  if (am) {
    const day = `${month} ${ethiopian.day}${withYear ? ` ቀን ${ethiopian.year}` : ""}`;
    return weekday ? `${weekday}፣ ${day}` : day;
  }
  const day = `${month} ${ethiopian.day}${withYear ? `, ${ethiopian.year}` : ""}`;
  return weekday ? `${weekday}, ${day}` : day;
}

/** The calendar day of an instant in a time zone, as a local `Date` at midnight. */
export function dayInZone(instant: Date | string, timeZone?: string): Date {
  const value = typeof instant === "string" ? new Date(instant) : instant;
  if (!timeZone) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return new Date(part("year"), part("month") - 1, part("day"));
}

/**
 * The day of a booking in words for the summary and the confirmation: the Ethiopian date with Habesha
 * time ("ሐሙስ፣ ጥቅምት 5 ቀን 2019"), else the full Gregorian date in the page locale.
 */
export function formatBookingDay(date: Date, language: string, locale: string, clock: string): string {
  if (clock === "ethiopian") return formatEthiopianDate(date, language);
  return new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date);
}
