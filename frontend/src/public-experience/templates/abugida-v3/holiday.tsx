import type { ReactNode } from "react";

import type { ChromeKey, PublicChrome } from "../chrome";
import type { TemplateProps } from "../types";
import { HOLIDAY_GEEZ, useHoliday, type HolidayKey } from "../kit";
import "./holiday.css";

/*
 * Abugida's Ethiopian holiday moment: a small illuminated panel from the manuscript. The greeting is
 * written in Ge'ez in rubric red on every page (with the English beside it on English pages), framed
 * by gold rules and ፨ marks, next to an ink drawing. It sits in the hero copy (in the flow), so it
 * never covers content. Shown only when the owner turned on "Show holiday greetings".
 */

const ART: Record<HolidayKey, ReactNode> = {
  // Enkutatash: adey abeba drawn in ink with gold hearts.
  enkutatash: <><path d="M24 50V28m0 10-8-6m8 2 8-8" className="a3h-ink" />{[[24, 20], [12, 30], [36, 22]].map(([x, y]) => <g key={x}>
    <path d={`M${x} ${y - 7}v-3m0 20v3m10-10h3m-23 0h-3m17-7 2-2m-16 16-2 2m16 0 2 2m-16-16-2-2`} className="a3h-ink" /><circle cx={x} cy={y} r="4" className="a3h-gold" /></g>)}</>,
  // Meskel: the Demera with a rubric flame.
  meskel: <><path d="M14 54 22 22M34 54 26 22M24 54V20" className="a3h-ink" /><path d="M24 20c-6-4-6-10 0-15 6 5 6 11 0 15Z" className="a3h-red" /><path d="M10 56h28" className="a3h-ink" /></>,
  // Genna: a candle in a manuscript window.
  genna: <><path d="M8 56V24a16 16 0 0 1 32 0v32Z" className="a3h-ink" /><path d="M20 54V36h8v18" className="a3h-ink" /><path d="M24 34c-4-3-4-7 0-11 4 4 4 8 0 11Z" className="a3h-red" /><circle cx="24" cy="15" r="2" className="a3h-gold" /></>,
  // Timket: the ceremonial umbrella with gold fringe.
  timket: <><path d="M6 28a18 13 0 0 1 36 0Z" className="a3h-red" /><path d="M6 28c2 3 4 3 6 0 2 3 4 3 6 0 2 3 4 3 6 0 2 3 4 3 6 0 2 3 4 3 6 0 2 3 4 3 6 0" className="a3h-gold-line" /><path d="M24 15v-5m0 18v26M8 54c5-3 8-3 13 0s8 3 13 0" className="a3h-ink" /></>,
  // Adwa: the peaks of Adwa and a gold sun.
  adwa: <><circle cx="32" cy="20" r="6" className="a3h-gold" /><path d="M4 54 16 30l7 10 8-16 13 30Z" className="a3h-ink" /><path d="M4 54h40" className="a3h-ink" /></>,
};

export function AbugidaHoliday({ snapshot, locale, chrome }: { snapshot: TemplateProps["snapshot"]; locale: string; chrome: PublicChrome }) {
  const holiday = useHoliday(snapshot.booking?.holidayGreetings === true);
  if (!holiday) return null;
  const t = (key: string, values?: Record<string, string | number>) => chrome.t(`holiday.${key}` as ChromeKey, values);
  return <aside className="a3-holiday" data-holiday={holiday.key} aria-label={t("label")} data-qa="holiday-moment">
    <span className="a3h-art" aria-hidden="true">
      <svg viewBox="0 0 48 60" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">{ART[holiday.key]}</svg>
    </span>
    <span className="a3h-copy">
      <strong lang="am" className="a3h-geez"><span aria-hidden="true">፨ </span>{HOLIDAY_GEEZ[holiday.key]}<span aria-hidden="true"> ፨</span></strong>
      {locale === "am" ? null : <span className="a3h-title">{t(holiday.key)}</span>}
      <span className="a3h-line">{t(`${holiday.key}Line`, { count: holiday.count })}</span>
    </span>
  </aside>;
}
