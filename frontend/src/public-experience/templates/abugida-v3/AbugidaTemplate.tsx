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
import { AratKiloMap, BENEFIT_ART, Corner, HaClip, Rule, Tibeb } from "./art";
import { abugidaText } from "./copy";
import { art, CopyChip, FidelTable, geez, HoursList, Marginalia, NextChip, OpenBadge, Photo, PhraseCard, role, slotText, Window, type Art, type Review } from "./parts";
import { AbugidaHoliday } from "./holiday";
import "./abugida.css";

/*
 * Abugida Language v3, "Living Manuscript": an illuminated Ethiopic manuscript come to life.
 * Parchment, iron-gall ink, one rubric red and a little gold leaf. Shape language: the fidel (the hero
 * photo opens inside the letter ሀ) and the manuscript window (an arch with illuminated corners).
 * Signature motion: ink reveals (text and rules draw like a pen stroke) and drawn ornament borders.
 * After dark (Addis Ababa time) and in dark mode the hero and the band show their candle-lit photos.
 * Behaviour comes from the headless kit; every visual here belongs to this package.
 */

function useAbugidaMotion(root: RefObject<HTMLDivElement | null>, motion: unknown, locale: string) {
  const level = useMotionLevel(motion);
  useReveal(root, level, locale);
  useScrollProgress(root, level, "standard", locale);
  useCountUp(root, level, locale, locale);
  usePointerEffects(root, level, locale);
  return level;
}

/** Night photos: always in dark mode; in light mode after dark in Addis Ababa. */
function useNight(mode: TemplateProps["mode"], now: TimeOfDay) {
  return mode === "dark" || now.afterDark;
}

function greeting(chrome: PublicChrome, now: TimeOfDay) {
  return chrome.t(now.part === "morning" ? "greetingMorning" : now.part === "afternoon" ? "greetingAfternoon" : now.part === "evening" ? "greetingEvening" : "greetingNight");
}

function ModeButton({ chrome, mode, toggleMode, level }: { chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; level: MotionLevel }) {
  return <button type="button" className="a3-mode" onClick={(event) => circularModeSwitch(event.currentTarget, toggleMode, level)}
    aria-label={chrome.modeSwitchLabel(mode)} data-qa="abugida-mode">
    <span className="a3-mode-icon" aria-hidden="true" />
    <span className="a3-mode-text">{chrome.modeName(mode)}</span>
  </button>;
}

function Bar({ logo, name, root, chrome, mode, toggleMode, level, children }: { logo?: string; name: string; root: string; chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; level: MotionLevel; children?: ReactNode }) {
  const scroll = useScrollState(40);
  return <header className="a3-bar" data-scrolled={scroll.scrolled}>
    <div className="a3-wrap a3-bar-inner">
      <a className="a3-brand" href={root}>{logo ? <img src={logo} alt="" width={36} height={36} /> : null}<span>{name}</span></a>
      {children}
      <ModeButton chrome={chrome} mode={mode} toggleMode={toggleMode} level={level} />
    </div>
  </header>;
}

/** A booking link that morphs into the booking page header where the browser can. */
function BookLink({ href, label, level, className = "a3-btn", qa }: { href: string; label: string; level: MotionLevel; className?: string; qa?: string }) {
  const navigate = useNavigate();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (/\/book(\?|$)/.test(href)) bookingTransition(event, href, navigate, level);
  };
  return <a className={className} href={href} onClick={onClick} data-qa={qa}>
    <span>{label}</span><span className="a3-btn-mark" aria-hidden="true">፠</span>
  </a>;
}

function placeDays(snapshot: TemplateProps["snapshot"], id: unknown): OpeningDay[] {
  const hours = snapshot.placeHours || {};
  const own = typeof id === "string" ? hours[id] : undefined;
  return (own || Object.values(hours)[0])?.days || [];
}

function useLiveAvailability(snapshot: TemplateProps["snapshot"], publicRoot: string) {
  return useNextAvailability(snapshot.booking?.liveAvailability === true, publicRoot);
}

