import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from "react";
import { useNavigate } from "react-router-dom";

import { formatPhone, phoneHref } from "@/lib/phone";
import type { BookingTemplateProps, TemplateProps } from "../types";
import type { ContentRecord } from "../content";
import { action, brandLogo, durationMinutes, formatPrice, localized, records, section } from "../content";
import { useTemplateCredit } from "../credit";
import { usePublicChrome, type PublicChrome } from "../chrome";
import { useScrollState } from "../motion";
import {
  bookingTransition, circularModeSwitch, useCountUp, useMotionLevel, useNextAvailability, usePointerEffects,
  useReveal, useScrollProgress, useSectionProgress, useTimeOfDay,
  type MotionLevel, type NextAvailability, type OpeningDay, type TimeOfDay,
} from "../kit";
import { BENEFIT_ART, BeatPath, MotionArc, SmallArc, TempoDial } from "./art";
import { sx } from "./copy";
import { withLimeInk } from "./ink";
import { art, CopyChip, Flow, frameLabel, HoursList, NextChip, OpenBadge, Photo, Reviews, role, slotText, type Art, type Frame, type Review } from "./parts";
import "./selam.css";

/*
 * Selam Movement v3, "Tempo": a sports and wellness magazine in motion. Fresh morning air, breath and
 * rhythm. Shape language: the long pill and the lime motion arc. Lime is energy only: tempo numerals,
 * pace lines, the arc and the booking action. After dark (Addis Ababa time) and in dark mode the page
 * becomes "5:30 am": the studio before sunrise, with the night photos. Behaviour comes from the
 * headless kit; every visual here belongs to this package.
 */

const FRAME_ROLES = ["hero.selam", "flow2.selam", "flow3.selam", "flow4.selam", "flow5.selam"];
const SESSION_ROLES = ["session1.selam", "session2.selam"];
const BEAT_ROLES = ["beat1.selam", "beat2.selam", "beat3.selam"];

function useSelamMotion(root: RefObject<HTMLDivElement | null>, motion: unknown, locale: string) {
  const level = useMotionLevel(motion);
  useReveal(root, level, locale);
  useScrollProgress(root, level, "standard", locale);
  useCountUp(root, level, locale, locale);
  usePointerEffects(root, level, locale);
  return level;
}

/** Night photos: always in dark mode; in light mode after dark in Addis Ababa ("5:30 am"). */
function useNight(mode: TemplateProps["mode"], now: TimeOfDay) {
  return mode === "dark" || now.afterDark;
}

function greeting(chrome: PublicChrome, now: TimeOfDay) {
  return chrome.t(now.part === "morning" ? "greetingMorning" : now.part === "afternoon" ? "greetingAfternoon" : now.part === "evening" ? "greetingEvening" : "greetingNight");
}

function ModeButton({ chrome, mode, toggleMode, level }: { chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; level: MotionLevel }) {
  return <button type="button" className="s3-mode" onClick={(event) => circularModeSwitch(event.currentTarget, toggleMode, level)}
    aria-label={chrome.modeSwitchLabel(mode)} data-qa="selam-mode">
    <span className="s3-mode-icon" aria-hidden="true" />
    <span className="s3-mode-text">{chrome.modeName(mode)}</span>
  </button>;
}

function Bar({ logo, name, root, chrome, mode, toggleMode, level, children }: { logo?: string; name: string; root: string; chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; level: MotionLevel; children?: ReactNode }) {
  const scroll = useScrollState(40);
  return <header className="s3-bar" data-scrolled={scroll.scrolled}>
    <div className="s3-wrap s3-bar-inner">
      <a className="s3-brand" href={root}>{logo ? <img src={logo} alt="" width={36} height={36} /> : null}<span>{name}</span></a>
      {children}
      <ModeButton chrome={chrome} mode={mode} toggleMode={toggleMode} level={level} />
    </div>
    <span className="s3-tempo-line" aria-hidden="true" />
  </header>;
}

