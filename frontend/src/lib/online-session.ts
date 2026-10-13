/**
 * Online sessions: the public format of a place and the customer's join window.
 *
 * Pure logic, no React, so `tests/online-session.test.mjs` runs it in Node.
 * The server (`appointment/scheduler/online_meeting.py`) owns the rules; these mirror them for display.
 */

/** How a session or place meets, as public payloads name it (`location_type` / `locationType`). */
export type LocationType = 'online' | 'in_person';

/** The customer's own online session, from the manage page or My bookings. Never in public payloads. */
export interface OnlineSession {
  platform: string;
  meeting_link: string | null;
  /** ISO UTC: 15 minutes before the start. */
  join_opens_at: string;
  /** ISO UTC: the end of the session. */
  ends_at: string;
  join_lead_minutes?: number;
}

export type JoinState = 'waiting' | 'open' | 'no-link' | 'ended';

/** Suggestions for the platform field; owners can type any name. */
export const PLATFORM_SUGGESTIONS = ['Google Meet', 'Zoom', 'Microsoft Teams', 'Jitsi', 'WhatsApp video', 'Telegram video', 'Phone'];

export const JOIN_LEAD_MINUTES = 15;

/**
 * Where the customer is in the join window at `now` (ms since epoch):
 * - `ended`: the session is over.
 * - `no-link`: staff have not set the link yet (shown before and during the session).
 * - `waiting`: the link exists, the window opens at `join_opens_at`.
 * - `open`: from 15 minutes before the start until the end.
 */
export function joinState(session: OnlineSession, now: number): JoinState {
  const ends = Date.parse(session.ends_at);
  if (!Number.isNaN(ends) && now >= ends) return 'ended';
  if (!session.meeting_link) return 'no-link';
  const opens = Date.parse(session.join_opens_at);
  return !Number.isNaN(opens) && now >= opens ? 'open' : 'waiting';
}

/** Milliseconds until the state can change next, for a timer; null when it will not change. */
export function nextChangeIn(session: OnlineSession, now: number): number | null {
  const marks = [Date.parse(session.join_opens_at), Date.parse(session.ends_at)].filter((mark) => !Number.isNaN(mark) && mark > now);
  return marks.length ? Math.min(...marks) - now : null;
}

/** The same rule as the server: an absolute https link with a dotted host, no spaces and no credentials. */
export function isMeetingLink(value: string): boolean {
  const link = value.trim();
  if (!link || link.length > 500 || /\s/.test(link)) return false;
  try {
    const url = new URL(link);
    return url.protocol === 'https:' && url.hostname.includes('.') && !url.username && !url.password;
  } catch {
    return false;
  }
}

/** "Online video" or "Online video · Zoom", from the two translated strings. */
export function onlineLabel(plain: string, withPlatform: string, platform?: string | null): string {
  const name = (platform || '').trim();
  return name ? withPlatform.replace('{0}', name) : plain;
}

/** A session's derived format: an online place whose platform is the phone meets by phone. */
export function meetOfFormat(format: { locationType?: unknown; platform?: string } | null | undefined): Meet | null {
  const type = locationTypeOf(format?.locationType);
  return type === 'online' && /^phone$|^ስልክ$/i.test((format?.platform || '').trim()) ? 'phone' : type;
}

/** The public format from a payload field that may be missing on older releases. */
export function locationTypeOf(value: unknown): LocationType | null {
  return value === 'online' || value === 'in_person' ? value : null;
}

export type Meet = LocationType | 'phone';

/**
 * How a session meets on a template, in order: the owner's content `format`, then the format of its
 * offering's location (`sessionFormats[serviceId].locationType`), then words in its name in either language.
 */
export function sessionMeetOf(format: unknown, derived: Meet | null | undefined, name: string): Meet {
  if (format === 'in_person' || format === 'online' || format === 'phone') return format;
  if (derived) return derived;
  const words = name.toLowerCase();
  if (/online|video|ኦንላይን|ቪዲዮ/.test(words)) return 'online';
  if (/phone|call|ስልክ|ጥሪ/.test(words)) return 'phone';
  return 'in_person';
}

/** How a place meets: the content `format`, then its location's type (`placeFormats[locationId]`), else in person. */
export function placeMeetOf(format: unknown, derived: Meet | null | undefined): LocationType {
  if (format === 'online' || format === 'in_person') return format;
  return derived === 'phone' ? 'online' : derived ?? 'in_person';
}
