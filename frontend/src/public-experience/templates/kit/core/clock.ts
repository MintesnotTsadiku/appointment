/**
 * Time of day in Addis Ababa, opening hours ("open now") and the Habesha clock. Pure, apart from the
 * shared Ethiopian time helper (tests load these files directly).
 */
import { ethiopianPeriod, toEthiopian } from "../../../../lib/time";

export const ADDIS = "Africa/Addis_Ababa";
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type DayPart = "morning" | "afternoon" | "evening" | "night";

export interface ClockReading {
  weekday: Weekday;
  hour: number;
  minute: number;
}

/** The wall clock in a zone (Addis Ababa by default). */
export function clockIn(date: Date, timeZone = ADDIS): ClockReading {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(date)
    .reduce<Record<string, string>>((all, part) => ({ ...all, [part.type]: part.value }), {});
  return { weekday: (parts.weekday || "Monday") as Weekday, hour: Number(parts.hour) % 24, minute: Number(parts.minute) };
}

/** Morning 05–11, afternoon 12–16, evening 17–20, night 21–04. */
export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** After dark in Addis Ababa: from 18:00 to 06:00 (sunset and sunrise move little near the equator). */
export function afterDark(hour: number): boolean {
  return hour >= 18 || hour < 6;
}

/** `HH:MM` from a dev-only `?preview-time=` value; null when it is not a time. */
export function parseClock(value: string | null | undefined): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value || "").trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour < 24 && minute < 60 ? { hour, minute } : null;
}

export interface OpeningDay {
  day: string;
  open: string;
  close: string;
}

export interface OpenState {
  open: boolean;
  /** `HH:MM` the place closes today, while it is open. */
  closes?: string;
  /** The next opening: the weekday and `HH:MM`, while it is closed. */
  opensDay?: Weekday;
  opens?: string;
  /** True when the next opening is later today. */
  opensToday?: boolean;
}

function minutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

/** Whether a place is open at `now`, and when it closes or opens next. Days without hours are closed. */
export function openState(days: OpeningDay[], now: ClockReading): OpenState {
  const current = now.hour * 60 + now.minute;
  const today = days.filter((row) => row.day === now.weekday);
  const running = today.find((row) => minutes(row.open) <= current && current < minutes(row.close));
  if (running) return { open: true, closes: running.close };
  const later = today.filter((row) => minutes(row.open) > current).sort((a, b) => minutes(a.open) - minutes(b.open))[0];
  if (later) return { open: false, opensDay: now.weekday, opens: later.open, opensToday: true };
  const start = WEEKDAYS.indexOf(now.weekday);
  for (let step = 1; step <= 7; step += 1) {
    const day = WEEKDAYS[(start + step) % 7];
    const first = days.filter((row) => row.day === day).sort((a, b) => minutes(a.open) - minutes(b.open))[0];
    if (first) return { open: false, opensDay: day, opens: first.open, opensToday: false };
  }
  return { open: false };
}

const HABESHA_PREFIX: Record<string, string> = { "ሌሊት": "ከሌሊቱ", "ጠዋት": "ከጠዋቱ", "ከሰዓት": "ከቀኑ", "ምሽት": "ከምሽቱ" };

/** A wall time in spoken Habesha form: 09:00 → "ከጠዋቱ 3 ሰዓት", 13:30 → "ከቀኑ 7:30 ሰዓት", 19:00 → "ከምሽቱ 1 ሰዓት". */
export function habeshaPhrase(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value || "");
  if (!match) return value || "";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const local = toEthiopian(hour, minute);
  const time = minute ? `${local.hour}:${String(minute).padStart(2, "0")}` : String(local.hour);
  return `${HABESHA_PREFIX[ethiopianPeriod(hour)] || ""} ${time} ሰዓት`.trim();
}
