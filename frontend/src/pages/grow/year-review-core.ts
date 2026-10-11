/**
 * Pure helpers for the Year in review section. No imports, so
 * `tests/growth-showoff.test.mjs` can load this file directly.
 */

export interface YearReviewStats {
  bookings: number;
  clients: number;
  new_clients?: number;
  returning_rate?: number;
  busiest_day?: { weekday: number; count: number };
  busiest_hour?: { hour: number; count: number };
  top_service?: { name: string; count: number; share: number };
  top_provider?: { name: string; count: number };
  amharic_share?: number;
}

export interface ReviewTile {
  key: string;
  label: string;
  value: string;
  note?: string;
}

export const IMAGE_API = '/api/method/appointment.growth.year_review.image';
export const REVIEW_SOURCE = 'year_review';

/** `t` returns the catalog text for a key under `staff.grow.yearReview.`. */
type Translate = (key: string) => string;

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));

export function formatNumber(value: number, language: string): string {
  return new Intl.NumberFormat(language === 'am' ? 'am-ET' : 'en-US').format(value);
}

/** Python weekday (Monday = 0) as a long weekday name in the language. */
export function weekdayName(weekday: number, language: string): string {
  // 2024-01-01 was a Monday.
  const date = new Date(Date.UTC(2024, 0, 1 + weekday, 12));
  return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', { weekday: 'long', timeZone: 'UTC' }).format(date);
}

const HABESHA_PERIODS: Array<[number, string]> = [[6, 'ሌሊት'], [12, 'ጠዋት'], [18, 'ከሰዓት'], [24, 'ምሽት']];

/** "10 AM" in English; the Habesha clock ("ጠዋት 4:00") in Amharic, as the app does. */
export function hourLabel(hour: number, language: string): string {
  if (language === 'am') {
    const period = HABESHA_PERIODS.find(([limit]) => hour < limit)?.[1] ?? '';
    return `${period} ${(hour - 6 + 24) % 12 || 12}:00`;
  }
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
}

/** The stat tiles shown for a review, in the same order as the image. Missing stats are skipped. */
export function reviewTiles(stats: YearReviewStats, language: string, t: Translate): ReviewTile[] {
  const n = (value: number) => formatNumber(value, language);
  const tiles: ReviewTile[] = [
    { key: 'clients', label: t('clients'), value: n(stats.clients) },
    { key: 'bookings', label: t('bookings'), value: n(stats.bookings) },
  ];
  if (stats.new_clients != null) tiles.push({ key: 'new_clients', label: t('newClients'), value: n(stats.new_clients) });
  if (stats.returning_rate != null) tiles.push({ key: 'returning_rate', label: t('returning'), value: `${stats.returning_rate}%`, note: t('returningNote') });
  if (stats.busiest_day) tiles.push({ key: 'busiest_day', label: t('busiestDay'), value: weekdayName(stats.busiest_day.weekday, language) });
  if (stats.busiest_hour) {
    const other = language === 'am' ? hourLabel(stats.busiest_hour.hour, 'en') : undefined;
    tiles.push({ key: 'busiest_hour', label: t('busiestHour'), value: hourLabel(stats.busiest_hour.hour, language), note: other });
  }
  if (stats.top_service) tiles.push({ key: 'top_service', label: t('topService'), value: stats.top_service.name, note: fill(t('shareOfBookings'), { share: stats.top_service.share }) });
  if (stats.top_provider) tiles.push({ key: 'top_provider', label: t('topProvider'), value: stats.top_provider.name, note: fill(t('providerBookings'), { count: n(stats.top_provider.count) }) });
  if (stats.amharic_share != null) tiles.push({ key: 'amharic_share', label: t('amharicShare'), value: `${stats.amharic_share}%` });
  return tiles;
}

export function imageUrl(business: string, period: string, language: string, size: 'portrait' | 'story'): string {
  const query = new URLSearchParams({ business, period, lang: language, size });
  return `${IMAGE_API}?${query.toString()}`;
}

/** `url` with `?source=` set; other query values are kept. */
export function withSource(url: string, source: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('source', source);
    return parsed.toString();
  } catch {
    return url;
  }
}

export function telegramShareUrl(url: string, text: string): string {
  const query = new URLSearchParams({ url, text });
  return `https://t.me/share/url?${query.toString()}`;
}

export function fillText(text: string, values: Record<string, string | number>): string {
  return fill(text, values);
}