/** A booking link that morphs into the booking page header where the browser can. */
function BookLink({ href, label, level, className = "s3-btn", qa, magnetic = true }: { href: string; label: string; level: MotionLevel; className?: string; qa?: string; magnetic?: boolean }) {
  const navigate = useNavigate();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (/\/book(\?|$)/.test(href)) bookingTransition(event, href, navigate, level);
  };
  return <a className={className} href={href} onClick={onClick} data-magnetic={magnetic ? "6" : undefined} data-qa={qa}>
    <span>{label}</span><span className="s3-btn-go" aria-hidden="true">→</span>
  </a>;
}

function placeDays(snapshot: TemplateProps["snapshot"], id: unknown): OpeningDay[] {
  const hours = snapshot.placeHours || {};
  const own = typeof id === "string" ? hours[id] : undefined;
  return (own || Object.values(hours)[0])?.days || [];
}

/** The hero frames: the template's five frames, or the owner's own photo as one still. */
function heroFrames(hero: ContentRecord, locale: string, design: TemplateProps["snapshot"]["compiledDesign"], chrome: PublicChrome): Frame[] {
  const own = art(hero, locale, design, "");
  const flow = FRAME_ROLES.map((name) => role(design, name));
  const ownIsFlow = !own || own.src === flow[0]?.src;
  if (ownIsFlow && flow.every(Boolean)) {
    return (flow as Art[]).map((image, index) => ({ image: index === 0 && own ? { ...image, alt: own.alt || image.alt } : image, label: frameLabel(chrome, index) }));
  }
  const still = own || role(design, "hero.primary");
  return still ? [{ image: still, label: "" }] : [];
}

/** Words of a heading as spans, so they rise in sequence (Amharic splits on word spaces only). */
function Words({ text }: { text: string }) {
  return <>{text.split(/(\s+)/).map((part, index) => (/^\s+$/.test(part) ? part : <span key={index} className="s3-word" style={{ "--w": index / 2 } as CSSProperties}>{part}</span>))}</>;
}

