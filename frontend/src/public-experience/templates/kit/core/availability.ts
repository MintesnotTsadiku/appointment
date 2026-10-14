/**
 * The guest next-availability answer (`public_experience.api.get_next_availability`) and its labels.
 * Pure (tests load this file directly).
 */
import { ADDIS, clockIn } from "./clock";

export interface SlotFacts {
  next: string | null;
  todayLeft: number;
}

export interface NextAvailability {
  timezone: string;
  next: { start: string; service: string; provider: string | null; offering: string } | null;
  todayLeft: number;
  services: Record<string, SlotFacts>;
  providers: Record<string, SlotFacts>;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?Z$/;
const ID = /^[^<>"'\u0000-\u001f]{1,140}$/;

function facts(value: unknown): Record<string, SlotFacts> {
  const result: Record<string, SlotFacts> = {};
  if (!value || typeof value !== "object") return result;
  for (const [key, row] of Object.entries(value as Record<string, unknown>)) {
    const item = row as Record<string, unknown>;
    if (!ID.test(key) || !item || typeof item !== "object") continue;
    result[key] = {
      next: typeof item.next === "string" && ISO.test(item.next) ? item.next : null,
      todayLeft: Number.isInteger(item.todayLeft) && (item.todayLeft as number) >= 0 ? (item.todayLeft as number) : 0,
    };
  }
  return result;
}

/** The validated answer, or null when live availability is off or the answer is not usable. */
export function parseAvailability(raw: unknown): NextAvailability | null {
  const body = raw as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || body.enabled !== true) return null;
  const next = body.next as Record<string, unknown> | null;
  const usable = next && typeof next.start === "string" && ISO.test(next.start) && typeof next.service === "string" && typeof next.offering === "string";
  return {
    timezone: typeof body.timezone === "string" && /^[A-Za-z_]+\/[A-Za-z_]+$/.test(body.timezone) ? body.timezone : ADDIS,
    next: usable ? { start: next.start as string, service: next.service as string, provider: typeof next.provider === "string" ? next.provider : null, offering: next.offering as string } : null,
    todayLeft: Number.isInteger(body.todayLeft) && (body.todayLeft as number) >= 0 ? (body.todayLeft as number) : 0,
    services: facts(body.services),
    providers: facts(body.providers),
  };
}

export interface SlotLabel {
  /** "today", "tomorrow", or "day" (then `weekday` names the day). */
  when: "today" | "tomorrow" | "day";
  weekday: string;
  /** 24-hour `HH:MM` in the business's zone. */
  time: string;
}

function dateKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** How to say a free start: today, tomorrow or a weekday, and the time, in the business's zone and the page language. */
export function slotLabel(iso: string, now: Date, timeZone = ADDIS, locale = "en"): SlotLabel {
  const start = new Date(iso);
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  const key = dateKey(start, timeZone);
  const when = key === dateKey(now, timeZone) ? "today" : key === dateKey(tomorrow, timeZone) ? "tomorrow" : "day";
  const clock = clockIn(start, timeZone);
  return {
    when,
    weekday: new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en", { timeZone, weekday: "long" }).format(start),
    time: `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`,
  };
}