/** A section heading with an ornament rule that draws when it enters. */
function Head({ id, eyebrow, title, intro, children }: { id: string; eyebrow?: string; title: string; intro?: string; children?: ReactNode }) {
  return <header className="a3-head">
    {eyebrow ? <p className="a3-eyebrow" data-reveal="ink">{eyebrow}</p> : null}
    <h2 id={id} data-reveal="ink">{title}</h2>
    <Rule className="a3-rule" />
    {intro ? <p className="a3-muted a3-intro" data-reveal="rise">{intro}</p> : null}
    {children}
  </header>;
}

const LESSON_ROLES = ["lesson1.abugida", "lesson2.abugida"];
const STEP_ROLES = ["step1.abugida", "step2.abugida", "step3.abugida"];

export function AbugidaSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const credit = useTemplateCredit(chrome);
  const root = useRef<HTMLDivElement>(null);
  const design = snapshot.compiledDesign;
  const level = useAbugidaMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useLiveAvailability(snapshot, publicRoot);
  const progress = useSectionProgress(root, locale);
  const [habesha, setHabesha] = useState(locale === "am");
  const [room, setRoom] = useState(0);
  const sticky = useScrollState(560);
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
  const gallery = section(snapshot.sections, "gallery");
  const footer = section(snapshot.sections, "footer");

  const primary = action(hero.primaryAction, locale);
  const secondary = action(hero.secondaryAction, locale);
  const bookingAction = action(booking.action, locale);
  const bookLabel = primary?.label || bookingAction?.label || "";
  const bookHref = primary?.href || bookingAction?.href;
  const bookNow = Boolean(bookHref && bookLabel);
  const logo = brandLogo(design);
  const heroImage = art(hero, locale, design, "hero.primary");
  const lessons = records(services.items);
  const coaches = records(providers.items);
  const steps = records(process.items);
  const facts = records(proof.items);
  const notes = records(benefits.items);
  const reviews: Review[] = records(testimonials.items).map((item) => ({ quote: localized(item.quote, locale), who: localized(item.attribution, locale), role: localized(item.role, locale) })).filter((item) => item.quote);
  const questions = records(faq.items);
  const rooms = records(locations.items);
  const plates = records(gallery.items).map((item) => ({ item, image: art(item, locale, design, "") })).filter((row): row is { item: ContentRecord; image: Art } => Boolean(row.image));
  const phone = typeof contact.phone === "string" ? contact.phone : "";
  const email = typeof contact.email === "string" ? contact.email : "";
  const data: NextAvailability | null = live.data;
  const days = placeDays(snapshot, rooms[room]?.id);
  const showDots = progress.sections.length > 4;
  const title = localized(hero.title, locale);

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} data-motion-level={level}
    data-night={night} data-daypart={now.part} lang={locale} className="a3" data-template="abugida-language-v3" style={rootStyle}>
    <HaClip />
    <a className="a3-skip" href="#a3-main">{chrome.t("skip")}</a>
    <Bar logo={logo} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode} level={level}>
      <nav aria-label={chrome.t("navLabel")} className="a3-nav">
        {lessons.length ? <a href="#services">{abugidaText(chrome, "contents")}</a> : null}
        {coaches.length ? <a href="#team">{abugidaText(chrome, "coaches")}</a> : null}
        {questions.length ? <a href="#faq">{chrome.t("questions")}</a> : null}
        {rooms.length ? <a href="#visit">{chrome.t("visit")}</a> : null}
        <a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a>
      </nav>
      {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} className="a3-btn a3-bar-book" /> : null}
    </Bar>

    {showDots ? <nav className="a3-folios" aria-label={chrome.t("onThisPage")} data-hidden={progress.active === 0}>
      <ol>{progress.sections.map((item, index) => <li key={item.id}><a href={`#${item.id}`} aria-current={index === progress.active ? "true" : undefined}>
        <i aria-hidden="true">{geez(index + 1)}</i><span>{item.label}</span></a></li>)}</ol>
    </nav> : null}

    <main id="a3-main">
      <section className="a3-hero" id="top" data-section={applicationName} aria-labelledby="a3-hero-title">
        <div className="a3-wrap a3-hero-grid">
          <div className="a3-hero-copy">
            <div className="a3-greet" data-qa="abugida-greeting"><span className="a3-greet-mark" aria-hidden="true">፨</span><span>{greeting(chrome, now)}</span></div>
            <AbugidaHoliday snapshot={snapshot} locale={locale} chrome={chrome} />
            <h1 id="a3-hero-title" className="a3-initial" data-reveal="ink">{title}</h1>
            {localized(hero.subtitle || hero.body, locale) ? <p className="a3-lede" data-reveal="rise">{localized(hero.subtitle || hero.body, locale)}</p> : null}
            <div className="a3-actions">
              {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} qa="abugida-hero-book" /> : null}
              {secondary ? <a className="a3-link" href={secondary.href}>{secondary.label}</a> : null}
            </div>
            <div className="a3-hero-facts">
              <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} qa="abugida-next-free" />
              {days.length ? <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={locale === "am"} /> : null}
            </div>
          </div>
          <FidelTable photo={heroImage} night={night} />
        </div>
      </section>

      {lessons.length ? <section className="a3-section a3-contents" id="services" data-section={abugidaText(chrome, "contents")} aria-labelledby="a3-contents-title">
        <div className="a3-wrap">
          <div className="a3-page" data-reveal="frame">
            <div className="a3-page-border" data-scroll="" aria-hidden="true"><i className="a3-edge a3-edge-t" /><i className="a3-edge a3-edge-r" /><i className="a3-edge a3-edge-b" /><i className="a3-edge a3-edge-l" /></div>
            <Corner className="a3-corner a3-corner-tl" /><Corner className="a3-corner a3-corner-tr" /><Corner className="a3-corner a3-corner-bl" /><Corner className="a3-corner a3-corner-br" />
            <Head id="a3-contents-title" eyebrow={abugidaText(chrome, "contents")} title={localized(services.title, locale)} intro={localized(services.intro, locale)} />
            <ol className="a3-toc" data-reveal-stagger="">{lessons.map((item, index) => {
              const minutes = durationMinutes(item.durationMinutes);
              const price = formatPrice(item.price, item.currency, locale);
              const choose = action(item.action, locale);
              const name = localized(item.name, locale);
              const photo = art(item, locale, design, LESSON_ROLES[index % LESSON_ROLES.length]);
              const facts = typeof item.id === "string" ? data?.services[item.id] : null;
              const body = <>
                <span className="a3-folio" aria-hidden="true">{geez(index + 1)}</span>
                <span className="a3-toc-name">{name}</span>
                <span className="a3-leader" aria-hidden="true" />
                <span className="a3-toc-facts">
                  {minutes ? <span><span className="a3-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</span> : null}
                  {price ? <span className="a3-toc-price"><span className="a3-sr">{chrome.t("price")} </span>{price}</span> : null}
                </span>
                {localized(item.summary, locale) ? <span className="a3-toc-summary">{localized(item.summary, locale)}</span> : null}
                {facts?.next && data ? <span className="a3-toc-live"><span className="a3-dot" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale)}</span> : null}
              </>;
              return <li key={String(item.id || index)} data-reveal="rise">
                {choose ? <a className="a3-toc-row" href={choose.href} data-qa={`abugida-toc-row-${index}`}>{body}</a> : <div className="a3-toc-row">{body}</div>}
                {photo ? <Window image={photo} sizes="(max-width: 760px) 40vw, 220px" className="a3-toc-photo" /> : null}
              </li>;
            })}</ol>
          </div>
        </div>
      </section> : null}

      {coaches.length ? <section className="a3-section a3-coaches" id="team" data-section={abugidaText(chrome, "coaches")} aria-labelledby="a3-team-title">
        <div className="a3-wrap">
          <Head id="a3-team-title" eyebrow={abugidaText(chrome, "coaches")} title={localized(providers.title, locale)} intro={localized(providers.intro, locale)} />
          <ul className="a3-coach-list" data-reveal-stagger="">{coaches.map((item, index) => {
            const photo = art(item, locale, design, "");
            const name = localized(item.name, locale);
            const choose = action(item.action, locale);
            const tags = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
            const first = name.split(" ")[0];
            return <li key={String(item.id || index)} className="a3-coach" data-reveal="rise">
              {photo ? <Window image={{ ...photo, alt: photo.alt || name }} sizes="(max-width: 760px) 70vw, 300px" className="a3-coach-photo" /> : null}
              <div className="a3-coach-text">
                <h3>{name}</h3>
                {localized(item.role, locale) ? <p className="a3-coach-role">{localized(item.role, locale)}</p> : null}
                {tags.length ? <ul className="a3-tags">{tags.map((tag) => <li key={tag}>{tag}</li>)}</ul> : null}
                <NextChip facts={typeof item.id === "string" ? data?.providers[item.id] : null} data={data} chrome={chrome} locale={locale} qa={`abugida-coach-next-${index}`} />
                {choose ? <a className="a3-ghost" href={choose.href}>{chrome.t("bookWith", { name: first })}</a> : null}
              </div>
            </li>;
          })}</ul>
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="a3-section a3-story" id="story" data-section={localized(about.title, locale)} aria-labelledby="a3-story-title">
        <div className="a3-wrap a3-story-grid">
          {(() => { const image = art(about, locale, design, "section.detail"); return image ? <div className="a3-story-photo" data-scroll="" data-pan=""><Photo image={image} sizes="(max-width: 760px) 92vw, 56vw" /></div> : null; })()}
          <div className="a3-story-text">
            <h2 id="a3-story-title" data-reveal="ink">{localized(about.title, locale)}</h2>
            <Rule className="a3-rule" />
            <p className="a3-dropcap" data-reveal="rise">{localized(about.body, locale)}</p>
            {Array.isArray(about.highlights) && about.highlights.length ? <ul className="a3-highlights">{about.highlights.map((entry, index) => <li key={index}>{localized(entry, locale)}</li>)}</ul> : null}
          </div>
        </div>
      </section> : null}

      {notes.length ? <section className="a3-section a3-glosses" id="phrase" data-section={abugidaText(chrome, "phraseTitle")} aria-labelledby="a3-glosses-title">
        <div className="a3-wrap a3-glosses-grid">
          <PhraseCard chrome={chrome} locale={locale} image={art(benefits, locale, design, "phrase.abugida")} />
          <div>
            <Head id="a3-glosses-title" title={localized(benefits.title, locale)} intro={localized(benefits.intro, locale)} />
            <ol className="a3-gloss-list" data-reveal-stagger="">{notes.map((item, index) => {
              const Icon = BENEFIT_ART[index % BENEFIT_ART.length];
              return <li key={index} data-reveal="rise" data-glow=""><Icon className="a3-gloss-art" /><div><h3>{localized(item.title, locale)}</h3><p className="a3-muted">{localized(item.description, locale)}</p></div></li>;
            })}</ol>
          </div>
        </div>
      </section> : null}

      {steps.length ? <section className="a3-section a3-steps" id="steps" data-section={localized(process.title, locale)} aria-labelledby="a3-steps-title">
        <div className="a3-wrap">
          <Head id="a3-steps-title" title={localized(process.title, locale)} intro={localized(process.intro, locale)} />
          <ol className="a3-step-list" data-reveal-stagger="">{steps.map((item, index) => {
            const number = Number(item.step) || index + 1;
            const image = art(item, locale, design, "") || role(design, STEP_ROLES[index % STEP_ROLES.length]);
            return <li key={index} data-reveal="rise" data-scroll="">
              {image ? <Window image={image} sizes="(max-width: 760px) 44vw, 260px" className="a3-step-photo" decorative /> : null}
              <span className="a3-numeral" aria-hidden="true">{geez(number)}</span>
              <h3><span className="a3-sr">{chrome.t("step", { count: String(number) })}: </span>{localized(item.title, locale)}</h3>
              <p className="a3-muted">{localized(item.description, locale)}</p>
            </li>;
          })}</ol>
        </div>
      </section> : null}

      {facts.length ? <section className="a3-colophon" aria-labelledby="a3-proof-title">
        <div className="a3-wrap">
          <Tibeb className="a3-tibeb" id="a3-tibeb-proof" />
          <h2 id="a3-proof-title" className="a3-colophon-title" data-reveal="ink">{localized(proof.title, locale)}</h2>
          <ul className="a3-proof-list" data-reveal-stagger="">{facts.map((item, index) => <li key={index} data-reveal="rise">
            <span className="a3-proof-numeral" aria-hidden="true">{geez(index + 1)}</span>
            <p className="a3-proof-value" data-count="">{localized(item.value, locale)}</p>
            <p className="a3-proof-label">{localized(item.label, locale)}</p>
            {localized(item.detail, locale) ? <p className="a3-proof-detail">{localized(item.detail, locale)}</p> : null}
          </li>)}</ul>
        </div>
      </section> : null}

      {reviews.length ? <section className="a3-section a3-reviews" id="reviews" data-section={localized(testimonials.title, locale)} aria-labelledby="a3-reviews-title">
        <div className="a3-wrap">
          <Head id="a3-reviews-title" title={localized(testimonials.title, locale)} intro={localized(testimonials.intro, locale)} />
          <Marginalia items={reviews} chrome={chrome} level={level} />
        </div>
      </section> : null}

      {questions.length ? <section className="a3-section a3-faq" id="faq" data-section={localized(faq.title, locale)} aria-labelledby="a3-faq-title">
        <div className="a3-wrap a3-faq-grid">
          <div>
            <Head id="a3-faq-title" title={localized(faq.title, locale)} />
            <div className="a3-faq-list">{questions.map((item, index) => <details key={index} name="a3-faq">
              <summary><span className="a3-faq-no" aria-hidden="true">{geez(index + 1)}</span><span>{localized(item.question, locale)}</span><i aria-hidden="true" /></summary>
              <div className="a3-faq-answer"><p>{localized(item.answer, locale)}</p></div>
            </details>)}</div>
          </div>
          <aside className="a3-ask" aria-label={chrome.t("stillUnsure")}>
            {(() => { const image = art(faq, locale, design, "faq.abugida"); return image ? <Window image={image} sizes="(max-width: 760px) 80vw, 360px" className="a3-ask-photo" /> : null; })()}
            <div className="a3-ask-card" data-reveal="rise">
              <h3>{chrome.t("stillUnsure")}</h3>
              <div className="a3-ask-links">
                {phone ? <a className="a3-ghost" href={phoneHref(phone) || `tel:${phone.replace(/\s+/g, "")}`}>{chrome.t("call")} · {formatPhone(phone)}</a> : null}
                {email ? <a className="a3-mini" href={`mailto:${email}`}><span className="a3-sr">{chrome.t("email")} </span>{email}</a> : null}
              </div>
              <HoursList days={days} chrome={chrome} locale={locale} habesha={habesha} onHabesha={setHabesha} />
            </div>
          </aside>
        </div>
      </section> : null}

      {plates.length ? <section className="a3-section a3-plates" id="plates" data-section={localized(gallery.title, locale) || abugidaText(chrome, "plates")} aria-labelledby="a3-plates-title">
        <div className="a3-wrap">
          <Head id="a3-plates-title" eyebrow={abugidaText(chrome, "plates")} title={localized(gallery.title, locale) || abugidaText(chrome, "plates")} intro={localized(gallery.intro, locale)} />
          <ul className="a3-plate-list" tabIndex={0} aria-label={abugidaText(chrome, "plates")}>{plates.map((row, index) => <li key={row.image.src + index}>
            <Window image={row.image} sizes="(max-width: 760px) 72vw, 300px" className="a3-plate" />
            <p className="a3-plate-caption"><span aria-hidden="true">{geez(index + 1)} · </span>{localized(row.item.caption, locale)}</p>
          </li>)}</ul>
        </div>
      </section> : null}

      {rooms.length ? <section className="a3-section a3-visit" id="visit" data-section={chrome.t("visit")} aria-labelledby="a3-visit-title">
        <div className="a3-wrap">
          <Head id="a3-visit-title" eyebrow={chrome.t("rooms")} title={localized(locations.title, locale)} intro={localized(locations.intro, locale)} />
          {rooms.length > 1 ? <div className="a3-tabs" role="tablist" aria-label={chrome.t("rooms")}>{rooms.map((item, index) => <button key={String(item.id || index)} type="button" role="tab"
            id={`a3-room-tab-${index}`} aria-controls="a3-room-panel" aria-selected={index === room} tabIndex={index === room ? 0 : -1} data-qa={`abugida-room-tab-${index}`}
            onClick={() => setRoom(index)} onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                const next = (room + (event.key === "ArrowRight" ? 1 : rooms.length - 1)) % rooms.length;
                setRoom(next);
                (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
              }
            }}><span aria-hidden="true">{geez(index + 1)}</span> {localized(item.name, locale)}</button>)}</div> : null}
          {(() => {
            const item = rooms[room] || rooms[0];
            const image = art(item, locale, design, room % 2 ? "room2.abugida" : "room1.abugida");
            const directions = action(item.directionsAction, locale);
            const telephone = typeof item.phone === "string" ? item.phone : phone;
            const address = localized(item.address, locale);
            const name = localized(item.name, locale);
            return <div className="a3-room" id="a3-room-panel" role={rooms.length > 1 ? "tabpanel" : undefined} aria-labelledby={rooms.length > 1 ? `a3-room-tab-${room}` : undefined} data-qa="abugida-room-panel">
              {image ? <div className="a3-room-photo" key={image.src} data-pan=""><Photo image={image} sizes="(max-width: 760px) 92vw, 48vw" /></div> : null}
              <div className="a3-room-card">
                <AratKiloMap className="a3-map" label={chrome.t("areaMap", { name })} />
                <h3>{name}</h3>
                <OpenBadge days={placeDays(snapshot, item.id)} now={now} chrome={chrome} locale={locale} habesha={habesha} />
                <p>{address}</p>
                {localized(item.hours, locale) ? <p className="a3-muted">{localized(item.hours, locale)}</p> : null}
                <div className="a3-room-links">
                  <CopyChip text={address} chrome={chrome} />
                  {telephone ? <a className="a3-mini" href={phoneHref(telephone) || `tel:${telephone.replace(/\s+/g, "")}`}><span className="a3-sr">{chrome.t("phone")} </span>{formatPhone(telephone)}</a> : null}
                  {directions ? <a className="a3-mini" href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}
                </div>
              </div>
            </div>;
          })()}
        </div>
      </section> : null}

      {bookNow ? <section ref={band} className="a3-band" id="book" data-section={bookingAction?.label || bookLabel} aria-labelledby="a3-band-title">
        {(() => { const image = art(booking, locale, design, "band.abugida"); return image ? <div className="a3-band-photo" data-scroll=""><Photo image={image} night={night} sizes="100vw" decorative /></div> : null; })()}
        <div className="a3-wrap a3-band-inner">
          <div className="a3-leaf" data-reveal="rise">
            <Corner className="a3-corner a3-corner-tl" /><Corner className="a3-corner a3-corner-tr" /><Corner className="a3-corner a3-corner-bl" /><Corner className="a3-corner a3-corner-br" />
            <h2 id="a3-band-title" className="a3-initial">{localized(booking.title, locale)}</h2>
            {localized(booking.body, locale) ? <p className="a3-muted">{localized(booking.body, locale)}</p> : null}
            <BookLink href={bookingAction?.href || bookHref!} label={bookingAction?.label || bookLabel} level={level} qa="abugida-band-book" />
            {data?.next ? <div className="a3-band-live">
              <NextChip facts={{ next: data.next.start, todayLeft: data.todayLeft }} data={data} chrome={chrome} locale={locale} />
              {data.todayLeft && data.todayLeft <= 8 ? <p className="a3-left" data-qa="abugida-left-today">{data.todayLeft === 1 ? chrome.t("leftTodayOne") : chrome.t("leftToday", { count: data.todayLeft })}</p> : null}
            </div> : null}
          </div>
        </div>
      </section> : null}
    </main>

    <footer className="a3-footer">
      <Tibeb className="a3-tibeb" id="a3-tibeb-footer" />
      <div className="a3-wrap a3-footer-grid">
        <div>
          <p className="a3-footer-name"><span aria-hidden="true">፠ </span>{applicationName}</p>
          {localized(footer.body, locale) ? <p className="a3-muted">{localized(footer.body, locale)}</p> : null}
          <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={habesha} qa="abugida-footer-open" />
        </div>
        <ul className="a3-footer-links">
          {lessons.length ? <li><a href="#services">{abugidaText(chrome, "contents")}</a></li> : null}
          {coaches.length ? <li><a href="#team">{abugidaText(chrome, "coaches")}</a></li> : null}
          {rooms.length ? <li><a href="#visit">{chrome.t("visit")}</a></li> : null}
          <li><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a></li>
          <li><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a></li>
        </ul>
        {bookNow ? <div className="a3-footer-book"><BookLink href={bookHref!} label={bookLabel} level={level} /></div> : null}
      </div>
      <div className="a3-wrap a3-legal">
        <small>© {new Date().getFullYear()} {applicationName}</small>
        {credit ? <p className="a3-credit" lang={locale} data-qa="template-credit">{credit.before}<a href={credit.href} rel="noopener" data-qa="template-credit-link">{credit.product}</a>{credit.after}</p> : null}
      </div>
    </footer>

    {bookNow ? <div className="a3-sticky" data-show={sticky.scrolled && !bandVisible} data-qa="abugida-sticky-book">
      <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} short />
      <BookLink href={bookHref!} label={bookLabel} level={level} />
    </div> : null}
  </div>;
}