export function SelamSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const credit = useTemplateCredit(chrome);
  const root = useRef<HTMLDivElement>(null);
  const design = snapshot.compiledDesign;
  const level = useSelamMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useNextAvailability(snapshot.booking?.liveAvailability === true, publicRoot);
  const progress = useSectionProgress(root, locale);
  const [habesha, setHabesha] = useState(locale === "am");
  const [room, setRoom] = useState(0);
  const sticky = useScrollState(640);
  const band = useRef<HTMLElement>(null);
  const [bandVisible, setBandVisible] = useState(false);
  useEffect(() => {
    const node = band.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setBandVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const providers = section(snapshot.sections, "providers");
  const process = section(snapshot.sections, "process");
  const proof = section(snapshot.sections, "proof");
  const about = section(snapshot.sections, "about");
  const benefits = section(snapshot.sections, "benefits");
  const testimonials = section(snapshot.sections, "testimonials");
  const faq = section(snapshot.sections, "faq");
  const locations = section(snapshot.sections, "locations");
  const contact = section(snapshot.sections, "contact");
  const booking = section(snapshot.sections, "booking_cta");
  const footer = section(snapshot.sections, "footer");

  const primary = action(hero.primaryAction, locale);
  const secondary = action(hero.secondaryAction, locale);
  const bookingAction = action(booking.action, locale);
  const bookLabel = primary?.label || bookingAction?.label || "";
  const bookHref = primary?.href || bookingAction?.href;
  const bookNow = Boolean(bookHref && bookLabel);
  const logo = brandLogo(design);
  const frames = heroFrames(hero, locale, design, chrome);
  const sessions = records(services.items);
  const longest = Math.max(1, ...sessions.map((item) => durationMinutes(item.durationMinutes) || 0));
  const coaches = records(providers.items);
  const steps = records(process.items);
  const facts = records(proof.items);
  const notes = records(benefits.items);
  const reviews: Review[] = records(testimonials.items).map((item) => ({ quote: localized(item.quote, locale), who: localized(item.attribution, locale), role: localized(item.role, locale) })).filter((item) => item.quote);
  const questions = records(faq.items);
  const rooms = records(locations.items);
  const phone = typeof contact.phone === "string" ? contact.phone : "";
  const data: NextAvailability | null = live.data;
  const days = placeDays(snapshot, rooms[room]?.id);
  const title = localized(hero.title, locale);
  const showDots = progress.sections.length > 4;
  const interlude = art(about, locale, design, "interlude.selam");

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} data-motion-level={level}
    data-night={night} data-daypart={now.part} lang={locale} className="s3" data-template="selam-movement-v3" style={withLimeInk(rootStyle)}>
    <a className="s3-skip" href="#s3-main">{chrome.t("skip")}</a>
    <Bar logo={logo} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode} level={level}>
      <nav aria-label={chrome.t("navLabel")} className="s3-nav">
        {sessions.length ? <a href="#services">{chrome.t("sessions")}</a> : null}
        {coaches.length ? <a href="#team">{sx(chrome, "coach")}</a> : null}
        {rooms.length ? <a href="#visit">{chrome.t("visit")}</a> : null}
        <a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a>
      </nav>
      {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} className="s3-btn s3-bar-book" magnetic={false} /> : null}
    </Bar>

    {showDots ? <nav className="s3-dots" aria-label={chrome.t("onThisPage")} data-hidden={progress.active === 0}>
      <ol>{progress.sections.map((item, index) => <li key={item.id}><a href={`#${item.id}`} aria-current={index === progress.active ? "true" : undefined}><span>{item.label}</span></a></li>)}</ol>
    </nav> : null}

    <main id="s3-main">
      <section className="s3-hero" id="top" data-section={applicationName} aria-labelledby="s3-hero-title">
        <div className="s3-wrap s3-hero-copy">
          <div className="s3-greet" data-qa="selam-greeting"><span className="s3-greet-word">{greeting(chrome, now)}</span>{days.length ? <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={locale === "am"} /> : null}</div>
          <h1 id="s3-hero-title"><Words text={title} /></h1>
          <div className="s3-hero-row">
            {localized(hero.subtitle || hero.body, locale) ? <p className="s3-lede">{localized(hero.subtitle || hero.body, locale)}</p> : null}
            <div className="s3-actions">
              {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} qa="selam-hero-book" /> : null}
              {secondary ? <a className="s3-link" href={secondary.href}>{secondary.label}</a> : null}
              <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} qa="selam-next-free" />
            </div>
          </div>
        </div>
        {frames.length ? <Flow frames={frames} chrome={chrome} night={night} locale={locale} /> : null}
      </section>

      {sessions.length ? <section className="s3-section s3-sessions" id="services" data-section={chrome.t("sessions")} aria-labelledby="s3-sessions-title">
        <div className="s3-wrap">
          <header className="s3-head s3-head-split" data-reveal="rise">
            <p className="s3-eyebrow"><SmallArc className="s3-eyebrow-arc" />{chrome.t("sessions")}</p>
            <h2 id="s3-sessions-title">{localized(services.title, locale)}</h2>
            {localized(services.intro, locale) ? <p className="s3-muted">{localized(services.intro, locale)}</p> : null}
          </header>
          <ul className="s3-session-list" data-reveal-stagger="">{sessions.map((item, index) => {
            const minutes = durationMinutes(item.durationMinutes);
            const price = formatPrice(item.price, item.currency, locale);
            const choose = action(item.action, locale);
            const name = localized(item.name, locale);
            const photo = art(item, locale, design, SESSION_ROLES[index % SESSION_ROLES.length]);
            const facts = typeof item.id === "string" ? data?.services[item.id] : null;
            return <li key={String(item.id || index)} className="s3-session" data-reveal="rise" style={{ "--pace": minutes ? minutes / longest : 0 } as CSSProperties}>
              {photo ? <div className="s3-session-photo" data-pan=""><Photo image={photo} sizes="(max-width: 760px) 40vw, 260px" /></div> : null}
              <div className="s3-session-body">
                {minutes ? <p className="s3-tempo" data-qa={`selam-tempo-${index}`}>
                  <span className="s3-tempo-no" data-count="" aria-hidden="true">{minutes}</span>
                  <span className="s3-tempo-unit" aria-hidden="true">{chrome.t("minutes", { count: "" }).trim()}</span>
                  <span className="s3-sr">{chrome.t("duration")} {chrome.t("minutes", { count: minutes })}</span>
                </p> : null}
                {minutes ? <span className="s3-pace" aria-hidden="true"><i /></span> : null}
                <h3>{name}</h3>
                {localized(item.summary, locale) ? <p className="s3-muted">{localized(item.summary, locale)}</p> : null}
                <div className="s3-session-foot">
                  {price ? <p className="s3-price"><span className="s3-sr">{chrome.t("price")} </span>{price}</p> : null}
                  {facts?.next && data ? <p className="s3-session-live"><span className="s3-beat" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale)}</p> : null}
                </div>
                {choose ? <a className="s3-ghost" href={choose.href} data-qa={`selam-session-book-${index}`}>{chrome.t("bookThis")}<span aria-hidden="true">→</span></a> : null}
              </div>
            </li>;
          })}</ul>
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="s3-interlude" id="story" data-section={localized(about.title, locale)} aria-labelledby="s3-story-title">
        {interlude ? <div className="s3-interlude-photo" data-scroll=""><Photo image={interlude} sizes="100vw" /></div> : null}
        <div className="s3-wrap s3-interlude-inner">
          <div className="s3-story-card" data-reveal="rise">
            <h2 id="s3-story-title">{localized(about.title, locale)}</h2>
            <p>{localized(about.body, locale)}</p>
            {Array.isArray(about.highlights) && about.highlights.length ? <ul className="s3-ledger">{about.highlights.map((entry, index) => <li key={index}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{localized(entry, locale)}</li>)}</ul> : null}
          </div>
        </div>
      </section> : null}

      {coaches.length ? <section className="s3-section s3-coach-band" id="team" data-section={sx(chrome, "coach")} aria-labelledby="s3-team-title" data-solo={coaches.length === 1}>
        <div className="s3-wrap s3-coach-wrap">
          <header className="s3-head s3-coach-head" data-reveal="rise"><p className="s3-eyebrow"><SmallArc className="s3-eyebrow-arc" />{sx(chrome, "coach")}</p><h2 id="s3-team-title">{localized(providers.title, locale)}</h2>
            {localized(providers.intro, locale) ? <p className="s3-muted">{localized(providers.intro, locale)}</p> : null}</header>
          {coaches.length === 1 ? <Coach item={coaches[0]} index={0} locale={locale} chrome={chrome} design={design} data={data} />
            : <ul className="s3-coaches">{coaches.map((item, index) => <li key={String(item.id || index)}><Coach item={item} index={index} locale={locale} chrome={chrome} design={design} data={data} /></li>)}</ul>}
        </div>
      </section> : null}

      {steps.length || facts.length ? <div className="s3-deep">
        {steps.length ? <section className="s3-section s3-beats" id="beats" data-section={localized(process.title, locale)} aria-labelledby="s3-beats-title">
          <div className="s3-wrap">
            <header className="s3-head" data-reveal="rise"><p className="s3-eyebrow"><SmallArc className="s3-eyebrow-arc" />{sx(chrome, "beats")}</p><h2 id="s3-beats-title">{localized(process.title, locale)}</h2>
              {localized(process.intro, locale) ? <p className="s3-muted">{localized(process.intro, locale)}</p> : null}</header>
            <div className="s3-beats-track">
              <BeatPath className="s3-beat-path" />
              <ol className="s3-beats-list" data-reveal-stagger="" style={{ "--beats": steps.length } as CSSProperties}>{steps.map((item, index) => {
                const image = art(item, locale, design, "") || art(process, locale, design, BEAT_ROLES[index % BEAT_ROLES.length]);
                return <li key={index} className="s3-beat-card" data-reveal="rise">
                  {image ? <div className="s3-beat-photo" data-pan=""><Photo image={image} sizes="(max-width: 760px) 72vw, 30vw" /></div> : null}
                  <span className="s3-beat-no" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <h3><span className="s3-sr">{chrome.t("step", { count: index + 1 })}: </span>{localized(item.title, locale)}</h3>
                  <p>{localized(item.description, locale)}</p>
                </li>;
              })}</ol>
            </div>
          </div>
        </section> : null}
        {facts.length ? <section className="s3-proof" aria-labelledby="s3-proof-title">
          <div className="s3-wrap">
            <h2 id="s3-proof-title" className="s3-proof-title">{localized(proof.title, locale)}</h2>
            <ul className="s3-proof-list" data-reveal-stagger="">{facts.map((item, index) => <li key={index} data-reveal="rise">
              <p className="s3-proof-value" data-count="">{localized(item.value, locale)}</p>
              <p className="s3-proof-label">{localized(item.label, locale)}</p>
              {localized(item.detail, locale) ? <p className="s3-proof-detail">{localized(item.detail, locale)}</p> : null}
            </li>)}</ul>
          </div>
        </section> : null}
      </div> : null}

      {notes.length ? <section className="s3-section s3-bento-band" id="benefits" data-section={localized(benefits.title, locale)} aria-labelledby="s3-notes-title">
        <div className="s3-wrap">
          <header className="s3-head" data-reveal="rise"><h2 id="s3-notes-title">{localized(benefits.title, locale)}</h2>{localized(benefits.intro, locale) ? <p className="s3-muted">{localized(benefits.intro, locale)}</p> : null}</header>
          <ul className="s3-bento" data-reveal-stagger="" data-tiles={Math.min(4, notes.length)}>
            {(() => { const image = art(benefits, locale, design, "benefit.selam"); return image ? <li className="s3-tile s3-tile-photo" data-reveal="pill" data-pan=""><Photo image={image} sizes="(max-width: 760px) 92vw, 34vw" decorative /></li> : null; })()}
            {notes.slice(0, 4).map((item, index) => {
              const Icon = BENEFIT_ART[index % BENEFIT_ART.length];
              return <li key={index} className="s3-tile" data-reveal="rise" data-glow=""><span className="s3-tile-no" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><Icon className="s3-tile-art" /><h3>{localized(item.title, locale)}</h3><p className="s3-muted">{localized(item.description, locale)}</p></li>;
            })}
          </ul>
        </div>
      </section> : null}

      {reviews.length ? <section className="s3-reviews" id="reviews" data-section={localized(testimonials.title, locale)} aria-labelledby="s3-reviews-title">
        <Reviews items={reviews} chrome={chrome} level={level}
          title={<h2 id="s3-reviews-title" className="s3-pull-title">{localized(testimonials.title, locale)}</h2>}
          photo={(() => { const image = art(testimonials, locale, design, "quote.selam"); return image ? <div className="s3-pull-photo" data-reveal="pill"><Photo image={image} sizes="(max-width: 760px) 60vw, 360px" decorative /></div> : null; })()} />
      </section> : null}

      {questions.length ? <section className="s3-section s3-faq" id="faq" data-section={localized(faq.title, locale)} aria-labelledby="s3-faq-title">
        <div className="s3-wrap s3-faq-grid">
          <div>
            <header className="s3-head" data-reveal="rise"><h2 id="s3-faq-title">{localized(faq.title, locale)}</h2></header>
            <div className="s3-faq-list">{questions.map((item, index) => <details key={index} name="s3-faq">
              <summary><span className="s3-faq-no" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{localized(item.question, locale)}</span><i aria-hidden="true" /></summary>
              <div className="s3-faq-answer"><p>{localized(item.answer, locale)}</p></div>
            </details>)}</div>
          </div>
          <aside className="s3-ask" data-reveal="rise" aria-label={chrome.t("stillUnsure")}>
            <TempoDial className="s3-ask-dial" />
            <h3>{chrome.t("stillUnsure")}</h3>
            {phone ? <a className="s3-ghost" href={phoneHref(phone) || `tel:${phone.replace(/\s+/g, "")}`}>{chrome.t("call")} · {formatPhone(phone)}</a> : null}
            <HoursList days={days} chrome={chrome} locale={locale} habesha={habesha} onHabesha={setHabesha} />
          </aside>
        </div>
      </section> : null}

      {rooms.length ? <section className="s3-section s3-visit" id="visit" data-section={chrome.t("visit")} aria-labelledby="s3-visit-title">
        <div className="s3-wrap">
          <header className="s3-head" data-reveal="rise"><p className="s3-eyebrow"><SmallArc className="s3-eyebrow-arc" />{chrome.t("visit")}</p><h2 id="s3-visit-title">{localized(locations.title, locale)}</h2>{localized(locations.intro, locale) ? <p className="s3-muted">{localized(locations.intro, locale)}</p> : null}</header>
          {rooms.length > 1 ? <div className="s3-tabs" role="tablist" aria-label={chrome.t("rooms")}>{rooms.map((item, index) => <button key={String(item.id || index)} type="button" role="tab"
            id={`s3-room-tab-${index}`} aria-controls="s3-room-panel" aria-selected={index === room} tabIndex={index === room ? 0 : -1} data-qa={`selam-room-tab-${index}`}
            onClick={() => setRoom(index)} onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const next = (room + (event.key === "ArrowRight" ? 1 : rooms.length - 1)) % rooms.length;
                setRoom(next);
                (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
              }
            }}>{localized(item.name, locale)}</button>)}</div> : null}
          {(() => {
            const item = rooms[room] || rooms[0];
            const image = art(item, locale, design, "studio.selam");
            const directions = action(item.directionsAction, locale);
            const telephone = typeof item.phone === "string" ? item.phone : phone;
            const address = localized(item.address, locale);
            return <div className="s3-room" id="s3-room-panel" role={rooms.length > 1 ? "tabpanel" : undefined} aria-labelledby={rooms.length > 1 ? `s3-room-tab-${room}` : undefined} data-qa="selam-room-panel">
              {image ? <div className="s3-room-photo" key={image.src} data-pan=""><Photo image={image} sizes="(max-width: 760px) 92vw, 60vw" /></div> : null}
              <div className="s3-room-card">
                <h3>{localized(item.name, locale)}</h3>
                <OpenBadge days={placeDays(snapshot, item.id)} now={now} chrome={chrome} locale={locale} habesha={habesha} qa="selam-room-open" />
                <p className="s3-room-address">{address}</p>
                {localized(item.hours, locale) ? <p className="s3-muted">{localized(item.hours, locale)}</p> : null}
                <div className="s3-room-links">
                  <CopyChip text={address} chrome={chrome} />
                  {telephone ? <a className="s3-mini" href={phoneHref(telephone) || `tel:${telephone.replace(/\s+/g, "")}`}><span className="s3-sr">{chrome.t("phone")} </span>{formatPhone(telephone)}</a> : null}
                  {directions ? <a className="s3-mini" href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}
                </div>
              </div>
            </div>;
          })()}
        </div>
      </section> : null}

      {bookNow ? <section ref={band} className="s3-band" id="book" data-section={bookingAction?.label || bookLabel} aria-labelledby="s3-band-title">
        {(() => { const image = art(booking, locale, design, "band.selam"); return image ? <div className="s3-band-photo" data-scroll=""><Photo image={image} night={night} sizes="100vw" decorative /></div> : null; })()}
        <MotionArc className="s3-band-arc" />
        <div className="s3-wrap s3-band-inner">
          <div className="s3-glass" data-reveal="rise">
            <h2 id="s3-band-title">{localized(booking.title, locale)}</h2>
            {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
            <BookLink href={bookingAction?.href || bookHref!} label={bookingAction?.label || bookLabel} level={level} qa="selam-band-book" />
            {data?.next ? <div className="s3-band-live">
              <NextChip facts={{ next: data.next.start, todayLeft: data.todayLeft }} data={data} chrome={chrome} locale={locale} />
              {data.todayLeft && data.todayLeft <= 8 ? <p className="s3-left" data-qa="selam-left-today">{data.todayLeft === 1 ? chrome.t("leftTodayOne") : chrome.t("leftToday", { count: data.todayLeft })}</p> : null}
            </div> : null}
          </div>
        </div>
      </section> : null}
    </main>

    <footer className="s3-footer">
      <div className="s3-footer-ticks" aria-hidden="true" />
      <div className="s3-wrap s3-footer-grid">
        <div>
          <p className="s3-footer-name">{applicationName}<span className="s3-footer-dot" aria-hidden="true" /></p>
          {localized(footer.body, locale) ? <p className="s3-footer-body">{localized(footer.body, locale)}</p> : null}
          <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={habesha} qa="selam-footer-open" />
        </div>
        <ul className="s3-footer-links">
          {sessions.length ? <li><a href="#services">{chrome.t("sessions")}</a></li> : null}
          {coaches.length ? <li><a href="#team">{sx(chrome, "coach")}</a></li> : null}
          {rooms.length ? <li><a href="#visit">{chrome.t("visit")}</a></li> : null}
          <li><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a></li>
          <li><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a></li>
        </ul>
        {bookNow ? <div className="s3-footer-book"><BookLink href={bookHref!} label={bookLabel} level={level} magnetic={false} /></div> : null}
      </div>
      <div className="s3-wrap s3-legal">
        <small>© {new Date().getFullYear()} {applicationName}</small>
        {credit ? <p className="s3-credit" lang={locale} data-qa="template-credit">{credit.before}<a href={credit.href} rel="noopener" data-qa="template-credit-link">{credit.product}</a>{credit.after}</p> : null}
      </div>
    </footer>

    {bookNow ? <div className="s3-sticky" data-show={sticky.scrolled && !bandVisible} data-qa="selam-sticky-book">
      <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} short />
      {/* The thumb bar takes the shorter of the two booking labels, so it fits next to the next free time. */}
      <BookLink href={bookHref!} label={bookingAction?.label && bookingAction.label.length < bookLabel.length ? bookingAction.label : bookLabel} level={level} magnetic={false} />
    </div> : null}
  </div>;
}

