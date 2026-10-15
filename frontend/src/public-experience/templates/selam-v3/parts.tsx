import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

import type { CompiledDesign } from "../../types";
import type { PublicChrome } from "../chrome";
import { contentImage, type ContentImage } from "../content";
import {
  habeshaPhrase, haptic, loadingAttributes, openState, pictureSet, slotLabel, useMarquee,
  type MotionLevel, type NextAvailability, type OpeningDay, type PictureAsset, type SlotFacts, type TimeOfDay,
} from "../kit";
import { FRAME_KEYS, sx } from "./copy";
import { MotionArc, Quote } from "./art";

/* Selam v3 building blocks. Visual components of this package only; never imported by another template. */

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

/** The packaged role whose desktop file is `src`, if any. */
export function packagedRole(design: CompiledDesign, src: string): string | undefined {
  return Object.keys(design.assets).find((name) => design.assets[name]?.src === src);
}

/** The owner's photo for a section or item (from release content), else the template role. */
export function art(value: unknown, locale: string, design: CompiledDesign, fallback: string): Art | null {
  const own: ContentImage | null = contentImage(value, locale);
  if (own) {
    // A packaged template photo chosen in content keeps its art direction (mobile crop, night photo, AVIF).
    const packaged = packagedRole(design, own.src);
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
  style?: CSSProperties;
}

/** `<picture>` with AVIF/WebP, widths, the mobile crop and the night photo. */
export function Photo({ image, sizes = "100vw", eager = false, night = false, className, decorative = false, style }: PhotoProps) {
  const set = pictureSet(image, { night, sizes });
  return <picture className={className} style={style}>
    {set.sources.map((source) => <source key={`${source.type}-${source.media || "all"}`} {...source} />)}
    <img {...set.img} {...loadingAttributes(eager)} alt={decorative ? "" : image.alt}
      style={image.position ? { objectPosition: image.position } : undefined} />
  </picture>;
}

/** "today" / "tomorrow" / a weekday, then the time, for a free start. */
export function slotText(chrome: PublicChrome, iso: string, zone: string, locale: string, short = false) {
  const label = slotLabel(iso, new Date(), zone, locale);
  const when = label.when === "today" ? chrome.t("today") : label.when === "tomorrow" ? chrome.t("tomorrow") : label.weekday;
  if (short) return `${when} ${label.time}`;
  return chrome.t("nextFree", { when, time: locale === "am" ? `${label.time} (${habeshaPhrase(label.time)})` : label.time });
}

/** The live "next free" chip; renders nothing while loading or when the data has no free time. */
export function NextChip({ facts, data, chrome, locale, short = false, href, qa }: {
  facts: SlotFacts | null | undefined; data: NextAvailability | null; chrome: PublicChrome; locale: string; short?: boolean; href?: string; qa?: string;
}) {
  if (!data || !facts?.next) return null;
  const body = <><span className="s3-beat" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale, short)}</>;
  return href ? <a className="s3-chip" href={href} data-qa={qa}>{body}</a> : <p className="s3-chip" data-qa={qa}>{body}</p>;
}

const WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayName(day: string, locale: string, style: "long" | "short") {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en", { weekday: style, timeZone: "UTC" }).format(new Date(Date.UTC(2026, 9, 11 + WEEK.indexOf(day))));
}

/** "Open now · closes at 17:00", with the Habesha clock when asked. */
export function OpenBadge({ days, now, chrome, locale, habesha, qa = "selam-open-now" }: { days: OpeningDay[]; now: TimeOfDay; chrome: PublicChrome; locale: string; habesha: boolean; qa?: string }) {
  if (!days.length) return null;
  const state = openState(days, now);
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  const text = state.open ? chrome.t("openNow", { time: time(state.closes || "") })
    : state.opensToday ? chrome.t("opensToday", { time: time(state.opens || "") })
    : state.opensDay ? chrome.t("opensOn", { day: dayName(state.opensDay, locale, "long"), time: time(state.opens || "") }) : "";
  if (!text) return null;
  return <p className="s3-open" data-open={state.open} data-qa={qa}><span className="s3-beat" aria-hidden="true" />{text}</p>;
}

