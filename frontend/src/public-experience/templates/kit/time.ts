import { useEffect, useState } from "react";

import { ADDIS, afterDark, clockIn, dayPart, parseClock, type ClockReading, type DayPart } from "./core/clock";

export interface TimeOfDay extends ClockReading {
  part: DayPart;
  afterDark: boolean;
}

/**
 * Development only: `?preview-time=HH:MM` sets the Addis Ababa clock, so browser QA can capture the
 * morning greeting or the night photo at any hour. Production builds ignore it.
 */
function previewClock(): { hour: number; minute: number } | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  return parseClock(new URLSearchParams(window.location.search).get("preview-time"));
}

function read(timeZone: string): TimeOfDay {
  const clock = clockIn(new Date(), timeZone);
  const preview = previewClock();
  const reading = preview ? { ...clock, ...preview } : clock;
  return { ...reading, part: dayPart(reading.hour), afterDark: afterDark(reading.hour) };
}

/** The wall clock in Addis Ababa (or `timeZone`), its part of the day and whether it is dark; updated each minute. */
export function useTimeOfDay(timeZone = ADDIS): TimeOfDay {
  const [value, setValue] = useState(() => read(timeZone));
  useEffect(() => {
    setValue(read(timeZone));
    const timer = window.setInterval(() => setValue(read(timeZone)), 60_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);
  return value;
}
