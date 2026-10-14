import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import type { CompiledDesign } from "../../types";
import type { PublicChrome } from "../chrome";
import { contentImage, type ContentImage } from "../content";
import {
  habeshaPhrase, loadingAttributes, openState, pictureSet, slotLabel, useMarquee,
  type MotionLevel, type NextAvailability, type OpeningDay, type PictureAsset, type SlotFacts, type TimeOfDay,
} from "../kit";
import { Quote } from "./art";

/* Bloom v3 building blocks. Visual components of this package only; never imported by another template. */

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
  return role(design, fallback);
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
export function slotText(chrome: PublicChrome, iso: string, zone: string, locale: string, key: "nextFree" | "nextFreeChair" | "short" = "nextFree") {
  const label = slotLabel(iso, new Date(), zone, locale);
  const when = label.when === "today" ? chrome.t("today") : label.when === "tomorrow" ? chrome.t("tomorrow") : label.weekday;
  if (key === "short") return `${when} ${label.time}`;
  return chrome.t(key, { when, time: locale === "am" ? `${label.time} (${habeshaPhrase(label.time)})` : label.time });
}

/** The live "next free" chip; renders nothing while loading or when the data has no free time. */
export function NextChip({ facts, data, chrome, locale, variant = "nextFree", href, qa }: {
  facts: SlotFacts | null | undefined; data: NextAvailability | null; chrome: PublicChrome; locale: string;
  variant?: "nextFree" | "nextFreeChair" | "short"; href?: string; qa?: string;
}) {
  if (!data || !facts?.next) return null;
  const text = slotText(chrome, facts.next, data.timezone, locale, variant);
  const body = <><span className="b3-pulse" aria-hidden="true" />{text}</>;
  return href
    ? <a className="b3-chip" href={href} data-qa={qa}>{body}</a>
    : <p className="b3-chip" data-qa={qa}>{body}</p>;
}

/** "Open now · closes 19:00" with the Habesha clock in Amharic. */
export function OpenBadge({ days, now, chrome, locale, habesha }: { days: OpeningDay[]; now: TimeOfDay; chrome: PublicChrome; locale: string; habesha: boolean }) {
  if (!days.length) return null;
  const state = openState(days, now);
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  const dayName = (day: string) => new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en", { weekday: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, 9, 11 + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(day))));
  const text = state.open ? chrome.t("openNow", { time: time(state.closes || "") })
    : state.opensToday ? chrome.t("opensToday", { time: time(state.opens || "") })
    : state.opensDay ? chrome.t("opensOn", { day: dayName(state.opensDay), time: time(state.opens || "") }) : "";
  if (!text) return null;
  return <p className="b3-open" data-open={state.open} data-qa="bloom-open-now"><span className="b3-pulse" aria-hidden="true" />{text}</p>;
}

/** The weekly hours with an International / Habesha clock switch. */
export function HoursList({ days, chrome, locale, habesha, onHabesha }: { days: OpeningDay[]; chrome: PublicChrome; locale: string; habesha: boolean; onHabesha: (value: boolean) => void }) {
  if (!days.length) return null;
  const fmt = new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en", { weekday: "short", timeZone: "UTC" });
  const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sorted = [...days].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  return <div className="b3-hours">
    <div className="b3-clock" role="group" aria-label={chrome.t("clockFormat")}>
      <button type="button" aria-pressed={!habesha} onClick={() => onHabesha(false)}>{chrome.t("internationalTime")}</button>
      <button type="button" aria-pressed={habesha} onClick={() => onHabesha(true)} data-qa="bloom-habesha-toggle">{chrome.t("habeshaTime")}</button>
    </div>
    <dl>{sorted.map((row) => <div key={row.day + row.open}>
      <dt>{fmt.format(new Date(Date.UTC(2026, 9, 11 + ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(row.day))))}</dt>
      <dd>{time(row.open)} – {time(row.close)}</dd>
    </div>)}</dl>
  </div>;
}

export interface Look { image: Art; caption: string }