/** The template's own loading screen: a parchment page whose fidel letters ink in while the published design loads. */
export function AbugidaLoading({ mode, locale = "en" }: { mode: TemplateProps["mode"]; locale?: string }) {
  const chrome = usePublicChrome(locale);
  const letters = [0x1200, 0x1208, 0x1218, 0x1228].flatMap((base) => Array.from({ length: 7 }, (_, order) => String.fromCodePoint(base + order)));
  return <div className="a3 a3-loading" data-pe-mode={mode} data-template="abugida-language-v3" role="status" aria-busy="true" data-qa="abugida-loading">
    <span className="a3-sr">{chrome.t("loadingSite")}</span>
    <div className="a3-load-bar" aria-hidden="true"><i /><i /><i /></div>
    <div className="a3-wrap a3-load-page" aria-hidden="true">
      <div className="a3-load-copy"><i className="a3-bone a3-bone-initial" /><i className="a3-bone" /><i className="a3-bone a3-bone-short" /><i className="a3-bone a3-bone-btn" /></div>
      <div className="a3-load-fidel">{letters.map((letter, index) => <span key={index} style={{ "--n": index } as CSSProperties}>{letter}</span>)}</div>
    </div>
  </div>;
}

/** A plain click on a booking link moves inside the app, so the booking pages open without a full reload. */
function inApp(event: MouseEvent<HTMLAnchorElement>, href: string, navigate: (to: string) => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !href.startsWith("/") || href.startsWith("//")) return;
  event.preventDefault();
  navigate(href);
}

