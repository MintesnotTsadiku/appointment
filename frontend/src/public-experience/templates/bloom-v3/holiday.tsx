import type { ReactNode } from "react";

import type { ChromeKey, PublicChrome } from "../chrome";
import type { TemplateProps } from "../types";
import { HOLIDAY_GEEZ, useHoliday, type HolidayKey } from "../kit";
import "./holiday.css";

/*
 * Bloom's Ethiopian holiday moment: a small salon mirror ringed with bulbs that holds a glossy,
 * filled drawing, beside the greeting in the poster face. It sits in the hero copy (in the flow), so it
 * never covers content. Shown only when the owner turned on "Show holiday greetings".
 */

const ART: Record<HolidayKey, ReactNode> = {
  // Enkutatash: three marigold adey abeba daisies.
  enkutatash: <>{[[32, 26, 9], [18, 40, 7], [46, 42, 7]].map(([x, y, r]) => <g key={x} className="b3h-daisy">
    {Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx={x} cy={y - r * 0.9} rx={r * 0.32} ry={r * 0.7} transform={`rotate(${i * 45} ${x} ${y})`} className="b3h-petal" />)}
    <circle cx={x} cy={y} r={r * 0.42} className="b3h-heart" /></g>)}<path d="M32 36v20M18 48v8M46 50v6" className="b3h-stem" /></>,
  // Meskel: the Demera, a bundle of poles crowned with a flame.
  meskel: <><path d="M22 58 30 24h4l8 34Z" className="b3h-wood" /><path className="b3h-flame" d="M32 30c-7-4-8-12-1-20 2 6 8 8 8 14 0 4-3 6-7 6Z" /><path d="M32 12V5m-3 3h6" className="b3h-stem" /></>,
  // Genna: one tall candle with a gold halo.
  genna: <><circle cx="32" cy="22" r="11" className="b3h-halo" /><rect x="27" y="30" width="10" height="26" rx="3" className="b3h-wax" /><path className="b3h-flame" d="M32 28c-4-3-5-8 0-14 5 6 4 11 0 14Z" /></>,
  // Timket: a fringed ceremonial umbrella in rose and marigold.
  timket: <><path d="M10 34a22 16 0 0 1 44 0Z" className="b3h-umbrella" /><path d="M10 34c3 4 6 4 9 0 3 4 6 4 9 0 3 4 6 4 9 0 3 4 6 4 9 0 2 3 5 3 8 0" className="b3h-fringe" /><path d="M32 18v-6m0 22v22" className="b3h-stem" /></>,
  // Adwa: the peaks at sunrise.
  adwa: <><circle cx="40" cy="28" r="9" className="b3h-heart" /><path d="M6 56 22 30l8 12 9-18 19 32Z" className="b3h-wood" /></>,
};

export function BloomHoliday({ snapshot, locale, chrome }: { snapshot: TemplateProps["snapshot"]; locale: string; chrome: PublicChrome }) {
  const holiday = useHoliday(snapshot.booking?.holidayGreetings === true);
  if (!holiday) return null;
  const t = (key: string, values?: Record<string, string | number>) => chrome.t(`holiday.${key}` as ChromeKey, values);
  return <aside className="b3-holiday" data-holiday={holiday.key} aria-label={t("label")} data-qa="holiday-moment">
    <span className="b3h-mirror" aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">{ART[holiday.key]}</svg>
      {Array.from({ length: 7 }, (_, index) => <i key={index} style={{ left: `${50 + 50 * Math.cos(Math.PI - (Math.PI * index) / 6)}%`, top: `${50 - 50 * Math.sin((Math.PI * index) / 6)}%` }} />)}
    </span>
    <span className="b3h-copy">
      <strong>{t(holiday.key)}</strong>
      {locale === "am" ? null : <span className="b3h-geez" lang="am">{HOLIDAY_GEEZ[holiday.key]}</span>}
      <span className="b3h-line">{t(`${holiday.key}Line`, { count: holiday.count })}</span>
    </span>
  </aside>;
}