/** The weekly hours with an International / Habesha clock switch. */
export function HoursList({ days, chrome, locale, habesha, onHabesha }: { days: OpeningDay[]; chrome: PublicChrome; locale: string; habesha: boolean; onHabesha: (value: boolean) => void }) {
  if (!days.length) return null;
  const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sorted = [...days].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  return <div className="s3-hours">
    <div className="s3-clock" role="group" aria-label={chrome.t("clockFormat")}>
      <button type="button" aria-pressed={!habesha} onClick={() => onHabesha(false)}>{chrome.t("internationalTime")}</button>
      <button type="button" aria-pressed={habesha} onClick={() => onHabesha(true)} data-qa="selam-habesha-toggle">{chrome.t("habeshaTime")}</button>
    </div>
    <dl>{sorted.map((row) => <div key={row.day + row.open}>
      <dt>{dayName(row.day, locale, "short")}</dt>
      <dd>{time(row.open)} – {time(row.close)}</dd>
    </div>)}</dl>
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
  return <button type="button" className="s3-mini" onClick={() => { navigator.clipboard.writeText(text).then(() => setDone(true)).catch(() => undefined); }}>
    <span aria-live="polite">{done ? chrome.t("copied") : chrome.t("copyAddress")}</span>
  </button>;
}

/** The index of the child of `rail` that fills most of the rail (swipe rails on phones). */
export function useRailIndex(rail: RefObject<HTMLElement | null>, key: unknown): number {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const node = rail.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const items = Array.from(node.children) as HTMLElement[];
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(items.indexOf(entry.target as HTMLElement));
    }, { root: node, threshold: 0.6 });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [rail, key]);
  return active;
}

export interface Frame { image: Art; label: string }

/**
 * The first frame is the hero photo and loads at once. The other four wait for the first scroll or
 * touch, or for a quiet moment after the page has loaded, so they never compete with the first paint.
 */
function useLaterFrames(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return undefined;
    const go = () => setReady(true);
    const events = ["scroll", "touchstart", "pointerdown", "keydown"] as const;
    events.forEach((name) => window.addEventListener(name, go, { once: true, passive: true }));
    let timer = 0;
    const later = () => { timer = window.setTimeout(go, 1500); };
    if (document.readyState === "complete") later(); else window.addEventListener("load", later, { once: true });
    return () => {
      events.forEach((name) => window.removeEventListener(name, go));
      window.removeEventListener("load", later);
      window.clearTimeout(timer);
    };
  }, [ready]);
  return ready;
}

/**
 * "One movement, five frames". With scroll-driven motion (standard and expressive) the stage pins
 * and the scroll scrubs the frames while the lime arc draws (CSS `view-timeline`, or the kit's `--p`).
 * On phones it is a swipe rail of tall pills with dots. Without motion it is a still contact strip.
 * One owner photo (not the template's frames) shows as a single still in the long pill.
 */
