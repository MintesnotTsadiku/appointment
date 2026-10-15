import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import type { CompiledDesign } from "../../types";
import type { PublicChrome } from "../chrome";
import { contentImage, type ContentImage } from "../content";
import {
  habeshaPhrase, haptic, loadingAttributes, openState, pictureSet, slotLabel, toGeez, useMarquee,
  type MotionLevel, type NextAvailability, type OpeningDay, type PictureAsset, type SlotFacts, type TimeOfDay,
} from "../kit";
import { Corner, HaOutline, Pointer } from "./art";
import { abugidaText, PHRASE, PHRASE_SOUND } from "./copy";

/* Abugida v3 building blocks. Visual components of this package only; never imported by another template. */

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
    {/* `loading` before `src`: React sets attributes in order, and `src` starts the download. */}
    <img {...loadingAttributes(eager)} {...set.img} alt={decorative ? "" : image.alt}
      style={image.position ? { objectPosition: image.position } : undefined} />
  </picture>;
}

/** A photo in a manuscript window: an arch with a gold line and illuminated corners. */
export function Window({ image, sizes, className = "", night = false, decorative = false, pan = true, children }: {
  image: Art; sizes: string; className?: string; night?: boolean; decorative?: boolean; pan?: boolean; children?: ReactNode;
}) {
  return <figure className={`a3-window ${className}`} data-pan={pan ? "" : undefined}>
    <div className="a3-window-frame"><Photo image={image} sizes={sizes} night={night} decorative={decorative} /></div>
    <Corner className="a3-corner a3-corner-bl" />
    <Corner className="a3-corner a3-corner-br" />
    {children}
  </figure>;
}

/** "today" / "tomorrow" / a weekday, then the time, for a free start. */
export function slotText(chrome: PublicChrome, iso: string, zone: string, locale: string, short = false) {
  const label = slotLabel(iso, new Date(), zone, locale);
  const when = label.when === "today" ? chrome.t("today") : label.when === "tomorrow" ? chrome.t("tomorrow") : label.weekday;
  if (short) return `${when} ${label.time}`;
  return chrome.t("nextFree", { when, time: locale === "am" ? `${label.time} (${habeshaPhrase(label.time)})` : label.time });
}

/** The live "next free" chip; renders nothing while loading or when the data has no free time. */
export function NextChip({ facts, data, chrome, locale, short = false, href, qa, pending = false }: {
  facts: SlotFacts | null | undefined; data: NextAvailability | null; chrome: PublicChrome; locale: string; pending?: boolean;
  short?: boolean; href?: string; qa?: string;
}) {
  // While the free times load (\`pending\`), an invisible chip keeps its place, so nothing below moves.
  if (pending && !data) return <p className="a3-chip" aria-hidden="true" style={{ visibility: "hidden" }}><span className="a3-dot" />&nbsp;</p>;
  if (!data || !facts?.next) return null;
  const body = <><span className="a3-dot" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale, short)}</>;
  return href ? <a className="a3-chip" href={href} data-qa={qa}>{body}</a> : <p className="a3-chip" data-qa={qa}>{body}</p>;
}

const WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function dayName(day: string, locale: string, style: "long" | "short") {
  return new Intl.DateTimeFormat(locale === "am" ? "am-ET" : "en", { weekday: style, timeZone: "UTC" })
    .format(new Date(Date.UTC(2026, 9, 11 + WEEK.indexOf(day))));
}

/** "Open now · closes at 19:00", with the Habesha clock when asked. */
export function OpenBadge({ days, now, chrome, locale, habesha, qa = "abugida-open-now" }: { days: OpeningDay[]; now: TimeOfDay; chrome: PublicChrome; locale: string; habesha: boolean; qa?: string }) {
  if (!days.length) return null;
  const state = openState(days, now);
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  const text = state.open ? chrome.t("openNow", { time: time(state.closes || "") })
    : state.opensToday ? chrome.t("opensToday", { time: time(state.opens || "") })
    : state.opensDay ? chrome.t("opensOn", { day: dayName(state.opensDay, locale, "long"), time: time(state.opens || "") }) : "";
  if (!text) return null;
  return <p className="a3-open" data-open={state.open} data-qa={qa}><span className="a3-dot" aria-hidden="true" />{text}</p>;
}

/** The weekly hours with an International / Habesha clock switch. */
export function HoursList({ days, chrome, locale, habesha, onHabesha }: { days: OpeningDay[]; chrome: PublicChrome; locale: string; habesha: boolean; onHabesha: (value: boolean) => void }) {
  if (!days.length) return null;
  const order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sorted = [...days].sort((a, b) => order.indexOf(a.day) - order.indexOf(b.day));
  const time = (value: string) => (habesha ? habeshaPhrase(value) : value);
  return <div className="a3-hours">
    <div className="a3-clock" role="group" aria-label={chrome.t("clockFormat")}>
      <button type="button" aria-pressed={!habesha} onClick={() => onHabesha(false)}>{chrome.t("internationalTime")}</button>
      <button type="button" aria-pressed={habesha} onClick={() => onHabesha(true)} data-qa="abugida-habesha-toggle">{chrome.t("habeshaTime")}</button>
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
  return <button type="button" className="a3-mini" onClick={() => { navigator.clipboard.writeText(text).then(() => setDone(true)).catch(() => undefined); }}>
    <span aria-live="polite">{done ? chrome.t("copied") : chrome.t("copyAddress")}</span>
  </button>;
}

/** Ge'ez numeral with an Arabic-digit fallback (Ge'ez has no zero). */
export function geez(value: number): string {
  return toGeez(value) || String(value);
}

