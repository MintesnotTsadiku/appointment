import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import type { CompiledDesign } from "../../types";
import type { ChromeKey, PublicChrome } from "../chrome";
import { contentImage, type ContentImage } from "../content";
import {
  allows, habeshaPhrase, loadingAttributes, openState, pictureSet, slotLabel, useMarquee,
  type MotionLevel, type NextAvailability, type OpeningDay, type SlotFacts, type TimeOfDay,
} from "../kit";
import { Quote } from "./art";

/* Meron v3 building blocks. Visual components of this package only; never imported by another template. */

/** Meron's own chrome strings live under `publicSite.meron.*` (English and Amharic catalogs). */
export type MeronKey =
  | "lookSuit" | "lookWrap" | "lookKemis" | "alteration" | "tagNo" | "chooseTime" | "clothToFitting" | "theMaker"
  | "theAtelier" | "nextFitting" | "mapStreet" | "mapGate" | "mapCourtyard" | "mapFittingRoom" | "mapLabel"
  | "pauseFilm" | "playFilm" | "frameOf";

export function mt(chrome: PublicChrome, key: MeronKey, values?: Record<string, string | number>): string {
  return chrome.t(`meron.${key}` as ChromeKey, values);
}

export interface Art {
  src: string;
  alt: string;
  position?: string;
  mobileSrc?: string;
  width?: number;
  height?: number;
  mobileWidth?: number;
  mobileHeight?: number;
  darkSrc?: string;
  darkMobileSrc?: string;
  formats?: string[];
  widths?: number[];
}

/** A recipe image role with its art direction, or null. */
export function role(design: CompiledDesign, name: string): Art | null {
  const found = design.assets[name] as (Omit<Art, "alt" | "position"> & { alt?: string; focalPoint?: { x: number; y: number } }) | undefined;
  if (!found?.src) return null;
  const focus = found.focalPoint ? `${Math.round(found.focalPoint.x * 100)}% ${Math.round(found.focalPoint.y * 100)}%` : undefined;
  const { focalPoint: _focal, ...rest } = found;
  return { ...rest, alt: found.alt || "", ...(focus ? { position: focus } : {}) };
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

/** The smallest packaged file of a photo, for textures and small frames. */
export function smallest(image: Art): string {
  const width = image.widths?.length ? Math.min(...image.widths) : 0;
  return width && /\.webp$/.test(image.src) ? image.src.replace(/\.webp$/, `-w${width}.webp`) : image.src;
}

interface PhotoProps {
  image: Art;
  sizes?: string;
  eager?: boolean;
  night?: boolean;
  className?: string;
  decorative?: boolean;
  style?: CSSProperties;
}

/** `<picture>` with AVIF/WebP, widths, the mobile crop and the night photo. */
export function Photo({ image, sizes = "100vw", eager = false, night = false, className, decorative = false, style }: PhotoProps) {
  const set = pictureSet(image, { night, sizes });
  return <picture className={className} style={style}>
    {set.sources.map((source) => <source key={`${source.type}-${source.media || "all"}`} {...source} />)}
    <img {...loadingAttributes(eager)} {...set.img} alt={decorative ? "" : image.alt}
      style={image.position ? { objectPosition: image.position } : undefined} />
  </picture>;
}

/** "today" / "tomorrow" / a weekday, then the time (with the Habesha clock in Amharic). */
export function slotText(chrome: PublicChrome, iso: string, zone: string, locale: string, variant: "fitting" | "plain" | "short" = "fitting") {
  const label = slotLabel(iso, new Date(), zone, locale);
  const when = label.when === "today" ? chrome.t("today") : label.when === "tomorrow" ? chrome.t("tomorrow") : label.weekday;
  if (variant === "short") return `${when} ${label.time}`;
  const time = locale === "am" ? `${label.time} (${habeshaPhrase(label.time)})` : label.time;
  return variant === "fitting" ? mt(chrome, "nextFitting", { when, time }) : chrome.t("nextFree", { when, time });
}

/** The live "next free fitting" chip; renders nothing while loading or when the data has no free time. */
export function NextChip({ facts, data, chrome, locale, variant = "fitting", href, qa }: {
  facts: SlotFacts | null | undefined; data: NextAvailability | null; chrome: PublicChrome; locale: string;
  variant?: "fitting" | "plain" | "short"; href?: string; qa?: string;
}) {
  if (!data || !facts?.next) return null;
  const body = <><span className="m3-knot" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale, variant)}</>;
  return href ? <a className="m3-chip" href={href} data-qa={qa}>{body}</a> : <p className="m3-chip" data-qa={qa}>{body}</p>;
}

const WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function weekday(day: string, locale: string, style: "long" | "short") {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en", { weekday: style, timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, 9, 11 + WEEK.indexOf(day))));
}

/** "Open now · closes at 18:00", with the Habesha clock when asked. */
export function OpenBadge({ days, now, chrome, locale, habesha, qa = "meron-open-now" }: { days: OpeningDay[]; now: TimeOfDay; chrome: PublicChrome; locale: string; habesha: boolean; qa?: string }) {
  if (!days.length) return null;
  const state = openState(days, now);
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  const text = state.open ? chrome.t("openNow", { time: time(state.closes || "") })
    : state.opensToday ? chrome.t("opensToday", { time: time(state.opens || "") })
    : state.opensDay ? chrome.t("opensOn", { day: weekday(state.opensDay, locale, "long"), time: time(state.opens || "") }) : "";
  if (!text) return null;
  return <p className="m3-open" data-open={state.open} data-qa={qa}><span className="m3-knot" aria-hidden="true" />{text}</p>;
}

/** The weekly hours with an International / Habesha clock switch. */
export function HoursList({ days, chrome, locale, habesha, onHabesha }: { days: OpeningDay[]; chrome: PublicChrome; locale: string; habesha: boolean; onHabesha: (value: boolean) => void }) {
  if (!days.length) return null;
  const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sorted = [...days].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  return <div className="m3-hours">
    <div className="m3-clock" role="group" aria-label={chrome.t("clockFormat")}>
      <button type="button" aria-pressed={!habesha} onClick={() => onHabesha(false)}>{chrome.t("internationalTime")}</button>
      <button type="button" aria-pressed={habesha} onClick={() => onHabesha(true)} data-qa="meron-habesha-toggle">{chrome.t("habeshaTime")}</button>
    </div>
    <dl>{sorted.map((row) => <div key={row.day + row.open}>
      <dt>{weekday(row.day, locale, "short")}</dt>
      <dd>{time(row.open)} – {time(row.close)}</dd>
    </div>)}</dl>
  </div>;
}

/**
 * The centre panel of the hero: a slow ken-burns film of three stills (measure, cut, fit). The first
 * still is the LCP image. It moves only at `standard` or more, only while it is on screen and the tab
 * is visible, and the visitor can pause it. Reduced motion shows the first still.
 */
export function KenBurns({ frames, night, level, chrome, eager = true }: { frames: Art[]; night: boolean; level: MotionLevel; chrome: PublicChrome; eager?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const moving = frames.length > 1 && allows(level, "standard");
  // Only the first still loads with the page; the others join after the first paint.
  const [mounted, setMounted] = useState(1);
  useEffect(() => {
    if (!moving) return undefined;
    const timer = window.setTimeout(() => setMounted(frames.length), 1800);
    return () => window.clearTimeout(timer);
  }, [moving, frames.length]);
  useEffect(() => {
    const node = box.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    // Watch the plain section box: the film sits inside the folding screen's 3D context.
    const target = node.closest("section") || node;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!moving || !visible || paused) return undefined;
    const step = level === "expressive" ? 7000 : 8000;
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") setIndex((value) => (value + 1) % frames.length); }, step);
    return () => window.clearInterval(timer);
  }, [moving, visible, paused, level, frames.length]);
  if (!frames.length) return null;
  return <div ref={box} className="m3-film" data-running={moving && visible && !paused} data-qa="meron-film">
    {frames.slice(0, mounted).map((frame, position) => <Photo key={frame.src} image={frame} night={night} eager={eager && position === 0}
      sizes="(max-width: 760px) 60vw, 460px" decorative={position !== index}
      className={position === index ? "m3-film-frame is-on" : "m3-film-frame"} style={{ "--k": position } as CSSProperties} />)}
    {moving ? <button type="button" className="m3-film-pause" onClick={() => setPaused((value) => !value)} aria-pressed={paused} data-qa="meron-film-pause">
      <span className="m3-sr">{paused ? mt(chrome, "playFilm") : mt(chrome, "pauseFilm")}</span>
      <span aria-hidden="true" className={paused ? "m3-icon-play" : "m3-icon-pause"} />
    </button> : null}
    <p className="m3-film-count" aria-hidden="true">{mt(chrome, "frameOf", { index: index + 1, count: frames.length })}</p>
  </div>;
}