/** The hero's stack of three looks in mirror ovals. A button or a swipe brings the next look forward; nothing moves on its own. */
export function LookStack({ looks, chrome, level }: { looks: Look[]; chrome: PublicChrome; level: MotionLevel }) {
  const [front, setFront] = useState(0);
  const start = useRef<number | null>(null);
  if (looks.length < 2) return null;
  const next = () => setFront((value) => (value + 1) % looks.length);
  const previous = () => setFront((value) => (value + looks.length - 1) % looks.length);
  const onDown = (event: ReactPointerEvent) => { start.current = event.clientX; };
  const onUp = (event: ReactPointerEvent) => {
    if (start.current === null) return;
    const moved = event.clientX - start.current;
    start.current = null;
    if (Math.abs(moved) > 36) (moved < 0 ? next : previous)();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight") { event.preventDefault(); next(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
  };
  return <div className="b3-stack" data-motion-level={level} role="group" aria-roledescription="carousel" aria-label={chrome.t("lookbook")}
    onPointerDown={onDown} onPointerUp={onUp} onKeyDown={onKey}>
    <div className="b3-stack-cards">
      {looks.map((look, index) => {
        const place = (index - front + looks.length) % looks.length;
        return <figure key={look.image.src} className="b3-stack-card" data-place={place} aria-hidden={place !== 0}>
          <Photo image={look.image} sizes="180px" decorative={place !== 0} />
        </figure>;
      })}
    </div>
    <div className="b3-stack-bar">
      <button type="button" className="b3-round" onClick={previous} aria-label={chrome.t("previousLook")}>‹</button>
      <p aria-live="polite"><span>{looks[front].caption}</span><small>{chrome.t("lookOf", { index: front + 1, count: looks.length })}</small></p>
      <button type="button" className="b3-round" onClick={next} aria-label={chrome.t("nextLook")} data-qa="bloom-next-look">›</button>
    </div>
  </div>;
}

/** A before/after photo pair with a keyboard-accessible slider (a native range input). */
export function BeforeAfter({ before, after, chrome, caption }: { before: Art; after: Art; chrome: PublicChrome; caption: string }) {
  const [value, setValue] = useState(52);
  return <figure className="b3-compare" style={{ "--split": `${value}%` } as CSSProperties} data-qa="bloom-before-after">
    <div className="b3-compare-frame">
      <Photo image={after} sizes="(max-width: 760px) 92vw, 440px" className="b3-compare-after" />
      <Photo image={before} sizes="(max-width: 760px) 92vw, 440px" className="b3-compare-before" />
      <span className="b3-compare-tag b3-compare-tag-before" aria-hidden="true">{chrome.t("before")}</span>
      <span className="b3-compare-tag b3-compare-tag-after" aria-hidden="true">{chrome.t("after")}</span>
      <span className="b3-compare-handle" aria-hidden="true" />
      <input type="range" min={0} max={100} value={value} onChange={(event) => setValue(Number(event.target.value))}
        aria-label={chrome.t("compare")} aria-valuetext={`${chrome.t("before")} ${value}%`} />
    </div>
    <figcaption>{caption}</figcaption>
  </figure>;
}

export interface Review { quote: string; who: string; role: string }

/** Reviews: a marquee with a pause button from three quotes, otherwise one pull quote. */
export function Reviews({ items, chrome, level, aside }: { items: Review[]; chrome: PublicChrome; level: MotionLevel; aside?: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const marquee = useMarquee(track, level);
  if (items.length < 3) {
    const review = items[0];
    if (!review) return null;
    return <div className="b3-pull" data-reveal="rise">
      {aside}
      <figure>
        <Quote className="b3-quote-mark" />
        <blockquote><p>{review.quote}</p></blockquote>
        <figcaption><strong>{review.who}</strong>{review.role ? <span>{review.role}</span> : null}</figcaption>
      </figure>
    </div>;
  }
  // Both rows carry every review (the second starts further on), so each row is wider than the screen.
  const rows = [items, [...items.slice(2), ...items.slice(0, 2)]];
  return <div className="b3-marquee" data-reveal="rise">
    <div ref={track} className="b3-marquee-track" data-qa="bloom-reviews">
      {rows.map((row, rowIndex) => <div key={rowIndex} className="b3-marquee-row" data-direction={rowIndex ? "right" : "left"}>
        {[0, 1].map((copy) => <ul key={copy} className="b3-marquee-group" aria-hidden={copy === 1 || undefined}>
          {row.map((review, index) => <li key={index}>
            <Quote className="b3-quote-mark" />
            <blockquote><p>{review.quote}</p></blockquote>
            <p className="b3-review-who"><strong>{review.who}</strong>{review.role ? <span>{review.role}</span> : null}</p>
          </li>)}
        </ul>)}
      </div>)}
    </div>
    {marquee.state !== "static" ? <button type="button" className="b3-pause" onClick={marquee.toggle} aria-pressed={marquee.userPaused}
      data-qa="bloom-reviews-pause">{marquee.userPaused ? chrome.t("playReviews") : chrome.t("pauseReviews")}</button> : null}
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
  return <button type="button" className="b3-mini" onClick={() => { navigator.clipboard.writeText(text).then(() => setDone(true)).catch(() => undefined); }}>
    <span aria-live="polite">{done ? chrome.t("copied") : chrome.t("copyAddress")}</span>
  </button>;
}