export function AbugidaBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const navigate = useNavigate();
  const design = snapshot.compiledDesign;
  const root = useRef<HTMLDivElement>(null);
  const level = useAbugidaMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useLiveAvailability(snapshot, publicRoot);
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const image = art(booking, locale, design, "band.abugida");
  const lessons = records(services.items);
  const data = live.data;
  return <div ref={root} data-motion={design.motion} data-motion-level={level} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode}
    data-night={night} lang={locale} className="a3 a3-handoff" data-template="abugida-language-v3" style={rootStyle}>
    <Bar logo={brandLogo(design)} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode} level={level}>
      <a className="a3-link a3-back" href={publicRoot}>{chrome.t("backToSite")}</a>
    </Bar>
    <main className="a3-handoff-stage">
      {image ? <div className="a3-band-photo"><Photo image={image} night={night} eager sizes="100vw" decorative /></div> : null}
      <div className="a3-wrap a3-handoff-grid">
        <div className="a3-leaf a3-handoff-panel" data-vt-book="">
          <Corner className="a3-corner a3-corner-tl" /><Corner className="a3-corner a3-corner-tr" /><Corner className="a3-corner a3-corner-bl" /><Corner className="a3-corner a3-corner-br" />
          <p className="a3-greet"><span className="a3-greet-mark" aria-hidden="true">፨</span><span>{greeting(chrome, now)}</span></p>
          <h1 className="a3-initial">{localized(booking.title, locale)}</h1>
          {localized(booking.body, locale) ? <p className="a3-muted">{localized(booking.body, locale)}</p> : null}
          {bookingPath && label ? <a className="a3-btn" href={bookingPath} onClick={(event) => inApp(event, bookingPath, navigate)} data-qa="abugida-handoff-book"><span>{label}</span><span className="a3-btn-mark" aria-hidden="true">፠</span></a> : null}
          <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} href={bookingPath || undefined} qa="abugida-handoff-next" pending={live.status === "loading"} />
        </div>
        {lessons.length ? <div className="a3-leaf a3-handoff-contents">
          <p className="a3-eyebrow">{abugidaText(chrome, "contents")}</p>
          <ol className="a3-toc" aria-label={localized(services.title, locale) || undefined}>{lessons.map((item, index) => {
            const photo = art(item, locale, design, LESSON_ROLES[index % LESSON_ROLES.length]);
            const price = formatPrice(item.price, item.currency, locale);
            const minutes = durationMinutes(item.durationMinutes);
            const facts = typeof item.id === "string" ? data?.services[item.id] : null;
            // Each row opens its own lesson in the scheduler, with any coach.
            const href = (typeof item.id === "string" && snapshot.bookingPaths?.[item.id]) || bookingPath || "";
            const body = <>
              <span className="a3-folio" aria-hidden="true">{geez(index + 1)}</span>
              <span className="a3-toc-name">{localized(item.name, locale)}</span>
              <span className="a3-leader" aria-hidden="true" />
              <span className="a3-toc-facts">{minutes ? <span>{chrome.t("minutes", { count: minutes })}</span> : null}{price ? <span className="a3-toc-price">{price}</span> : null}</span>
              {facts?.next && data ? <span className="a3-toc-live"><span className="a3-dot" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale)}</span> : null}
              {photo ? <span className="a3-toc-thumb" aria-hidden="true"><Photo image={photo} sizes="64px" decorative /></span> : null}
            </>;
            return <li key={String(item.id || index)}>
              {href ? <a className="a3-toc-row a3-handoff-row" href={href} onClick={(event) => inApp(event, href, navigate)} data-qa={`abugida-handoff-service-${index}`}>{body}</a>
                : <div className="a3-toc-row a3-handoff-row">{body}</div>}
            </li>;
          })}</ol>
        </div> : null}
      </div>
    </main>
  </div>;
}
