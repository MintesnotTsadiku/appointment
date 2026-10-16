/**
 * Ethiopian holiday moments: which holiday is near a date in Addis Ababa. Pure.
 *
 * The Ethiopian calendar conversion is in `src/lib/ethiopian-calendar.ts` (the twin of
 * `appointment/growth/ethiopian_calendar.py` and `public/js/tools/ethiopian-calendar.js`, tested with the
 * same vectors). The kit re-exports it, so template packages still import only the kit.
 *
 * Holidays with a fixed Ethiopian or Julian date only, so every date is computed, never looked up:
 * - Enkutatash (New Year): Meskerem 1 (11 September, 12 September before a Gregorian leap year).
 * - Meskel (Finding of the True Cross): Meskerem 17 (27 or 28 September). Demera is the eve.
 * - Genna (Christmas): 25 December of the Julian calendar (7 January from 1901 to 2099).
 * - Timket (Epiphany): Tir 11 (19 January, 20 January in a Gregorian leap year). Ketera is the eve.
 * - Adwa Victory Day: Yekatit 23 (2 March).
 * Eid al-Fitr and Eid al-Adha are left out on purpose: their dates follow the moon sighting that the
 * Ethiopian Islamic Affairs Supreme Council announces, and no calculation gives that date reliably.
 */
import {
  ethiopianToJdn, gregorianToJdn, isoDate, jdnToEthiopian, jdnToGregorian, julianToJdn, type CalendarDate,
} from "../../../../lib/ethiopian-calendar";

export {
  ethiopianToJdn, gregorianToJdn, isEthiopianLeap, isoDate, jdnToEthiopian, jdnToGregorian, julianToJdn, parseIsoDate,
  toEthiopian, toGregorian, type CalendarDate,
} from "../../../../lib/ethiopian-calendar";

export type HolidayKey = "enkutatash" | "meskel" | "genna" | "timket" | "adwa";

export const HOLIDAY_KEYS: readonly HolidayKey[] = ["enkutatash", "meskel", "genna", "timket", "adwa"];

/** The greeting of each holiday in Ge'ez script. English pages show it beside the English greeting. */
export const HOLIDAY_GEEZ: Readonly<Record<HolidayKey, string>> = {
  enkutatash: "መልካም አዲስ ዓመት",
  meskel: "መልካም የመስቀል በዓል",
  genna: "መልካም ገና",
  timket: "መልካም የጥምቀት በዓል",
  adwa: "የዓድዋ ድል በዓል",
};

/** Days before and after the holiday when its moment shows. */
export const HOLIDAY_WINDOWS: Readonly<Record<HolidayKey, { before: number; after: number }>> = {
  enkutatash: { before: 3, after: 3 },
  meskel: { before: 2, after: 1 },
  genna: { before: 2, after: 2 },
  timket: { before: 1, after: 2 },
  adwa: { before: 1, after: 1 },
};

/** Fixed Ethiopian (month, day) of the holidays that follow the Ethiopian calendar. */
const ETHIOPIAN_DAYS: Partial<Record<HolidayKey, [number, number]>> = {
  enkutatash: [1, 1],
  meskel: [1, 17],
  timket: [5, 11],
  adwa: [6, 23],
};

/** The year of the Battle of Adwa (1 March 1896, Julian 18 February; celebrated on 2 March). */
const ADWA_YEAR = 1896;

export interface Holiday {
  key: HolidayKey;
  /** The holiday's Gregorian date. */
  date: string;
  /** The holiday's Ethiopian date. */
  ethiopian: CalendarDate;
  /** Days from the holiday to the date asked about: negative before it, 0 on the day, positive after. */
  offset: number;
  /** Enkutatash: the new Ethiopian year. Adwa: the anniversary. Otherwise the Ethiopian year. */
  count: number;
}

/** The JDN of a holiday that falls in or next to the Ethiopian year `year`. */
function holidayJdns(key: HolidayKey, around: number): number[] {
  const fixed = ETHIOPIAN_DAYS[key];
  if (fixed) {
    const { year } = jdnToEthiopian(around);
    return [year - 1, year, year + 1].map((value) => ethiopianToJdn({ year: value, month: fixed[0], day: fixed[1] }));
  }
  // Genna: 25 December in the Julian calendar, in the Julian years around the date.
  const { year } = jdnToGregorian(around);
  return [year - 1, year, year + 1].map((value) => julianToJdn({ year: value, month: 12, day: 25 }));
}

function describe(key: HolidayKey, jdn: number, offset: number): Holiday {
  const gregorian = jdnToGregorian(jdn);
  const ethiopian = jdnToEthiopian(jdn);
  return { key, date: isoDate(gregorian), ethiopian, offset, count: key === "adwa" ? gregorian.year - ADWA_YEAR : ethiopian.year };
}

/** Every holiday whose window holds `date`, nearest first. */
export function holidaysOn(date: CalendarDate): Holiday[] {
  const day = gregorianToJdn(date);
  const found: Holiday[] = [];
  for (const key of HOLIDAY_KEYS) {
    const span = HOLIDAY_WINDOWS[key];
    for (const jdn of holidayJdns(key, day)) {
      const offset = day - jdn;
      if (offset >= -span.before && offset <= span.after) found.push(describe(key, jdn, offset));
    }
  }
  return found.sort((a, b) => Math.abs(a.offset) - Math.abs(b.offset));
}

/** The holiday moment for a date in Addis Ababa, or null on any other day. */
export function activeHoliday(date: CalendarDate): Holiday | null {
  return holidaysOn(date)[0] || null;
}

/** The next occurrence (on or after `date`) of a holiday; used to preview a moment. */
export function nextHoliday(key: HolidayKey, date: CalendarDate): Holiday {
  const day = gregorianToJdn(date);
  const jdn = holidayJdns(key, day).find((value) => value >= day) ?? holidayJdns(key, day + 366).find((value) => value >= day)!;
  return describe(key, jdn, 0);
}

/** The text of a holiday greeting as chrome keys and values; the template sets it in its own type. */
export interface HolidayGreeting {
  key: HolidayKey;
  /** `aria-label` of the moment. */
  label: "holiday.label";
  /** The greeting, for example "Happy New Year". */
  title: `holiday.${HolidayKey}`;
  /** The line under it; `{count}` is the year or the anniversary. */
  line: `holiday.${HolidayKey}Line`;
  values: { count: number };
  /** The greeting in Ge'ez script, for English pages; null on Amharic pages (the title is already Amharic). */
  geez: string | null;
}

/**
 * The text of a holiday moment without a drawing. A template that declares `holiday: "greeting"`
 * sets this as a typographic line in its own style; a template with a decoration can use it too.
 */
export function holidayGreeting(holiday: Holiday, locale: string): HolidayGreeting {
  return {
    key: holiday.key,
    label: "holiday.label",
    title: `holiday.${holiday.key}`,
    line: `holiday.${holiday.key}Line`,
    values: { count: holiday.count },
    geez: locale === "am" ? null : HOLIDAY_GEEZ[holiday.key],
  };
}

export function isHolidayKey(value: unknown): value is HolidayKey {
  return typeof value === "string" && (HOLIDAY_KEYS as readonly string[]).includes(value);
}

/** Today's calendar date in a time zone (Addis Ababa by default). */
export function dateIn(now: Date, timeZone = "Africa/Addis_Ababa"): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day") };
}
