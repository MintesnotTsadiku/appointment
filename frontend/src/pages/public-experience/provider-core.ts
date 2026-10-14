/**
 * Pure helpers for the public provider page (`/schedule/p/<slug>`). No imports, so
 * `tests/provider-page.test.mjs` can load this file directly. See docs/growth/PROVIDER_PAGE.md.
 */

export const PROVIDER_PAGE_API = 'appointment.scheduler.provider_page.public_provider';
export const PROVIDER_ROOT = '/schedule/p/';

export type PlaceType = 'online' | 'in_person';
export type Texts = Partial<Record<'en' | 'am', string>>;

export interface ProviderPlace { name: string; address: string; location_type: PlaceType; platform: string }
export interface ProviderOffering { offering: string; path: string; duration: number; price: number; location: ProviderPlace }
export interface ProviderService {
  service: string; name: string; description: string; names?: Texts; descriptions?: Texts;
  duration: number; price: number; currency: string; offerings: ProviderOffering[];
}
export interface ProviderPageData {
  slug: string; canonical_slug: string; name: string; business_name: string; photo: string; bio: string;
  languages: string[]; timezone: string; site_slug?: string | null;
  person?: { name?: Texts; role?: Texts; image?: string; imageAlt?: Texts };
  /** The website's hero photo, for the profile card's cover; empty without a website. */
  cover?: string;
  services: ProviderService[]; locations: ProviderPlace[];
}

/** One way to book a service: a format and, when the formats alone do not tell them apart, a place. */
export interface FormatChoice { offering: string; path: string; type: PlaceType; platform: string; place: string; duration: number; price: number }

/** Text in the reader's language, else English, else the fallback. */
export function localized(texts: Texts | undefined, language: string, fallback = ''): string {
  const lang = language === 'am' ? 'am' : 'en';
  return (texts?.[lang] || texts?.en || fallback || '').trim();
}

/** "Free", or the amount with its currency code: "ETB 1,500" (Ethiopic digits are not used in prices). */
export function priceLabel(price: number, currency: string, language: string, free: string): string {
  if (!Number.isFinite(price) || price <= 0) return free;
  const amount = new Intl.NumberFormat(language === 'am' ? 'am-ET' : 'en', { maximumFractionDigits: 0 }).format(price);
  return /^[A-Z]{3}$/.test(currency) ? `${currency} ${amount}` : amount;
}

/** Where a place meets, for a badge: the online label with its platform, or the place name. */
export function formatLabel(place: Pick<ProviderPlace, 'location_type' | 'platform' | 'name'>, online: string, onlineWith: string, inPerson: string): string {
  if (place.location_type === 'online') {
    const platform = (place.platform || '').trim();
    return platform ? onlineWith.replace('{0}', platform) : online;
  }
  return inPerson;
}

/** The ways to book one service, oldest offering first. A place name is kept only when two choices share a format and platform. */
export function groupFormats(service: Pick<ProviderService, 'offerings'>): FormatChoice[] {
  const key = (row: ProviderOffering) => `${row.location.location_type}|${(row.location.platform || '').trim().toLowerCase()}`;
  const counts = new Map<string, number>();
  for (const row of service.offerings) counts.set(key(row), (counts.get(key(row)) || 0) + 1);
  return service.offerings.map((row) => ({
    offering: row.offering, path: row.path, type: row.location.location_type, platform: row.location.platform || '',
    place: (counts.get(key(row)) || 0) > 1 ? row.location.name : '', duration: row.duration, price: row.price,
  }));
}

/** The distinct formats of a service, online first, for its badges. */
export function serviceFormats(service: Pick<ProviderService, 'offerings'>): PlaceType[] {
  const types = new Set(service.offerings.map((row) => row.location.location_type));
  return (['online', 'in_person'] as PlaceType[]).filter((type) => types.has(type));
}

/** The scheduler of one offering on the provider page, keeping `?source=` and `?ref=` from the page address. */
export function offeringPath(slug: string, offering: string, search = ''): string {
  const params = new URLSearchParams(search);
  const kept = new URLSearchParams();
  for (const name of ['source', 'ref']) {
    const value = params.get(name);
    if (value) kept.set(name, value);
  }
  const query = kept.toString();
  return `${PROVIDER_ROOT}${encodeURIComponent(slug)}/${encodeURIComponent(offering)}${query ? `?${query}` : ''}`;
}

/** Up to two initials for an avatar without a photo; Ethiopic names keep their first letter. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : [words[0]];
  return letters.map((word) => Array.from(word)[0]).join('').toUpperCase();
}

/** The native name of each spoken language code the page shows as a chip. */
export const LANGUAGE_NAMES: Record<string, string> = {
  am: 'አማርኛ', en: 'English', om: 'Afaan Oromoo', ti: 'ትግርኛ', so: 'Soomaali', ar: 'العربية', fr: 'Français',
};
