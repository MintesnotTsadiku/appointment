/**
 * Shared clock-format helpers.
 *
 * Two distinct concepts are kept apart:
 *  - clock format: 12-hour, 24-hour or Ethiopian local time display
 *  - time zone: the IANA zone an instant is rendered in
 *
 * Ethiopian local time is a display convention only: it counts the day from
 * 06:00 (standard 06:00 -> 12:00 Ethiopian) and adds a period label
 * (ሌሊት night, ጠዋት morning, ከሰዓት afternoon, ምሽት evening). Switching the clock
 * format never changes the represented instant or stored value.
 */
export type ClockFormat = '12h' | '24h' | 'ethiopian';

export interface EthiopianTime {
  hour: number;
  minute: number;
  period: string;
  label: string;
}

const ETHIOPIAN_PERIODS = {
  night: 'ሌሊት',
  morning: 'ጠዋት',
  afternoon: 'ከሰዓት',
  evening: 'ምሽት',
} as const;

export function ethiopianPeriod(hour24: number): string {
  if (hour24 < 6) return ETHIOPIAN_PERIODS.night;
  if (hour24 < 12) return ETHIOPIAN_PERIODS.morning;
  if (hour24 < 18) return ETHIOPIAN_PERIODS.afternoon;
  return ETHIOPIAN_PERIODS.evening;
}

/**
 * Convert a 24-hour wall clock reading to Ethiopian local time.
 * Verified boundaries: 06:00 -> 12:00 ጠዋት, 12:00 -> 6:00 ከሰዓት,
 * 18:00 -> 12:00 ምሽት, 00:00 -> 6:00 ሌሊት, 23:59 -> 5:59 ምሽት.
 */
export function toEthiopian(hour24: number, minute: number): EthiopianTime {
  let hour = hour24 - 6;
  if (hour < 0) hour += 12;
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  const period = ethiopianPeriod(hour24);
  return {
    hour,
    minute,
    period,
    label: `ሰዓት ${hour}:${String(minute).padStart(2, '0')} ${period}`,
  };
}

/**
 * How much an English page says about a Habesha time:
 *  - compact: "6:00 afternoon" (slot buttons)
 *  - phrase: "6:00 in the afternoon" (the "Your time" bar)
 *  - full: "6:00 in the afternoon (Habesha time)" (the summary and the confirmation)
 * Amharic pages always show "ሰዓት 6:00 ከሰዓት".
 */
export type HabeshaStyle = 'compact' | 'phrase' | 'full';

/** English words for the periods, as the free time converter says them (morning, afternoon, evening, night). */
const ENGLISH_PERIODS: Record<string, readonly [string, string]> = {
  [ETHIOPIAN_PERIODS.night]: ['night', 'at night'],
  [ETHIOPIAN_PERIODS.morning]: ['morning', 'in the morning'],
  [ETHIOPIAN_PERIODS.afternoon]: ['afternoon', 'in the afternoon'],
  [ETHIOPIAN_PERIODS.evening]: ['evening', 'in the evening'],
};

/**
 * A Habesha time in the page language: Amharic "ሰዓት 6:00 ከሰዓት", English "6:00 in the afternoon (Habesha time)"
 * (see `HabeshaStyle`). Any language other than Amharic gets the English words.
 */
export function habeshaLabel(hour24: number, minute: number, language: string, style: HabeshaStyle = 'compact'): string {
  const local = toEthiopian(hour24, minute);
  if (language === 'am') return local.label;
  const [word, phrase] = ENGLISH_PERIODS[local.period];
  const time = `${local.hour}:${String(minute).padStart(2, '0')}`;
  if (style === 'compact') return `${time} ${word}`;
  return style === 'full' ? `${time} ${phrase} (Habesha time)` : `${time} ${phrase}`;
}

/** Parse a stored 24-hour `HH:MM` value; returns null when malformed. */
export function parseWallTime(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value || '').trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatWallTime(value: string, format: ClockFormat): string {
  const parsed = parseWallTime(value);
  if (!parsed) return value || '';
  if (format === '24h') return `${String(parsed.hour).padStart(2, '0')}:${String(parsed.minute).padStart(2, '0')}`;
  if (format === 'ethiopian') return toEthiopian(parsed.hour, parsed.minute).label;
  const period = parsed.hour >= 12 ? 'PM' : 'AM';
  const hour12 = parsed.hour % 12 === 0 ? 12 : parsed.hour % 12;
  return `${hour12}:${String(parsed.minute).padStart(2, '0')} ${period}`;
}

/** Wall-clock parts of an instant in a given IANA zone. */
export function wallPartsInZone(
  instant: Date | string,
  timeZone?: string
): { hour: number; minute: number } {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return { hour: 0, minute: 0 };
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { hour: read('hour') % 24, minute: read('minute') };
}

