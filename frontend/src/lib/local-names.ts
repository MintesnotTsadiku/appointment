/**
 * Names in the language of the page. Public APIs send a business's and a provider's name as
 * `{en, am}` next to the plain English field (`appointment.scheduler.localized_names`); a page shows
 * its own language, else the other one, else the plain field. Pure logic, tested by
 * `tests/local-names.test.mjs`.
 */

export type LocalNames = { en?: string; am?: string } | null | undefined;

/** The name in `language`, else the other language, else `fallback`. */
export function localName(names: LocalNames, language: string, fallback = ""): string {
  const first = language === "am" ? names?.am : names?.en;
  const second = language === "am" ? names?.en : names?.am;
  return (first || "").trim() || (fallback || "").trim() || (second || "").trim();
}

/**
 * Booking pages and messages that always showed one English field (manage booking, My bookings): the Amharic
 * name on Amharic pages when there is one, else that field unchanged.
 */
export function amharicOr(names: LocalNames, language: string, plain: string | null | undefined): string {
  return (language === "am" && names?.am?.trim()) || (plain || "").trim() || localName(names, language);
}

/**
 * A place in the page language. Public APIs send `local_location_name` and `local_address` as `{en, am}` next to
 * the place's name (`location_name`, or `name` on independent pages) and `address`. An online place keeps no address.
 */
export type Place = {
  name?: string; location_name?: string; address?: string;
  local_location_name?: LocalNames; local_address?: LocalNames; [key: string]: unknown;
};

export function localizePlace<T extends Place | null | undefined>(place: T, language: string): T {
  if (!place || (!place.local_location_name && !place.local_address)) return place;
  const key = "location_name" in place ? "location_name" : "name";
  return {
    ...place,
    [key]: localName(place.local_location_name, language, place[key] as string | undefined),
    ...(place.address ? { address: localName(place.local_address, language, place.address) } : {}),
  } as T;
}

/** The website name on Amharic pages: the published Amharic title, else the design's name. */
export function siteName(applicationName: string, amharic: string | null | undefined, locale: string): string {
  return locale === "am" && amharic?.trim() ? amharic.trim() : applicationName;
}

type Provider = { name?: string; local_name?: LocalNames; [key: string]: unknown };
type Payload = {
  company?: string; full_name?: string; description?: string;
  local_company?: LocalNames; local_business_description?: LocalNames;
  providers?: Provider[];
  services?: Array<{ provider_name?: string; provider_local_name?: LocalNames; [key: string]: unknown }>;
  offerings?: Array<{ provider?: Provider | null; location?: Place | null; [key: string]: unknown }>;
  location?: Place | null;
  [key: string]: unknown;
};

const provider = <T extends Provider | null | undefined>(row: T, language: string): T =>
  (row && row.local_name ? { ...row, name: localName(row.local_name, language, row.name) } : row);

/**
 * The organization scheduler's answer (`get_organization_services`, `get_organization_meeting_windows`)
 * with every business, provider and place name (and address) in `language`. Rows without Amharic names keep their fields.
 */
export function localizeBookingPayload<T extends Payload | null | undefined>(message: T, language: string): T {
  if (!message || typeof message !== "object") return message;
  const company = message.local_company ? localName(message.local_company, language, message.company) : message.company;
  return {
    ...message,
    ...(message.company !== undefined || message.local_company ? { company } : {}),
    ...(message.local_company && message.full_name !== undefined ? { full_name: localName(message.local_company, language, message.full_name) } : {}),
    ...(message.local_business_description ? { description: localName(message.local_business_description, language, message.description) } : {}),
    ...(Array.isArray(message.providers) ? { providers: message.providers.map((row) => provider(row, language)) } : {}),
    ...(Array.isArray(message.services) ? {
      services: message.services.map((row) => row.provider_local_name ? { ...row, provider_name: localName(row.provider_local_name, language, row.provider_name) } : row),
    } : {}),
    ...(Array.isArray(message.offerings) ? {
      offerings: message.offerings.map((row) => ({ ...row, provider: provider(row.provider, language), ...(row.location ? { location: localizePlace(row.location, language) } : {}) })),
    } : {}),
    ...(message.location ? { location: localizePlace(message.location, language) } : {}),
  };
}
