import type { ReactNode } from "react";

import type { ChromeKey, PublicChrome } from "../chrome";
import type { TemplateProps } from "../types";
import { HOLIDAY_GEEZ, useHoliday, type HolidayKey } from "../kit";
import "./holiday.css";

/*
 * Selam's Ethiopian holiday moment: a long pill with one continuous line drawing in lime, like the
 * motion arc over the studio photos, and the greeting set in the magazine face. It sits in the hero
 * copy (in the flow), so it never covers content. Shown only when the owner turned on the greetings.
 */

const ART: Record<HolidayKey, ReactNode> = {
  // Enkutatash: a daisy drawn in one stroke, on a rising stem.
  enkutatash: <><path d="M6 58C18 50 26 42 30 30" /><path d="M30 30c-6-6-6-14 0-16 6 2 6 10 0 16 6-6 14-6 16 0-2 6-10 6-16 0 6 6 6 14 0 16-6-2-6-10 0-16-6 6-14 6-16 0 2-6 10-6 16 0Z" /><circle cx="30" cy="30" r="2.6" className="s3h-dot" /></>,
  // Meskel: the Demera as rising strokes and a flame arc.
  meskel: <><path d="M20 60 30 26M44 60 34 26M32 60V22" /><path d="M32 22c-8-6-6-14 0-18 0 6 8 8 6 14" className="s3h-flame" /></>,
  // Genna: a candle and its flame, one line.
  genna: <><path d="M24 60V36h16v24M18 60h28" /><path d="M32 34c-5-4-5-9 0-14 5 5 5 10 0 14Z" className="s3h-flame" /><path d="M46 16l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" /></>,
  // Timket: an umbrella and the moving water.
  timket: <><path d="M10 34a22 16 0 0 1 44 0H10Z" /><path d="M32 18V12m0 22v14" /><path d="M8 54c6-4 10-4 16 0s10 4 16 0 10-4 16 0" className="s3h-flame" /></>,
  // Adwa: the peaks and the sun, one horizon.
  adwa: <><path d="M4 56 20 30l9 13 10-20 21 33" /><circle cx="44" cy="20" r="7" className="s3h-flame" /></>,
};

export function SelamHoliday({ snapshot, locale, chrome }: { snapshot: TemplateProps["snapshot"]; locale: string; chrome: PublicChrome }) {
  const holiday = useHoliday(snapshot.booking?.holidayGreetings === true);
  if (!holiday) return null;
  const t = (key: string, values?: Record<string, string | number>) => chrome.t(`holiday.${key}` as ChromeKey, values);
  return <aside className="s3-holiday" data-holiday={holiday.key} aria-label={t("label")} data-qa="holiday-moment">
    <span className="s3h-art" aria-hidden="true">
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" focusable="false">{ART[holiday.key]}</svg>
    </span>
    <span className="s3h-copy">
      <strong>{t(holiday.key)}</strong>
      <span className="s3h-line">{locale === "am" ? null : <span lang="am" className="s3h-geez">{HOLIDAY_GEEZ[holiday.key]} · </span>}{t(`${holiday.key}Line`, { count: holiday.count })}</span>
    </span>
  </aside>;
}
