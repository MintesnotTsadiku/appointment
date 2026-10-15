import type { ReactNode } from "react";

import type { ChromeKey, PublicChrome } from "../chrome";
import type { TemplateProps } from "../types";
import { HOLIDAY_GEEZ, useHoliday, type HolidayKey } from "../kit";
import "./holiday.css";

/*
 * Meron's Ethiopian holiday moment: a garment tag on a thread. A stitched border in wine, a gold
 * line drawing on navy wool, and the greeting in Garamond italic. It sits in the hero copy (in the
 * flow, centred like the hero), so it never covers content. Shown only when the owner turned on
 * "Show holiday greetings".
 */

const ART: Record<HolidayKey, ReactNode> = {
  // Enkutatash: a sprig of adey abeba.
  enkutatash: <><path d="M24 54C24 40 22 30 16 20M24 40c4-8 10-12 14-14" />{[[16, 16], [38, 22], [26, 28]].map(([x, y]) => <g key={x}>
    <circle cx={x} cy={y} r="3" className="m3h-fill" /><path d={`M${x} ${y - 7}v2m0 10v2m7-7h-2m-10 0h-2`} /></g>)}</>,
  // Meskel: the Demera.
  meskel: <><path d="M16 56 22 24M32 56 26 24M24 56V20" /><path d="M24 20c-5-4-5-9 0-13 5 4 5 9 0 13Z" className="m3h-fill" /></>,
  // Genna: a candle with a small star.
  genna: <><path d="M19 56V32h10v24M13 56h22" /><path d="M24 30c-4-3-4-7 0-11 4 4 4 8 0 11Z" className="m3h-fill" /><path d="M36 12l1.4 3L40 16l-2.6 1-1.4 3-1.4-3L32 16l2.6-1Z" className="m3h-fill" /></>,
  // Timket: the fringed umbrella.
  timket: <><path d="M6 30a18 13 0 0 1 36 0Z" /><path d="M6 30v3m6-3v3m6-3v3m6-3v3m6-3v3m6-3v3m6-3v3" /><path d="M24 17v-5m0 18v24" /></>,
  // Adwa: the peaks and the sun.
  adwa: <><circle cx="32" cy="20" r="5" className="m3h-fill" /><path d="M4 54 16 32l7 10 8-16 13 28Z" /></>,
};

export function MeronHoliday({ snapshot, locale, chrome }: { snapshot: TemplateProps["snapshot"]; locale: string; chrome: PublicChrome }) {
  const holiday = useHoliday(snapshot.booking?.holidayGreetings === true);
  if (!holiday) return null;
  const t = (key: string, values?: Record<string, string | number>) => chrome.t(`holiday.${key}` as ChromeKey, values);
  return <aside className="m3-holiday" data-holiday={holiday.key} aria-label={t("label")} data-qa="holiday-moment">
    <span className="m3h-tag" aria-hidden="true">
      <i className="m3h-hole" />
      <svg viewBox="0 0 48 60" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">{ART[holiday.key]}</svg>
    </span>
    <span className="m3h-copy">
      <strong>{t(holiday.key)}</strong>
      {locale === "am" ? null : <span lang="am" className="m3h-geez">{HOLIDAY_GEEZ[holiday.key]}</span>}
      <span className="m3h-line">{t(`${holiday.key}Line`, { count: holiday.count })}</span>
    </span>
  </aside>;
}