export function Flow({ frames, chrome, night, locale }: { frames: Frame[]; chrome: PublicChrome; night: boolean; locale: string }) {
  const rail = useRef<HTMLDivElement>(null);
  const active = useRailIndex(rail, locale);
  const single = frames.length < 2;
  const ready = useLaterFrames();
  const go = (index: number) => {
    const node = rail.current;
    const item = node?.children[index] as HTMLElement | undefined;
    if (!node || !item) return;
    haptic("select");
    node.scrollTo({ left: item.offsetLeft - node.offsetLeft, behavior: "smooth" });
  };
  return <div className="s3-flow" data-scroll="" data-single={single} data-qa="selam-flow" style={{ "--n": frames.length } as CSSProperties}>
    <div className="s3-flow-stage">
      <div className="s3-flow-window" ref={rail} role={single ? undefined : "group"} aria-roledescription={single ? undefined : "carousel"}
        aria-label={single ? undefined : sx(chrome, "flowTitle")} tabIndex={single ? undefined : 0}>
        {frames.map((frame, index) => <figure key={frame.image.src} className="s3-flow-frame" style={{ "--i": index } as CSSProperties} data-frame={index}>
          {index === 0 || ready ? <Photo image={frame.image} eager={index === 0} night={night} sizes="(max-width: 760px) 84vw, 94vw" decorative={index > 0} /> : null}
          {single ? null : <figcaption className="s3-flow-cap"><span className="s3-flow-no" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{frame.label}</figcaption>}
        </figure>)}
        <MotionArc className="s3-flow-arc" />
      </div>
      {single ? null : <div className="s3-flow-meta">
        <p className="s3-flow-title">{sx(chrome, "flowTitle")}</p>
        <ol className="s3-flow-ticks" aria-hidden="true">{frames.map((frame, index) => <li key={index} style={{ "--i": index } as CSSProperties}>
          <span className="s3-flow-no">{String(index + 1).padStart(2, "0")}</span><span className="s3-flow-label">{frame.label}</span>
        </li>)}</ol>
        <div className="s3-flow-dots">{frames.map((frame, index) => <button key={index} type="button" aria-current={index === active ? "true" : undefined}
          aria-label={`${sx(chrome, "showFrame", { index: index + 1 })}: ${frame.label}`} onClick={() => go(index)} data-qa={`selam-frame-dot-${index}`}><i /></button>)}
          <span className="s3-sr" aria-live="polite">{sx(chrome, "frameOf", { index: active + 1, count: frames.length })}</span>
        </div>
      </div>}
    </div>
  </div>;
}

export function frameLabel(chrome: PublicChrome, index: number) {
  return sx(chrome, FRAME_KEYS[index % FRAME_KEYS.length]);
}

export interface Review { quote: string; who: string; role: string }

/**
 * Reviews: the first quote as a magazine pull quote over the lime band, with the client silhouette.
 * From three quotes, the others run in a marquee under it, with a pause button (a still grid without motion).
 */
export function Reviews({ items, chrome, level, photo, title }: { items: Review[]; chrome: PublicChrome; level: MotionLevel; photo?: ReactNode; title: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const marquee = useMarquee(track, level);
  const [lead, ...rest] = items;
  if (!lead) return null;
  const rows = rest.length >= 2 ? rest : [];
  return <>
    <div className="s3-wrap s3-pull">
      {photo}
      <figure className="s3-pull-quote" data-reveal="rise">
        {title}
        <Quote className="s3-quote-mark" />
        <blockquote><p>{lead.quote}</p></blockquote>
        <figcaption><strong>{lead.who}</strong>{lead.role ? <span>{lead.role}</span> : null}</figcaption>
      </figure>
    </div>
    {rows.length ? <div className="s3-marquee" data-reveal="rise">
      <p className="s3-wrap s3-marquee-title">{sx(chrome, "moreReviews")}</p>
      <div ref={track} className="s3-marquee-track" data-qa="selam-reviews">
        <div className="s3-marquee-row">
          {[0, 1].map((copy) => <ul key={copy} className="s3-marquee-group" aria-hidden={copy === 1 || undefined}>
            {rows.map((review, index) => <li key={index}>
              <blockquote><p>{review.quote}</p></blockquote>
              <p className="s3-review-who"><strong>{review.who}</strong>{review.role ? <span>{review.role}</span> : null}</p>
            </li>)}
          </ul>)}
        </div>
      </div>
      {marquee.state !== "static" ? <button type="button" className="s3-pause" onClick={marquee.toggle} aria-pressed={marquee.userPaused}
        data-qa="selam-reviews-pause"><span aria-hidden="true" className="s3-pause-icon" data-paused={marquee.userPaused} />{marquee.userPaused ? chrome.t("playReviews") : chrome.t("pauseReviews")}</button> : null}
    </div> : null}
  </>;
}