/** A coach: the portrait in a tall pill that breaks the band's top edge, the name, tags and the next free time. */
function Coach({ item, index, locale, chrome, design, data }: { item: ContentRecord; index: number; locale: string; chrome: PublicChrome; design: TemplateProps["snapshot"]["compiledDesign"]; data: NextAvailability | null }) {
  const photo = art(item, locale, design, "");
  const name = localized(item.name, locale);
  const choose = action(item.action, locale);
  const tags = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
  return <article className="s3-coach" data-reveal="rise">
    <div className="s3-coach-photo" data-tilt="2">
      {photo ? <div className="s3-coach-pill" data-pan=""><Photo image={{ ...photo, alt: photo.alt || name }} sizes="(max-width: 760px) 72vw, 400px" /></div> : null}
      <SmallArc className="s3-coach-arc" />
    </div>
    <div className="s3-coach-copy">
      {localized(item.role, locale) ? <p className="s3-coach-role">{localized(item.role, locale)}</p> : null}
      <h3>{name}</h3>
      {tags.length ? <ul className="s3-tags">{tags.map((tag) => <li key={tag}>{tag}</li>)}</ul> : null}
      <NextChip facts={typeof item.id === "string" ? data?.providers[item.id] : null} data={data} chrome={chrome} locale={locale} qa={`selam-coach-next-${index}`} />
      {choose ? <a className="s3-ghost" href={choose.href}>{chrome.t("bookWith", { name: name.split(" ")[0] })}<span aria-hidden="true">→</span></a> : null}
    </div>
  </article>;
}

