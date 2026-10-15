import type { ReactNode } from "react";

import type { ChromeKey, PublicChrome } from "../chrome";
import type { TemplateProps } from "../types";
import { HOLIDAY_GEEZ, useHoliday, type HolidayKey } from "../kit";
import "./holiday.css";

/*
 * Tena's Ethiopian holiday moment: a small wayfinding sign. A signal-yellow plate carries a clear
 * pictogram, and the teal panel beside it carries the greeting, as a clinic would post a notice at
 * the entrance. It sits in the hero copy (in the flow), so it never covers content. Shown only when
 * the owner turned on "Show holiday greetings".
 */

const ART: Record<HolidayKey, ReactNode> = {
  // Enkutatash: a daisy pictogram.
  enkutatash: <><circle cx="20" cy="18" r="4.5" /><path d="M20 8v4m0 12v4m10-10h-4M14 18h-4m17-7-3 3m-8 8-3 3m14 0-3-3m-8-8-3-3" /><path d="M20 28v8m0-4 5-4" /></>,
  // Meskel: the Demera pictogram.
  meskel: <><path d="M13 36 19 14m8 22-6-22M20 36V12" /><path d="M20 12c-4-3-4-7 0-10 4 3 4 7 0 10Z" /></>,
  // Genna: a candle pictogram.
  genna: <><path d="M15 36V20h10v16M11 36h18" /><path d="M20 18c-3-2-3-6 0-9 3 3 3 7 0 9Z" /><path d="M30 6l1.2 2.6L34 10l-2.8 1.4L30 14l-1.2-2.6L26 10l2.8-1.4Z" /></>,
  // Timket: an umbrella over water.
  timket: <><path d="M6 20a14 10 0 0 1 28 0Z" /><path d="M20 10V6m0 14v10" /><path d="M6 34c4-2.5 7-2.5 11 0s7 2.5 11 0" /></>,
  // Adwa: peaks pictogram with the sun.
  adwa: <><path d="M4 34 13 18l5 8 6-12 12 20Z" /><circle cx="30" cy="10" r="4" /></>,
};

export function TenaHoliday({ snapshot, locale, chrome }: { snapshot: TemplateProps["snapshot"]; locale: string; chrome: PublicChrome }) {
  const holiday = useHoliday(snapshot.booking?.holidayGreetings === true);
  if (!holiday) return null;
  const t = (key: string, values?: Record<string, string | number>) => chrome.t(`holiday.${key}` as ChromeKey, values);
  return <aside className="t3-holiday" data-holiday={holiday.key} aria-label={t("label")} data-qa="holiday-moment">
    <span className="t3h-plate" aria-hidden="true">
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" focusable="false">{ART[holiday.key]}</svg>
    </span>
    <span className="t3h-copy">
      <strong>{t(holiday.key)}{locale === "am" ? null : <span lang="am" className="t3h-geez">{HOLIDAY_GEEZ[holiday.key]}</span>}</strong>
      <span className="t3h-line">{t(`${holiday.key}Line`, { count: holiday.count })}</span>
    </span>
  </aside>;
}
