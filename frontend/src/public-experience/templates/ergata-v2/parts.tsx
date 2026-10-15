import { useRef, type ReactNode } from "react";

import type { CompiledDesign } from "../../types";
import type { ChromeKey, PublicChrome } from "../chrome";
import { contentImage, type ContentImage } from "../content";
import {
  habeshaPhrase, loadingAttributes, openState, pictureSet, slotLabel, useMarquee,
  type MotionLevel, type NextAvailability, type OpeningDay, type PictureAsset, type TimeOfDay,
} from "../kit";
import { Icon } from "./icons";

/* Ergata v2 building blocks. Visual parts of this package only; never imported by another template. */

export type ErgataKey = "nextIntro" | "nextSession" | "nextShort" | "voices" | "swipeHint" | "officeHours" | "onlineHours" | "askFirst" | "bookingFor" | "chooseSession";

/** A string of this package (`publicSite.ergata.*`), in the page language. */
export function ex(chrome: PublicChrome, key: ErgataKey, values?: Record<string, string | number>): string {
  return chrome.t(`ergata.${key}` as ChromeKey, values);
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

/** The owner's photo for a section or item (from release content), else the template's photo for that slot. */
export function art(value: unknown, locale: string, design: CompiledDesign, fallback: string): Art | null {
  const own: ContentImage | null = contentImage(value, locale);
  if (own) {
    // A packaged photo chosen in content keeps its art direction (mobile crop, night photo, AVIF).
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

/** `<picture>` with AVIF and WebP, the smaller widths, the mobile crop and the night photo. */
export function Photo({ image, sizes = "100vw", eager = false, night = false, className, decorative = false }: PhotoProps) {
  const set = pictureSet(image, { night, sizes });
  return <picture className={className}>
    {set.sources.map((source) => <source key={`${source.type}-${source.media || "all"}`} {...source} />)}
    <img {...set.img} {...loadingAttributes(eager)} alt={decorative ? "" : image.alt}
      style={image.position ? { objectPosition: image.position } : undefined} />
  </picture>;
}

/** "today 15:30" (with the Habesha clock in Amharic) inside one of the "next free" sentences. */
export function slotText(chrome: PublicChrome, iso: string, zone: string, locale: string, key: "nextIntro" | "nextSession" | "nextShort" = "nextSession") {
  const label = slotLabel(iso, new Date(), zone, locale);
  const when = label.when === "today" ? chrome.t("today") : label.when === "tomorrow" ? chrome.t("tomorrow") : label.weekday;
  return ex(chrome, key, { when, time: locale === "am" ? `${label.time} (${habeshaPhrase(label.time)})` : label.time });
}

/** The live "next free" line with a soft lamp dot; nothing while loading or without a free time. */
export function NextChip({ iso, data, chrome, locale, variant = "nextSession", href, qa, className = "eg2-next", pending = false }: {
  iso: string | null | undefined; data: NextAvailability | null; chrome: PublicChrome; locale: string;
  variant?: "nextIntro" | "nextSession" | "nextShort"; href?: string; qa?: string; className?: string; pending?: boolean;
}) {
  // While the free times load (`pending`), an invisible line keeps its place, so nothing below moves.
  if (pending && !data) return <p className={className} aria-hidden="true" style={{ visibility: "hidden" }}><span className="eg2-lamp" /><span>&nbsp;</span></p>;
  if (!data || !iso) return null;
  const body = <><span className="eg2-lamp" aria-hidden="true" /><span>{slotText(chrome, iso, data.timezone, locale, variant)}</span></>;
  return href ? <a className={className} href={href} data-qa={qa}>{body}</a> : <p className={className} data-qa={qa}>{body}</p>;
}

const WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayName(day: string, locale: string, style: "long" | "short") {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en", { weekday: style, timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, 9, 11 + WEEK.indexOf(day))));
}

/** "Open now · closes at 18:00" (Habesha clock when asked). */
export function OpenBadge({ days, now, chrome, locale, habesha }: { days: OpeningDay[]; now: TimeOfDay; chrome: PublicChrome; locale: string; habesha: boolean }) {
  if (!days.length) return null;
  const state = openState(days, now);
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  const text = state.open ? chrome.t("openNow", { time: time(state.closes || "") })
    : state.opensToday ? chrome.t("opensToday", { time: time(state.opens || "") })
    : state.opensDay ? chrome.t("opensOn", { day: dayName(state.opensDay, locale, "long"), time: time(state.opens || "") }) : "";
  if (!text) return null;
  return <p className="eg2-open" data-open={state.open} data-qa="ergata-open-now"><span className="eg2-lamp" aria-hidden="true" />{text}</p>;
}

/** The International / Habesha clock switch (Habesha first on Amharic pages). */
export function ClockSwitch({ chrome, habesha, onHabesha }: { chrome: PublicChrome; habesha: boolean; onHabesha: (value: boolean) => void }) {
  return <div className="eg2-clock" role="group" aria-label={chrome.t("clockFormat")}>
    <button type="button" aria-pressed={!habesha} onClick={() => onHabesha(false)}>{chrome.t("internationalTime")}</button>
    <button type="button" aria-pressed={habesha} onClick={() => onHabesha(true)} data-qa="ergata-habesha-toggle">{chrome.t("habeshaTime")}</button>
  </div>;
}

/** The weekly hours of one place, in the chosen clock. */
export function HoursList({ days, locale, habesha, label }: { days: OpeningDay[]; locale: string; habesha: boolean; label: string }) {
  if (!days.length) return null;
  const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sorted = [...days].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  return <div className="eg2-hours">
    <p className="eg2-hours-label"><Icon name="clock" />{label}</p>
    <dl>{sorted.map((row) => <div key={row.day + row.open}>
      <dt>{dayName(row.day, locale, "short")}</dt>
      <dd>{time(row.open)} – {time(row.close)}</dd>
    </div>)}</dl>
  </div>;
}

export interface Voice { quote: string; who: string; role: string }

/**
 * Kind words: from three quotes, a slow marquee of quiet cards with a pause button (it pauses on
 * hover and focus, and is a still grid with reduced motion); with one or two, a pull quote beside a photo.
 */
export function Voices({ items, chrome, level, aside }: { items: Voice[]; chrome: PublicChrome; level: MotionLevel; aside?: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const marquee = useMarquee(track, level);
  if (items.length < 3) {
    const [first, second] = items;
    if (!first) return null;
    return <div className="eg2-pull" data-reveal="rise">
      {aside}
      <figure>
        <Icon name="quote" className="eg2-quote-mark" />
        <blockquote><p>{first.quote}</p></blockquote>
        <figcaption><strong>{first.who}</strong>{first.role ? <span>{first.role}</span> : null}</figcaption>
        {second ? <blockquote className="eg2-pull-second"><p>{second.quote}</p><footer>{second.who}</footer></blockquote> : null}
      </figure>
    </div>;
  }
  return <div className="eg2-marquee" data-reveal="rise">
    {aside}
    <div className="eg2-marquee-view">
      <div ref={track} className="eg2-marquee-track" data-qa="ergata-voices">
        {[0, 1].map((copy) => <ul key={copy} className="eg2-marquee-group" aria-hidden={copy === 1 || undefined}>
          {items.map((item, index) => <li key={index} data-tone={index % 3}>
            <Icon name="quote" className="eg2-quote-mark" />
            <blockquote><p>{item.quote}</p></blockquote>
            <p className="eg2-voice-who"><strong>{item.who}</strong>{item.role ? <span>{item.role}</span> : null}</p>
          </li>)}
        </ul>)}
      </div>
    </div>
    {marquee.state !== "static" ? <button type="button" className="eg2-pause" onClick={marquee.toggle} aria-pressed={marquee.userPaused}
      data-qa="ergata-voices-pause"><Icon name={marquee.userPaused ? "play" : "pause"} className="eg2-icon eg2-pause-icon" />{marquee.userPaused ? chrome.t("playReviews") : chrome.t("pauseReviews")}</button> : null}
  </div>;
}
