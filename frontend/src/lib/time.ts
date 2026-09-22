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
 * only the presentation changes with `format` and `timeZone`.
 */
export function formatInstant(
  instant: Date | string,
  format: ClockFormat,
  timeZone?: string
): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) return '';
  if (format === 'ethiopian') {
    const { hour, minute } = wallPartsInZone(date, timeZone);
    return toEthiopian(hour, minute).label;
  }
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h',
    timeZone,
  }).format(date);
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
