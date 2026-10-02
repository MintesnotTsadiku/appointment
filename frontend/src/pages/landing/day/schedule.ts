/**
 * Pretend scheduling rules behind the Day chapters. Times are minutes since
 * midnight. They mirror the real rules in spirit (working hours, buffers,
 * existing bookings); nothing here talks to the server.
 */
export interface Booking {
  id: string;
  who: string;
  start: number;
  length: number;
}

export interface Provider {
  name: string;
  opens: number;
  closes: number;
  bookings: Booking[];
}

export interface Opening {
  provider: string;
  start: number;
}

/** Earliest start, at or after `from`, where `length` plus `buffer` fits for any provider. */
export function nextOpening(providers: Provider[], length: number, buffer: number, from: number, step = 15): Opening | null {
  let best: Opening | null = null;
  for (const provider of providers) {
    const start = firstFit(provider, length, buffer, Math.max(from, provider.opens), step);
    if (start !== null && (best === null || start < best.start)) best = { provider: provider.name, start };
  }
  return best;
}

export type MoveOutcome = "moved" | "clash" | "closed";

/** Move one booking by `delta` minutes if the new time is free and inside working hours. */
export function moveBooking(provider: Provider, id: string, delta: number): { outcome: MoveOutcome; provider: Provider } {
  const booking = provider.bookings.find((item) => item.id === id);
  if (!booking) return { outcome: "clash", provider };
  const start = booking.start + delta;
  if (start < provider.opens || start + booking.length > provider.closes) return { outcome: "closed", provider };
  const others = provider.bookings.filter((item) => item.id !== id);
  if (others.some((item) => overlaps(start, booking.length, item.start, item.length))) return { outcome: "clash", provider };
  return {
    outcome: "moved",
    provider: { ...provider, bookings: provider.bookings.map((item) => (item.id === id ? { ...item, start } : item)) },
  };
}

/** "14:30" style label for minutes since midnight. */
export function hhmm(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return (hours < 10 ? "0" : "") + hours + ":" + (rest < 10 ? "0" : "") + rest;
}

/** Short stable reference for a pretend confirmation, e.g. "APT-4K9QZT". */
export function reference(seed: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  let out = "";
  for (let index = 0; index < 6; index += 1) {
    out += alphabet[hash % alphabet.length];
    hash = Math.floor(hash / alphabet.length) || 2654435761 + index;
  }
  return "APT-" + out;
}

function firstFit(provider: Provider, length: number, buffer: number, from: number, step: number): number | null {
  const aligned = Math.ceil(from / step) * step;
  for (let start = aligned; start + length <= provider.closes; start += step) {
    const clear = provider.bookings.every((item) => !overlaps(start - buffer, length + 2 * buffer, item.start, item.length));
    if (clear) return start;
  }
  return null;
}

function overlaps(startA: number, lengthA: number, startB: number, lengthB: number): boolean {
  return startA < startB + lengthB && startB < startA + lengthA;
}