/** The template's own loading screen: a tempo line whose five beats pulse in turn, over the long pill. */
export function SelamLoading({ mode, locale = "en" }: { mode: TemplateProps["mode"]; locale?: string }) {
  const chrome = usePublicChrome(locale);
  return <div className="s3 s3-loading" data-pe-mode={mode} data-template="selam-movement-v3" role="status" aria-busy="true" data-qa="selam-loading">
    <span className="s3-sr">{chrome.t("loadingSite")}</span>
    <div className="s3-load-bar" aria-hidden="true"><i /><i /><i /></div>
    <div className="s3-wrap s3-load-copy" aria-hidden="true">
      <i className="s3-bone s3-bone-short" /><i className="s3-bone s3-bone-title" /><i className="s3-bone s3-bone-title s3-bone-two" />
    </div>
    <div className="s3-wrap" aria-hidden="true">
      <div className="s3-load-pill">
        <svg className="s3-load-arc" viewBox="0 0 1200 400" preserveAspectRatio="none"><path d="M70 318C150 280 260 205 345 196S520 240 600 236 770 140 858 118 1060 70 1130 66" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" vectorEffect="non-scaling-stroke" strokeDasharray="2 9" /></svg>
        <ol className="s3-load-beats">{[0, 1, 2, 3, 4].map((index) => <li key={index} style={{ "--i": index } as CSSProperties} />)}</ol>
      </div>
    </div>
  </div>;
}