/*
 * The fidel table of the hero: eight consonants in their seven orders. The first order is rubric red.
 * A block of the table (orders 3 to 7 of the second to seventh consonant) opens as the fidel window
 * that shows the hero photo. Letters ink in one by one; near the pointer they lift (fine pointers).
 */
const CONSONANTS = [0x1200, 0x1208, 0x1210, 0x1218, 0x1220, 0x1228, 0x1230, 0x1240];
const ORDERS = 7;
const WINDOW = { col: 2, row: 1, cols: 5, rows: 6 };

function inWindow(col: number, row: number) {
  return col >= WINDOW.col && col < WINDOW.col + WINDOW.cols && row >= WINDOW.row && row < WINDOW.row + WINDOW.rows;
}

export function FidelTable({ photo, night, children }: { photo: Art | null; night: boolean; children?: ReactNode }) {
  let order = 0;
  return <div className="a3-fidel" data-glow="" style={{ "--cols": ORDERS, "--rows": CONSONANTS.length } as CSSProperties}>
    <ol className="a3-fidel-head" aria-hidden="true">{Array.from({ length: ORDERS }, (_, index) => <li key={index}>{geez(index + 1)}</li>)}</ol>
    <div className="a3-fidel-grid">
      {CONSONANTS.flatMap((base, row) => Array.from({ length: ORDERS }, (_, col) => {
        if (inWindow(col, row)) return null;
        const n = order++;
        return <span key={`${row}-${col}`} className="a3-glyph" data-order={col + 1} aria-hidden="true"
          style={{ "--c": col, "--r": row, "--n": n } as CSSProperties}>{String.fromCodePoint(base + col)}</span>;
      }))}
      {photo ? <figure className="a3-fidel-window" data-reveal="fidel" style={{ gridColumn: `${WINDOW.col + 1} / span ${WINDOW.cols}`, gridRow: `${WINDOW.row + 1} / span ${WINDOW.rows}` }}>
        <div className="a3-fidel-photo"><Photo image={photo} eager night={night} sizes="(max-width: 760px) 70vw, 34vw" /></div>
        <HaOutline className="a3-fidel-ink" />
      </figure> : null}
    </div>
    {children}
  </div>;
}

/** The phrase of the week: Amharic on the front; the sound and the meaning on the back. Both sides stay in the reading order. */
export function PhraseCard({ chrome, locale, image }: { chrome: PublicChrome; locale: string; image: Art | null }) {
  const [turned, setTurned] = useState(false);
  return <div className="a3-phrase" data-turned={turned} data-qa="abugida-phrase">
    {image ? <div className="a3-phrase-photo" data-pan=""><Photo image={image} sizes="(max-width: 760px) 80vw, 300px" /></div> : null}
    <div className="a3-phrase-card">
      <div className="a3-phrase-face a3-phrase-front">
        <p className="a3-eyebrow">{abugidaText(chrome, "phraseTitle")}</p>
        <p className="a3-phrase-text" lang="am">{PHRASE}</p>
      </div>
      <div className="a3-phrase-face a3-phrase-back">
        <p className="a3-eyebrow">{abugidaText(chrome, "phraseSay")}</p>
        <p className="a3-phrase-sound" lang="am-Latn">{PHRASE_SOUND}</p>
        <p className="a3-eyebrow">{abugidaText(chrome, "phraseMeaning")}</p>
        <p className="a3-phrase-meaning" lang={locale}>{abugidaText(chrome, "phraseGloss")}</p>
      </div>
    </div>
    <button type="button" className="a3-ghost a3-phrase-turn" aria-pressed={turned} onClick={() => { haptic("select"); setTurned((value) => !value); }} data-qa="abugida-phrase-turn">
      {turned ? abugidaText(chrome, "turnBack") : abugidaText(chrome, "turnCard")}
    </button>
  </div>;
}

export interface Review { quote: string; who: string; role: string }

/**
 * Reviews as marginalia. The first review is the text of the page; its name sits in the margin as a
 * note with a red pen line. From three reviews the other notes run in a marquee with a pause button.
 */
export function Marginalia({ items, chrome, level }: { items: Review[]; chrome: PublicChrome; level: MotionLevel }) {
  const track = useRef<HTMLDivElement>(null);
  const marquee = useMarquee(track, level);
  const [first, ...rest] = items;
  if (!first) return null;
  const notes = rest.length >= 2 ? rest : [];
  return <div className="a3-margin">
    <figure className="a3-margin-page" data-reveal="ink">
      <span className="a3-quote-mark" aria-hidden="true">“</span>
      <blockquote><p>{first.quote}</p></blockquote>
      <figcaption className="a3-margin-note">
        <Pointer className="a3-margin-pointer" />
        <span className="a3-margin-label">{abugidaText(chrome, "inTheMargin")}</span>
        <strong>{first.who}</strong>{first.role ? <span>{first.role}</span> : null}
      </figcaption>
    </figure>
    {notes.length ? <div className="a3-notes">
      <div ref={track} className="a3-notes-track" data-qa="abugida-reviews">
        {[0, 1].map((copy) => <ul key={copy} className="a3-notes-group" aria-hidden={copy === 1 || undefined}>
          {notes.map((review, index) => <li key={index} style={{ "--tilt": `${index % 2 ? 1.2 : -1}deg` } as CSSProperties}>
            <blockquote><p>{review.quote}</p></blockquote>
            <p className="a3-note-who"><strong>{review.who}</strong>{review.role ? <span>{review.role}</span> : null}</p>
          </li>)}
        </ul>)}
      </div>
      {marquee.state !== "static" ? <button type="button" className="a3-mini a3-pause" onClick={marquee.toggle} aria-pressed={marquee.userPaused}
        data-qa="abugida-reviews-pause">{marquee.userPaused ? chrome.t("playReviews") : chrome.t("pauseReviews")}</button> : null}
    </div> : null}
  </div>;
}
