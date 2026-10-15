import type { ReactNode } from "react";

import type { ChromeKey, PublicChrome } from "../chrome";
import type { TemplateProps } from "../types";
import { HOLIDAY_GEEZ, useHoliday, type HolidayKey } from "../kit";
import "./holiday.css";

/*
 * Ergata's Ethiopian holiday moment: a quiet card in the hero copy with a small drawing in an arched
 * window, the greeting and one warm line. It sits in the flow of the page, so it never covers content.
 * It shows only when the owner turned on "Show holiday greetings" (`booking.holidayGreetings`).
 */

const ART: Record<HolidayKey, ReactNode> = {
  // Enkutatash: adey abeba, the yellow Meskel daisies of the new year, in a clay pot.
  enkutatash: <><path d="M20 58h24l-3 10H23Z" className="eg2-fill-clay" /><path d="M32 58V34m0 10-8-10m8 6 9-12" />
    <g className="eg2-holiday-flower"><circle cx="32" cy="24" r="4" className="eg2-fill-gold" /><path d="M32 14v-4m0 24v4m10-14h4m-24 0h-4m17-7 3-3m-17 17-3 3m17 0 3 3m-17-17-3-3" opacity=".75" /></g>
    <circle cx="21" cy="30" r="3" className="eg2-fill-gold" /><path d="M21 23v-2m0 18v2m7-9h2m-16 0h-2" opacity=".6" />
    <circle cx="44" cy="25" r="3" className="eg2-fill-gold" /><path d="M44 18v-2m0 18v2m7-9h2m-16 0h-2" opacity=".6" /></>,
  // Meskel: the Demera, a tall bundle of eucalyptus poles with a small cross and a soft flame, daisies at its foot.
  meskel: <><path d="M24 64 30 26m10 38-6-38M32 64V24" /><path d="M32 22V12m-4 4h8" /><path className="eg2-holiday-flame eg2-fill-gold" d="M32 40c-6-4-7-11-1-17 1 5 6 6 6 11 0 3-2 5-5 6Z" />
    <circle cx="16" cy="62" r="3" className="eg2-fill-gold" /><circle cx="48" cy="62" r="3" className="eg2-fill-gold" /><path d="M10 66h44" opacity=".6" /></>,
  // Genna: a lit candle in an arched window with one bright star.
  genna: <><path d="M14 66V30a18 18 0 0 1 36 0v36" className="eg2-fill-sky" /><path d="M10 66h44" /><path d="M28 64V44h8v20" className="eg2-fill-card" />
    <path className="eg2-holiday-flame eg2-fill-gold" d="M32 42c-4-3-4-7 0-11 4 4 4 8 0 11Z" /><path d="M42 20l1.6 3.4L47 25l-3.4 1.6L42 30l-1.6-3.4L37 25l3.4-1.6Z" className="eg2-fill-gold" /></>,
  // Timket: a fringed ceremonial umbrella over still water.
  timket: <><path d="M12 34a20 14 0 0 1 40 0Z" className="eg2-fill-clay" /><path d="M12 34c3 3 6 3 8 0 2 3 6 3 8 0 2 3 6 3 8 0 2 3 6 3 8 0 2 3 5 3 8 0" opacity=".8" />
    <path d="M32 20v-6m0 20v26" /><path className="eg2-holiday-water" d="M10 58c5-3 9-3 14 0s9 3 14 0 9-3 14 0M14 66c5-3 9-3 14 0s9 3 14 0" opacity=".7" /></>,
  // Adwa: the peaks of Adwa at sunrise, with an olive sprig.
  adwa: <><circle cx="40" cy="30" r="8" className="eg2-fill-gold eg2-holiday-sun" /><path d="M6 60 22 34l8 12 8-16 20 30Z" className="eg2-fill-sage" /><path d="M6 60h52" />
    <path d="M14 66c6-4 12-4 18-1" opacity=".7" /><path d="M20 63c-2-3-1-6 2-7 1 3 0 5-2 7Zm6 0c0-3 2-5 5-5 0 3-2 5-5 5Z" className="eg2-fill-sage" /></>,
};

export function ErgataHoliday({ snapshot, locale, chrome }: { snapshot: TemplateProps["snapshot"]; locale: string; chrome: PublicChrome }) {
  const holiday = useHoliday(snapshot.booking?.holidayGreetings === true);
  if (!holiday) return null;
  const t = (key: string, values?: Record<string, string | number>) => chrome.t(`holiday.${key}` as ChromeKey, values);
  return <aside className="eg2-holiday" data-holiday={holiday.key} aria-label={t("label")} data-qa="holiday-moment">
    <span className="eg2-holiday-window" aria-hidden="true">
      <svg viewBox="0 0 64 72" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">{ART[holiday.key]}</svg>
    </span>
    <span className="eg2-holiday-copy">
      <strong className="eg2-holiday-title">{t(holiday.key)}</strong>
      {locale === "am" ? null : <span className="eg2-holiday-geez" lang="am">{HOLIDAY_GEEZ[holiday.key]}</span>}
      <span className="eg2-holiday-line">{t(`${holiday.key}Line`, { count: holiday.count })}</span>
    </span>
  </aside>;
}