/** A plain click on a booking link moves inside the app, so the booking pages open without a full reload. */
function inApp(event: MouseEvent<HTMLAnchorElement>, href: string, navigate: (to: string) => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !href.startsWith("/") || href.startsWith("//")) return;
  event.preventDefault();
  navigate(href);
}

export function SelamBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const navigate = useNavigate();
  const design = snapshot.compiledDesign;
  const root = useRef<HTMLDivElement>(null);
  const level = useSelamMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useNextAvailability(snapshot.booking?.liveAvailability === true, publicRoot);
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const image = art(booking, locale, design, "band.selam");
  const sessions = records(services.items);
  const longest = Math.max(1, ...sessions.map((item) => durationMinutes(item.durationMinutes) || 0));
  const data = live.data;
  return <div ref={root} data-motion={design.motion} data-motion-level={level} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode}
    data-night={night} lang={locale} className="s3 s3-handoff" data-template="selam-movement-v3" style={withLimeInk(rootStyle)}>
    <Bar logo={brandLogo(design)} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode} level={level}>
      <a className="s3-link s3-back" href={publicRoot}>{chrome.t("backToSite")}</a>
    </Bar>
    <main className="s3-handoff-stage">
      <div className="s3-wrap s3-handoff-grid">
        <div className="s3-handoff-panel" data-vt-book="">
          <p className="s3-greet"><span className="s3-greet-word">{greeting(chrome, now)}</span></p>
          <h1>{localized(booking.title, locale)}</h1>
          {localized(booking.body, locale) ? <p className="s3-lede">{localized(booking.body, locale)}</p> : null}
          <div className="s3-actions">
            {bookingPath && label ? <a className="s3-btn" href={bookingPath} onClick={(event) => inApp(event, bookingPath, navigate)} data-magnetic="6" data-qa="selam-handoff-book"><span>{label}</span><span className="s3-btn-go" aria-hidden="true">→</span></a> : null}
            <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} href={bookingPath || undefined} qa="selam-handoff-next" />
          </div>
        </div>
        {image ? <div className="s3-handoff-photo"><Photo image={image} night={night} eager sizes="(max-width: 760px) 92vw, 46vw" decorative /><MotionArc className="s3-handoff-arc" /></div> : null}
      </div>
      {sessions.length ? <div className="s3-wrap"><ol className="s3-handoff-list" aria-label={localized(services.title, locale) || undefined}>{sessions.map((item, index) => {
        const photo = art(item, locale, design, SESSION_ROLES[index % SESSION_ROLES.length]);
        const price = formatPrice(item.price, item.currency, locale);
        const minutes = durationMinutes(item.durationMinutes);
        const facts = typeof item.id === "string" ? data?.services[item.id] : null;
        // Each row opens its own service in the scheduler, with any provider.
        const href = (typeof item.id === "string" && snapshot.bookingPaths?.[item.id]) || bookingPath || "";
        const body = <>
          {photo ? <span className="s3-handoff-thumb" aria-hidden="true"><Photo image={photo} sizes="96px" decorative /></span> : null}
          {minutes ? <span className="s3-handoff-tempo" aria-hidden="true" style={{ "--pace": minutes / longest } as CSSProperties}><b>{minutes}</b><small>{chrome.t("minutes", { count: "" }).trim()}</small></span> : null}
          <span className="s3-handoff-name">{localized(item.name, locale)}</span>
          <span className="s3-handoff-meta">{minutes ? <span className="s3-handoff-min">{chrome.t("minutes", { count: minutes })}</span> : null}{price ? <span>{price}</span> : null}
            {facts?.next && data ? <span className="s3-handoff-live"><span className="s3-beat" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale)}</span> : null}</span>
          {href ? <span className="s3-handoff-go" aria-hidden="true">→</span> : null}
        </>;
        return <li key={String(item.id || index)}>
          {href ? <a className="s3-handoff-row" href={href} lang={locale} onClick={(event) => inApp(event, href, navigate)} data-qa={`selam-handoff-service-${index}`}>{body}</a>
            : <div className="s3-handoff-row">{body}</div>}
        </li>;
      })}</ol></div> : null}
    </main>
  </div>;
}