/** A before/after alteration with a keyboard-accessible slider (a native range input). */
export function BeforeAfter({ before, after, chrome, caption }: { before: Art; after: Art; chrome: PublicChrome; caption: string }) {
  const [value, setValue] = useState(50);
  return <figure className="m3-compare" style={{ "--split": `${value}%` } as CSSProperties} data-qa="meron-before-after">
    <div className="m3-compare-frame">
      <Photo image={after} sizes="(max-width: 760px) 86vw, 420px" className="m3-compare-after" />
      <Photo image={before} sizes="(max-width: 760px) 86vw, 420px" className="m3-compare-before" />
      <span className="m3-compare-tag m3-compare-tag-before" aria-hidden="true">{chrome.t("before")}</span>
      <span className="m3-compare-tag m3-compare-tag-after" aria-hidden="true">{chrome.t("after")}</span>
      <span className="m3-compare-seam" aria-hidden="true" />
      <input type="range" min={0} max={100} value={value} onChange={(event) => setValue(Number(event.target.value))}
        aria-label={chrome.t("compare")} aria-valuetext={`${chrome.t("before")} ${value}%`} data-qa="meron-compare-range" />
    </div>
    <figcaption>{caption}</figcaption>
  </figure>;
}

export interface Review { quote: string; who: string; role: string }

/**
 * Reviews: one big pull quote (the first review). From three reviews, the others run in a slow row of
 * fitting slips with a pause button; the row is a still grid without JavaScript or with reduced motion.
 */
export function Reviews({ items, chrome, level, aside }: { items: Review[]; chrome: PublicChrome; level: MotionLevel; aside?: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const marquee = useMarquee(track, level);
  const [first, ...rest] = items;
  if (!first) return null;
  return <>
    <div className="m3-wrap m3-pull" data-reveal="rise">
      {aside}
      <figure>
        <Quote className="m3-quote-mark" />
        <blockquote><p>{first.quote}</p></blockquote>
        <figcaption><strong>{first.who}</strong>{first.role ? <span>{first.role}</span> : null}</figcaption>
      </figure>
    </div>
    {rest.length >= 2 ? <div className="m3-marquee" data-reveal="rise">
      <div ref={track} className="m3-marquee-track" data-qa="meron-reviews">
        <div className="m3-marquee-row">
          {[0, 1].map((copy) => <ul key={copy} className="m3-marquee-group" aria-hidden={copy === 1 || undefined}>
            {[...rest, ...(rest.length < 4 ? rest : [])].map((review, index) => <li key={index} className="m3-slip">
              <blockquote><p>{review.quote}</p></blockquote>
              <p className="m3-slip-who"><strong>{review.who}</strong>{review.role ? <span>{review.role}</span> : null}</p>
            </li>)}
          </ul>)}
        </div>
      </div>
      {marquee.state !== "static" ? <div className="m3-wrap m3-marquee-bar"><button type="button" className="m3-mini" onClick={marquee.toggle} aria-pressed={marquee.userPaused}
        data-qa="meron-reviews-pause">{marquee.userPaused ? chrome.t("playReviews") : chrome.t("pauseReviews")}</button></div> : null}
    </div> : null}
  </>;
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
  return <button type="button" className="m3-mini" onClick={() => { navigator.clipboard.writeText(text).then(() => setDone(true)).catch(() => undefined); }}>
    <span aria-live="polite">{done ? chrome.t("copied") : chrome.t("copyAddress")}</span>
  </button>;
}
