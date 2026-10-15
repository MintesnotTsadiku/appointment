import { useEffect, useState } from "react";

import { ADDIS } from "./core/clock";
import { activeHoliday, dateIn, isHolidayKey, nextHoliday, parseIsoDate, type Holiday } from "./core/holidays";

/**
 * Development only: `?preview-holiday=<key>` (enkutatash, meskel, genna, timket or adwa) shows that
 * holiday's moment on any day, and `?preview-date=YYYY-MM-DD` sets the Addis Ababa date. Browser QA
 * uses them; production builds ignore both.
 */
function preview(): { key: string | null; date: string | null } {
  if (!import.meta.env.DEV || typeof window === "undefined") return { key: null, date: null };
  const query = new URLSearchParams(window.location.search);
  return { key: query.get("preview-holiday"), date: query.get("preview-date") };
}

function read(enabled: boolean, timeZone: string): Holiday | null {
  const forced = preview();
  const today = parseIsoDate(forced.date) || dateIn(new Date(), timeZone);
  if (isHolidayKey(forced.key)) return nextHoliday(forced.key, today);
  if (!enabled) return null;
  return activeHoliday(today);
}

/**
 * The Ethiopian holiday near today in Addis Ababa, or null. Pass the owner setting
 * (`snapshot.booking.holidayGreetings === true`) as `enabled`. Checked again every hour.
 */
export function useHoliday(enabled: boolean, timeZone = ADDIS): Holiday | null {
  const [holiday, setHoliday] = useState<Holiday | null>(() => read(enabled, timeZone));
  useEffect(() => {
    setHoliday(read(enabled, timeZone));
    const timer = window.setInterval(() => setHoliday(read(enabled, timeZone)), 3_600_000);
    return () => window.clearInterval(timer);
  }, [enabled, timeZone]);
  return holiday;
}
