import { useEffect, useRef, useState, type ReactNode } from "react";

import type { CompiledDesign } from "../../types";
import type { ChromeKey, PublicChrome } from "../chrome";
import { contentImage, type ContentImage } from "../content";
import {
  habeshaPhrase, loadingAttributes, openState, pictureSet, slotLabel, useMarquee,
  type MotionLevel, type NextAvailability, type OpeningDay, type PictureAsset, type SlotFacts, type TimeOfDay,
} from "../kit";
import { Plate } from "./art";

/* Tena v3 building blocks. Visual components of this package only; never imported by another template. */

export type TenaKey = "nextAppointments" | "board" | "boardNext" | "directory" | "youAreHere" | "bookingDesk" | "callShort";

/** A Tena string (`publicSite.tena.*`); the package keeps its own words under its own group. */
export function tt(chrome: PublicChrome, key: TenaKey, values?: Record<string, string | number>): string {
  return chrome.t(`tena.${key}` as unknown as ChromeKey, values);
}

export interface Art extends PictureAsset {
  alt: string;
  position?: string;
}

/** A recipe image role with its art direction, or null. */
export function role(design: CompiledDesign, name: string): Art | null {
  const found = design.assets[name] as (PictureAsset & { alt?: string; focalPoint?: { x: number; y: number } }) | undefined;
  if (!found?.src) return null;
  const focus = found.focalPoint ? `${Math.round(found.focalPoint.x * 100)}% ${Math.round(found.focalPoint.y * 100)}%` : undefined;
  return { ...found, alt: found.alt || "", ...(focus ? { position: focus } : {}) };
}

/** The owner's photo for a section or item (from release content), else the template role. */
export function art(value: unknown, locale: string, design: CompiledDesign, fallback: string): Art | null {
  const own: ContentImage | null = contentImage(value, locale);
  if (own) {
    // A packaged template photo chosen in content keeps its art direction (mobile crop, night photo, AVIF).
    const packaged = Object.keys(design.assets).find((name) => design.assets[name]?.src === own.src);
    const base = packaged ? role(design, packaged) : null;
    return { ...(base || { src: own.src }), alt: own.alt || base?.alt || "", ...(own.position ? { position: own.position } : {}) };
  }
  return fallback ? role(design, fallback) : null;
}

interface PhotoProps {
  image: Art;
  sizes?: string;
  eager?: boolean;
  night?: boolean;
  className?: string;
  decorative?: boolean;
}

/** `<picture>` with AVIF/WebP, widths, the mobile crop and the night photo. */
export function Photo({ image, sizes = "100vw", eager = false, night = false, className, decorative = false }: PhotoProps) {
  const set = pictureSet(image, { night, sizes });
  return <picture className={className}>
    {set.sources.map((source) => <source key={`${source.type}-${source.media || "all"}`} {...source} />)}
    <img {...set.img} {...loadingAttributes(eager)} alt={decorative ? "" : image.alt}
      style={image.position ? { objectPosition: image.position } : undefined} />
  </picture>;
}

/** "today" / "tomorrow" / a weekday, then the time, for a free start. */
export function slotText(chrome: PublicChrome, iso: string, zone: string, locale: string, key: "nextFree" | "short" = "nextFree") {
  const label = slotLabel(iso, new Date(), zone, locale);
  const when = label.when === "today" ? chrome.t("today") : label.when === "tomorrow" ? chrome.t("tomorrow") : label.weekday;
  if (key === "short") return `${when} ${label.time}`;
  return chrome.t(key, { when, time: locale === "am" ? `${label.time} (${habeshaPhrase(label.time)})` : label.time });
}

/** The live "next free" plate; renders nothing while loading or when the data has no free time. */
export function NextChip({ facts, data, chrome, locale, variant = "nextFree", href, qa, pending = false }: {
  facts: SlotFacts | null | undefined; data: NextAvailability | null; chrome: PublicChrome; locale: string; pending?: boolean;
  variant?: "nextFree" | "short"; href?: string; qa?: string;
}) {
  // While the free times load (\`pending\`), an invisible chip keeps its place, so nothing below moves.
  if (pending && !data) return <p className="t3-chip" aria-hidden="true" style={{ visibility: "hidden" }}><span className="t3-pulse" />&nbsp;</p>;
  if (!data || !facts?.next) return null;
  const text = slotText(chrome, facts.next, data.timezone, locale, variant);
  const body = <><span className="t3-pulse" aria-hidden="true" />{text}</>;
  return href
    ? <a className="t3-chip" href={href} data-qa={qa}>{body}</a>
    : <p className="t3-chip" data-qa={qa}>{body}</p>;
}

const WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayLabel(day: string, locale: string, style: "long" | "short") {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en", { weekday: style, timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, 9, 11 + WEEK.indexOf(day))));
}

/** "Open now · closes at 17:00" on a signage plate, with the Habesha clock in Amharic. */
export function OpenBadge({ days, now, chrome, locale, habesha, qa = "tena-open-now" }: { days: OpeningDay[]; now: TimeOfDay; chrome: PublicChrome; locale: string; habesha: boolean; qa?: string }) {
  if (!days.length) return null;
  const state = openState(days, now);
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  const text = state.open ? chrome.t("openNow", { time: time(state.closes || "") })
    : state.opensToday ? chrome.t("opensToday", { time: time(state.opens || "") })
    : state.opensDay ? chrome.t("opensOn", { day: dayLabel(state.opensDay, locale, "long"), time: time(state.opens || "") }) : "";
  if (!text) return null;
  return <p className="t3-open" data-open={state.open} data-qa={qa}><span className="t3-pulse" aria-hidden="true" />{text}</p>;
}

/** The weekly hours with an International / Habesha clock switch. */
export function HoursList({ days, chrome, locale, habesha, onHabesha }: { days: OpeningDay[]; chrome: PublicChrome; locale: string; habesha: boolean; onHabesha: (value: boolean) => void }) {
  if (!days.length) return null;
  const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sorted = [...days].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  return <div className="t3-hours">
    <div className="t3-clock" role="group" aria-label={chrome.t("clockFormat")}>
      <button type="button" aria-pressed={!habesha} onClick={() => onHabesha(false)}>{chrome.t("internationalTime")}</button>
      <button type="button" aria-pressed={habesha} onClick={() => onHabesha(true)} data-qa="tena-habesha-toggle">{chrome.t("habeshaTime")}</button>
    </div>
    <dl>{sorted.map((row) => <div key={row.day + row.open}>
      <dt>{dayLabel(row.day, locale, "short")}</dt>
      <dd>{time(row.open)} – {time(row.close)}</dd>
    </div>)}</dl>
  </div>;
}

export interface Review { quote: string; who: string; role: string }

/** Reviews: a marquee of signage cards with a pause button from three quotes, otherwise one pull quote. */
export function Reviews({ items, chrome, level, aside }: { items: Review[]; chrome: PublicChrome; level: MotionLevel; aside?: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const marquee = useMarquee(track, level);
  if (items.length < 3) {
    const review = items[0];
    if (!review) return null;
    return <div className="t3-pull" data-reveal="rise">
      {aside}
      <figure>
        <Plate className="t3-quote-plate" />
        <blockquote><p>{review.quote}</p></blockquote>
        <figcaption><strong>{review.who}</strong>{review.role ? <span>{review.role}</span> : null}</figcaption>
      </figure>
    </div>;
  }
  // Both rows carry every review (the second starts further on), so each row is wider than the screen.
  const rows = [items, [...items.slice(2), ...items.slice(0, 2)]];
  return <div className="t3-marquee" data-reveal="rise">
    <div ref={track} className="t3-marquee-track" data-qa="tena-reviews">
      {rows.map((row, rowIndex) => <div key={rowIndex} className="t3-marquee-row" data-direction={rowIndex ? "right" : "left"}>
        {[0, 1].map((copy) => <ul key={copy} className="t3-marquee-group" aria-hidden={copy === 1 || undefined}>
          {row.map((review, index) => <li key={index}>
            <Plate className="t3-quote-plate" />
            <blockquote><p>{review.quote}</p></blockquote>
            <p className="t3-review-who"><strong>{review.who}</strong>{review.role ? <span>{review.role}</span> : null}</p>
          </li>)}
        </ul>)}
      </div>)}
    </div>
    {marquee.state !== "static" ? <button type="button" className="t3-pause" onClick={marquee.toggle} aria-pressed={marquee.userPaused}
      data-qa="tena-reviews-pause"><span className="t3-pause-icon" aria-hidden="true" data-paused={marquee.userPaused} />{marquee.userPaused ? chrome.t("playReviews") : chrome.t("pauseReviews")}</button> : null}
  </div>;
}

/** Copy a text with a short "Copied" confirmation. */
export function CopyChip({ text, chrome }: { text: string; chrome: PublicChrome }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return undefined;
    const timer = window.setTimeout(() => setDone(false), 1800);
    return () => window.clearTimeout(timer);
  }, [done]);
  if (!text || typeof navigator === "undefined" || !navigator.clipboard) return null;
  return <button type="button" className="t3-mini" onClick={() => { navigator.clipboard.writeText(text).then(() => setDone(true)).catch(() => undefined); }}>
    <span aria-live="polite">{done ? chrome.t("copied") : chrome.t("copyAddress")}</span>
  </button>;
}
