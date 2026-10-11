/**
 * The landing page promise ("free to start", "live in N minutes", "Amharic everywhere")
 * reads its numbers from the server (`appointment.growth.marketing.public_offer`).
 * Pure helpers, no imports, so `tests/landing-world.test.mjs` can load this file directly.
 */

export const OFFER_API = "/api/method/appointment.growth.marketing.public_offer";

export type FreeKind = "no_fee" | "free_allowance" | "free_setup";

export interface LandingOffer {
  free: FreeKind;
  freeBookings: number;
  liveMinutes: number;
  /** False until the server answered; the page then shows the most careful wording. */
  loaded: boolean;
}

const FREE_KINDS: FreeKind[] = ["no_fee", "free_allowance", "free_setup"];

/**
 * Turn the server answer into the landing shape. Anything missing or odd falls back to
 * "free_setup", the claim that is true for every configuration.
 */
export function parseOffer(raw: unknown, fallbackMinutes: number): LandingOffer {
  const value = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kind = FREE_KINDS.includes(value.free as FreeKind) ? (value.free as FreeKind) : "free_setup";
  const freeBookings = wholeNumber(value.free_bookings);
  const minutes = wholeNumber(value.live_minutes) || wholeNumber(fallbackMinutes) || 5;
  return {
    free: kind === "free_allowance" && !freeBookings ? "free_setup" : kind,
    freeBookings: kind === "free_allowance" ? freeBookings : 0,
    liveMinutes: minutes,
    loaded: Boolean(raw && typeof raw === "object"),
  };
}

/** The catalog key for the "free" detail sentence. */
export function freeDetailKey(offer: LandingOffer): string {
  if (offer.free === "no_fee") return "world.promise.freeNoFee";
  if (offer.free === "free_allowance") return "world.promise.freeAllowance";
  return "world.promise.freeSetup";
}

/** Replace `{name}` placeholders, e.g. `fill("Live in {minutes} minutes", { minutes: 5 })`. */
export function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [name, value]) => text.split(`{${name}}`).join(String(value)), template);
}

/** The partners page in the visitor's language. */
export function partnersPath(language: string): string {
  return language.startsWith("am") ? "/am/partners" : "/partners";
}

function wholeNumber(value: unknown): number {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : 0;
}