/**
 * Format an instant for display. The instant and its storage are untouched;
 * only the presentation changes with `format` and `timeZone`. Public booking pages pass
 * `habesha` with the page language, so English pages say Habesha time in English.
 */
export function formatInstant(
  instant: Date | string,
  format: ClockFormat,
  timeZone?: string,
  habesha?: { language: string; style?: HabeshaStyle }
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return '';
  if (format === 'ethiopian') {
    const { hour, minute } = wallPartsInZone(date, timeZone);
    // Without a page language (staff screens): the Amharic label.
    return habesha ? habeshaLabel(hour, minute, habesha.language, habesha.style) : toEthiopian(hour, minute).label;
  }
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
    timeZone,
  }).format(date);
}

/**
 * A local date and time for a picker or label: the locale's medium date, then the
 * time in `format`. Ethiopian time is built here because Intl has no such clock;
 * other formats keep the locale's own short time.
 */
export function formatLocalDateTime(date: Date, locale: string, format: ClockFormat): string {
  if (Number.isNaN(date.getTime())) return '';
  if (format !== 'ethiopian') {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
  const day = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  return `${day}, ${toEthiopian(date.getHours(), date.getMinutes()).label}`;
}

/** Validate a same-day opening window (overnight hours are not supported). */
export function validateWindow(opensAt: string, closesAt: string): string | null {
  const open = parseWallTime(opensAt);
  const close = parseWallTime(closesAt);
  if (!open || !close) return 'Enter valid opening and closing times.';
  if (open.hour * 60 + open.minute >= close.hour * 60 + close.minute) {
    return 'Closing time must be after opening time on the same day.';
  }
  return null;
}

/** Strict display-to-storage conversion. A period is required outside 24h. */
export function parseDisplayTime(input: string, format: ClockFormat): string | null {
  const text = input.trim();
  const stored = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  if (format === '24h') {
    const parts = parseWallTime(text);
    return parts ? stored(parts.hour, parts.minute) : null;
  }
  if (format === '12h') {
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(text);
    if (!match || +match[1] < 1 || +match[1] > 12 || +match[2] > 59) return null;
    return stored((+match[1] % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0), +match[2]);
  }
  const match = /^(?:ሰዓት\s*)?(\d{1,2}):(\d{2})\s+(ጠዋት|ከሰዓት|ምሽት|ማታ|ሌሊት|ለሊት)$/.exec(text);
  if (!match || +match[1] < 1 || +match[1] > 12 || +match[2] > 59) return null;
  const period = match[3].replace('ማታ', 'ምሽት').replace('ለሊት', 'ሌሊት');
  // Match the same display mapping used for output; impossible hour/period
  // combinations are rejected rather than guessed into another part of day.
  for (let hour = 0; hour < 24; hour++) {
    const local = toEthiopian(hour, +match[2]);
    if (local.hour === +match[1] && local.period === period) return stored(hour, +match[2]);
  }
  return null;
}

/**
 * The clock a customer sees for a language. Amharic screens show Ethiopian local
 * time with its period (ጠዋት, ከሰዓት, ምሽት, ሌሊት), like the staff screens and the
 * Amharic notifications; other languages keep the chosen clock.
 */
export function clockForLanguage(language: string, chosen: ClockFormat): ClockFormat {
  return language === 'am' ? 'ethiopian' : chosen;
}

/** The city part of an IANA zone: `Africa/Addis_Ababa` -> `Addis_Ababa`. */
export function zoneCityKey(timeZone: string): string {
  const parts = (timeZone || '').split('/').filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/** The localised generic zone name from Intl, e.g. "East Africa Time" / "የምስራቅ አፍሪካ ሰዓት". */
export function genericZoneName(timeZone: string, locale: string): string {
  try {
    const part = new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'longGeneric' })
      .formatToParts(new Date())
      .find((item) => item.type === 'timeZoneName');
    return part?.value || timeZone;
  } catch {
    return timeZone;
  }
}

/**
 * A friendly label for an IANA zone, e.g. "Addis Ababa time" / "የአዲስ አበባ ሰዓት".
 * `cityName` returns the city in the page language or null when it has no translation;
 * `pattern` is the translated "{0} time". Zones without a city fall back to the Intl name.
 */
export function zoneLabel(
  timeZone: string,
  language: string,
  pattern: string,
  cityName: (key: string) => string | null
): string {
  const key = zoneCityKey(timeZone);
  if (!key) return timeZone ? genericZoneName(timeZone, language === 'am' ? 'am-ET' : 'en-US') : '';
  const city = cityName(key) ?? (language === 'am' ? null : key.replace(/_/g, ' '));
  if (!city) return genericZoneName(timeZone, 'am-ET');
  return pattern.replace('{0}', city);
}
