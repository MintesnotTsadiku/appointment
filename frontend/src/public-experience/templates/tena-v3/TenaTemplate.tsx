import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from "react";
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
import { AreaMap, BENEFIT_SIGNS, SignArrow } from "./art";
import { art, CopyChip, HoursList, NextChip, OpenBadge, Photo, Reviews, slotText, tt, type Art, type Review } from "./parts";
import "./tena.css";

/*
 * Tena Clinic v3, "Clear Path": a modern, calm private clinic with excellent signage.
 * Shape language: the rounded signage plate and the route line, a dashed teal floor marking that
 * draws down the page as the visitor scrolls, stops at each section and ends at the booking desk.
 * Signal yellow marks "when and where" only (times, durations, steps, open hours, the chosen time).
 * After dark (Addis Ababa time) and in dark mode the hero and the booking band show the clinic at dusk.
 * Behaviour comes from the headless kit; every visual here belongs to this package.
 */

/** Role photos of this package, used when the owner has no photo for a place in the page. */
const SERVICE_ROLES = ["care1.tena", "care2.tena", "care3.tena"];
const VISIT_ROLES = ["visit1.tena", "visit2.tena", "visit3.tena", "visit4.tena"];
const ROOM_ROLES = ["room1.tena", "room2.tena", "room3.tena"];

function useTenaMotion(root: RefObject<HTMLDivElement | null>, motion: unknown, locale: string) {
  const level = useMotionLevel(motion);
  useReveal(root, level, locale);
  useScrollProgress(root, level, "standard", locale);
  useCountUp(root, level, locale, locale);
  usePointerEffects(root, level, locale);
  return level;
}

/** Night photos: always in dark mode; in light mode after dark in Addis Ababa (the hero and the band become dusk stages). */
function useNight(mode: TemplateProps["mode"], now: TimeOfDay) {
  return mode === "dark" || now.afterDark;
}

function greeting(chrome: PublicChrome, now: TimeOfDay) {
  return chrome.t(now.part === "morning" ? "greetingMorning" : now.part === "afternoon" ? "greetingAfternoon" : now.part === "evening" ? "greetingEvening" : "greetingNight");
}

function ModeButton({ chrome, mode, toggleMode, level }: { chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; level: MotionLevel }) {
  return <button type="button" className="t3-mode" onClick={(event) => circularModeSwitch(event.currentTarget, toggleMode, level)}
    aria-label={chrome.modeSwitchLabel(mode)} data-qa="tena-mode">
    <span className="t3-mode-icon" aria-hidden="true" />
    <span className="t3-mode-text">{chrome.modeName(mode)}</span>
  </button>;
}

function Bar({ logo, name, root, chrome, mode, toggleMode, level, children }: { logo?: string; name: string; root: string; chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; level: MotionLevel; children?: ReactNode }) {
  const scroll = useScrollState(40);
  return <header className="t3-bar" data-scrolled={scroll.scrolled}>
    <div className="t3-wrap t3-bar-inner">
      <a className="t3-brand" href={root}>{logo ? <img src={logo} alt="" width={40} height={40} /> : null}<span>{name}</span></a>
      {children}
      <ModeButton chrome={chrome} mode={mode} toggleMode={toggleMode} level={level} />
    </div>
  </header>;
}

/** A booking link that morphs into the booking page header where the browser can. */
function BookLink({ href, label, level, className = "t3-btn", qa, magnetic = true }: { href: string; label: string; level: MotionLevel; className?: string; qa?: string; magnetic?: boolean }) {
  const navigate = useNavigate();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (/\/book(\?|$)/.test(href)) bookingTransition(event, href, navigate, level);
  };
  return <a className={className} href={href} onClick={onClick} data-magnetic={magnetic ? "5" : undefined} data-qa={qa}>
    <span>{label}</span><span className="t3-btn-arrow" aria-hidden="true">→</span>
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

/** The index of the item in the middle of the screen, among `selector` inside `root` (the sticky visit photo follows it). */
function useActiveIndex(root: RefObject<HTMLElement | null>, selector: string, key: unknown): number {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const node = root.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const items = Array.from(node.querySelectorAll<HTMLElement>(selector));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(items.indexOf(entry.target as HTMLElement));
    }, { rootMargin: "-42% 0px -48% 0px" });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [root, selector, key]);
  return active;
}

/** True while `ref` is on screen (the phone booking bar hides over the booking band). */
function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);
  return visible;
}

/** A route stop: the numbered plate where the route line meets a section. */
function Stop({ index }: { index: number }) {
  return <span className="t3-stop" data-reveal="stop" aria-hidden="true">{String(index).padStart(2, "0")}</span>;
}

/** A plain click on a booking link moves inside the app, so the booking pages open without a full reload. */
function inApp(event: MouseEvent<HTMLAnchorElement>, href: string, navigate: (to: string) => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !href.startsWith("/") || href.startsWith("//")) return;
  event.preventDefault();
  navigate(href);
}

function telHref(phone: string) {
  return phoneHref(phone) || `tel:${phone.replace(/\s+/g, "")}`;
}

export function TenaSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const credit = useTemplateCredit(chrome);
  const root = useRef<HTMLDivElement>(null);
  const design = snapshot.compiledDesign;
  const level = useTenaMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useLiveAvailability(snapshot, publicRoot);
  const progress = useSectionProgress(root, locale);
  const [habesha, setHabesha] = useState(locale === "am");
  const [room, setRoom] = useState(0);
  const sticky = useScrollState(560);
  const band = useRef<HTMLElement>(null);
  const bandVisible = useInView(band);

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
  // One label per intent: every booking entry point uses the hero's words.
  const bookLabel = primary?.label || bookingAction?.label || "";
  const bookHref = primary?.href || bookingAction?.href;
  const bookNow = Boolean(bookHref && bookLabel);
  const logo = brandLogo(design);
  const word = (design.identity.shortName || applicationName.split(" ")[0] || "").slice(0, 12);
  const heroImage = art(hero, locale, design, "hero.primary");
  const board = records(services.items);
  const team = records(providers.items);
  const steps = records(process.items);
  const facts = records(proof.items);
  const notes = records(benefits.items);
  const reviews: Review[] = records(testimonials.items).map((item) => ({ quote: localized(item.quote, locale), who: localized(item.attribution, locale), role: localized(item.role, locale) })).filter((item) => item.quote);
  const questions = records(faq.items);
  const rooms = records(locations.items);
  const phone = typeof contact.phone === "string" ? contact.phone : "";
  const data: NextAvailability | null = live.data;
  const days = placeDays(snapshot, rooms[room]?.id);
  const showDots = progress.sections.length > 4;
  const activeStep = useActiveIndex(root, ".t3-visit-steps > li", locale);
  const serviceArt = useMemo(() => board.map((item, index) => art(item, locale, design, SERVICE_ROLES[index % SERVICE_ROLES.length])), [board, locale, design]);
  // The hero card lists the next free time of each service, each a link to that service's time picker.
  const nextRows = data ? board.flatMap((item) => {
    const slot = typeof item.id === "string" ? data.services[item.id] : undefined;
    if (!slot?.next) return [];
    const href = (typeof item.id === "string" && snapshot.bookingPaths?.[item.id]) || action(item.action, locale)?.href || bookHref || "";
    return [{ id: String(item.id), name: localized(item.name, locale), next: slot.next, href }];
  }).slice(0, 3) : [];
  let stop = 0;

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} data-motion-level={level}
    data-night={night} data-daypart={now.part} lang={locale} className="t3" data-template="tena-clinic-v3" style={rootStyle}>
    <a className="t3-skip" href="#t3-main">{chrome.t("skip")}</a>
    <Bar logo={logo} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode} level={level}>
      <nav aria-label={chrome.t("navLabel")} className="t3-nav">
        {board.length ? <a href="#services">{chrome.t("services")}</a> : null}
        {team.length ? <a href="#team">{chrome.t("team")}</a> : null}
        {rooms.length ? <a href="#visit">{chrome.t("visit")}</a> : null}
        {questions.length ? <a href="#faq">{chrome.t("questions")}</a> : null}
        <a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a>
      </nav>
      {phone ? <a className="t3-call" href={telHref(phone)} data-qa="tena-call"><span aria-hidden="true" className="t3-call-icon" /><span>{tt(chrome, "callShort")}</span></a> : null}
      {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} className="t3-btn t3-bar-book" magnetic={false} /> : null}
    </Bar>

    {showDots ? <nav className="t3-dots" aria-label={chrome.t("onThisPage")} data-hidden={progress.active === 0}>
      <ol>{progress.sections.map((item, index) => <li key={item.id}><a href={`#${item.id}`} aria-current={index === progress.active ? "true" : undefined}>
        <i aria-hidden="true">{String(index).padStart(2, "0")}</i><span>{item.label}</span></a></li>)}</ol>
    </nav> : null}

    <main id="t3-main">
      <section className="t3-hero" id="top" data-section={applicationName} aria-labelledby="t3-hero-title">
        <div className="t3-hero-grid">
          <div className="t3-hero-copy">
            <div className="t3-greet" data-qa="tena-greeting"><span>{greeting(chrome, now)}</span>{days.length ? <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={locale === "am"} /> : null}</div>
            {localized(hero.eyebrow, locale) ? <p className="t3-eyebrow">{localized(hero.eyebrow, locale)}</p> : null}
            <h1 id="t3-hero-title">{localized(hero.title, locale)}</h1>
            {localized(hero.subtitle || hero.body, locale) ? <p className="t3-lede">{localized(hero.subtitle || hero.body, locale)}</p> : null}
            <div className="t3-hero-act">
              <SignArrow className="t3-arrow" />
              <div className="t3-actions">
                {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} qa="tena-hero-book" /> : null}
                {phone ? <a className="t3-ghost t3-hero-call" href={telHref(phone)}>{chrome.t("call")}</a> : null}
                {secondary ? <a className="t3-link" href={secondary.href}>{secondary.label}</a> : null}
              </div>
            </div>
          </div>
          <div className="t3-hero-visual">
            {heroImage ? <figure className="t3-hero-photo">
              <Photo image={heroImage} eager night={night} sizes="(max-width: 860px) 100vw, 58vw" />
            </figure> : null}
            <span className="t3-start" aria-hidden="true"><i />{tt(chrome, "youAreHere")}</span>
            {nextRows.length ? <aside className="t3-glass t3-next" aria-labelledby="t3-next-title" data-qa="tena-next-card">
              <h2 id="t3-next-title">{tt(chrome, "nextAppointments")}</h2>
              <ul>{nextRows.map((row) => <li key={row.id}>
                <a href={row.href} data-qa="tena-next-slot"><span>{row.name}</span><strong>{slotText(chrome, row.next, data!.timezone, locale, "short")}</strong></a>
              </li>)}</ul>
              {data?.todayLeft ? <p className="t3-left">{data.todayLeft === 1 ? chrome.t("leftTodayOne") : chrome.t("leftToday", { count: data.todayLeft })}</p> : null}
            </aside> : null}
          </div>
        </div>
      </section>

      <div className="t3-path" data-scroll="">
        <span className="t3-route" aria-hidden="true"><i className="t3-route-base" /><i className="t3-route-ink" /></span>

        {board.length ? <section className="t3-section t3-services" id="services" data-section={chrome.t("services")} aria-labelledby="t3-services-title">
          <Stop index={++stop} />
          <div className="t3-wrap">
            <header className="t3-head" data-reveal="rise">
              <p className="t3-eyebrow">{tt(chrome, "board")}</p>
              <h2 id="t3-services-title">{localized(services.title, locale)}</h2>
              {localized(services.intro, locale) ? <p className="t3-muted">{localized(services.intro, locale)}</p> : null}
            </header>
            <Board items={board} photos={serviceArt} locale={locale} chrome={chrome} data={data} />
          </div>
        </section> : null}

        {steps.length ? <section className="t3-section t3-visit" id="visit-steps" data-section={localized(process.title, locale)} aria-labelledby="t3-visit-title">
          <Stop index={++stop} />
          <div className="t3-wrap t3-visit-grid">
            <div className="t3-visit-visual" aria-hidden="true">
              <div className="t3-visit-frame">{steps.slice(0, 6).map((item, index) => {
                const image = art(item, locale, design, "") || art(process, locale, design, VISIT_ROLES[index % VISIT_ROLES.length]);
                return image ? <Photo key={index} image={image} sizes="(max-width: 860px) 90vw, 40vw" decorative className={index === Math.min(activeStep, steps.length - 1) ? "t3-visit-photo is-on" : "t3-visit-photo"} /> : null;
              })}
                <span className="t3-visit-count">{Math.min(activeStep, steps.length - 1) + 1} / {steps.length}</span>
              </div>
            </div>
            <div>
              <header className="t3-head" data-reveal="rise"><h2 id="t3-visit-title">{localized(process.title, locale)}</h2>{localized(process.intro, locale) ? <p className="t3-muted">{localized(process.intro, locale)}</p> : null}</header>
              <ol className="t3-visit-steps">{steps.map((item, index) => {
                const image = art(item, locale, design, "") || art(process, locale, design, VISIT_ROLES[index % VISIT_ROLES.length]);
                return <li key={index} data-reveal="rise" data-active={index === activeStep}>
                  {image ? <div className="t3-visit-inline" data-pan=""><Photo image={image} sizes="90vw" /></div> : null}
                  <span className="t3-step-plate" aria-hidden="true">{index + 1}</span>
                  <div><h3><span className="t3-sr">{chrome.t("step", { count: index + 1 })}: </span>{localized(item.title, locale)}</h3><p className="t3-muted">{localized(item.description, locale)}</p></div>
                </li>;
              })}</ol>
            </div>
          </div>
        </section> : null}

        {team.length ? <section className="t3-section t3-team" id="team" data-section={chrome.t("team")} aria-labelledby="t3-team-title">
          <Stop index={++stop} />
          <div className="t3-wrap">
            <header className="t3-head" data-reveal="rise"><p className="t3-eyebrow">{tt(chrome, "directory")}</p><h2 id="t3-team-title">{localized(providers.title, locale)}</h2>
              {localized(providers.intro, locale) ? <p className="t3-muted">{localized(providers.intro, locale)}</p> : null}</header>
            <ul className="t3-directory" data-reveal-stagger="">{team.map((item, index) => {
              const photo = art(item, locale, design, "");
              const name = localized(item.name, locale);
              const choose = action(item.action, locale);
              const tags = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
              const first = name.split(" ")[0];
              return <li key={String(item.id || index)} className="t3-person" data-reveal="rise" data-glow="">
                <div className="t3-portrait" data-pan="">{photo ? <Photo image={{ ...photo, alt: photo.alt || name }} sizes="(max-width: 860px) 78vw, 400px" /> : <span className="t3-initial" aria-hidden="true">{name.slice(0, 1)}</span>}
                  <span className="t3-room-tag" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span></div>
                <div className="t3-person-plate">
                  <h3>{name}</h3>
                  {localized(item.role, locale) ? <p className="t3-person-role">{localized(item.role, locale)}</p> : null}
                </div>
                {tags.length ? <ul className="t3-tags">{tags.map((tag) => <li key={tag}>{tag}</li>)}</ul> : null}
                <div className="t3-person-foot">
                  <NextChip facts={typeof item.id === "string" ? data?.providers[item.id] : null} data={data} chrome={chrome} locale={locale} qa={`tena-person-next-${index}`} />
                  {choose ? <a className="t3-ghost" href={choose.href}>{chrome.t("bookWith", { name: first })}</a> : null}
                </div>
              </li>;
            })}</ul>
          </div>
        </section> : null}

        {localized(about.body, locale) ? <section className="t3-section t3-story" id="story" data-section={localized(about.title, locale)} aria-labelledby="t3-story-title">
          <Stop index={++stop} />
          <div className="t3-wrap t3-story-grid">
            {(() => { const image = art(about, locale, design, "section.detail"); return image ? <div className="t3-story-photo" data-reveal="plate" data-pan=""><Photo image={image} sizes="(max-width: 860px) 92vw, 66vw" /></div> : null; })()}
            <div className="t3-story-card" data-reveal="rise">
              <h2 id="t3-story-title">{localized(about.title, locale)}</h2>
              <p>{localized(about.body, locale)}</p>
              {Array.isArray(about.highlights) && about.highlights.length ? <ul className="t3-checks">{about.highlights.map((entry, index) => <li key={index}>{localized(entry, locale)}</li>)}</ul> : null}
            </div>
          </div>
        </section> : null}

        {facts.length ? <section className="t3-proof" aria-labelledby="t3-proof-title">
          {(() => { const image = art(proof, locale, design, "proof.tena"); return image ? <div className="t3-proof-photo" data-scroll=""><Photo image={image} sizes="100vw" decorative /></div> : null; })()}
          <div className="t3-wrap t3-proof-inner">
            <h2 id="t3-proof-title">{localized(proof.title, locale)}</h2>
            <ul className="t3-proof-list" data-reveal-stagger="">{facts.map((item, index) => <li key={index} data-reveal="rise">
              <p className="t3-proof-value" data-count="">{localized(item.value, locale)}</p>
              <p className="t3-proof-label">{localized(item.label, locale)}</p>
              {localized(item.detail, locale) ? <p className="t3-proof-detail">{localized(item.detail, locale)}</p> : null}
            </li>)}</ul>
          </div>
        </section> : null}

        {notes.length ? <section className="t3-section t3-benefits" aria-labelledby="t3-notes-title">
          <Stop index={++stop} />
          <div className="t3-wrap">
            <header className="t3-head" data-reveal="rise"><h2 id="t3-notes-title">{localized(benefits.title, locale)}</h2>{localized(benefits.intro, locale) ? <p className="t3-muted">{localized(benefits.intro, locale)}</p> : null}</header>
            <ul className="t3-bento" data-reveal-stagger="" data-count-tiles={Math.min(notes.length, 4)}>
              {(() => { const image = art(benefits, locale, design, "benefit.tena"); return image ? <li className="t3-tile t3-tile-photo" data-reveal="plate" data-pan=""><Photo image={image} sizes="(max-width: 860px) 92vw, 40vw" /></li> : null; })()}
              {notes.slice(0, 4).map((item, index) => {
                const Sign = BENEFIT_SIGNS[index % BENEFIT_SIGNS.length];
                return <li key={index} className="t3-tile" data-reveal="rise" data-glow=""><Sign className="t3-tile-sign" /><h3>{localized(item.title, locale)}</h3><p className="t3-muted">{localized(item.description, locale)}</p></li>;
              })}
            </ul>
          </div>
        </section> : null}

        {reviews.length ? <section className="t3-section t3-reviews" id="reviews" data-section={localized(testimonials.title, locale)} aria-labelledby="t3-reviews-title">
          <Stop index={++stop} />
          <div className="t3-wrap">
            <header className="t3-head" data-reveal="rise"><h2 id="t3-reviews-title">{localized(testimonials.title, locale)}</h2>{localized(testimonials.intro, locale) ? <p className="t3-muted">{localized(testimonials.intro, locale)}</p> : null}</header>
          </div>
          <Reviews items={reviews} chrome={chrome} level={level}
            aside={(() => { const image = art(testimonials, locale, design, "visit3.tena"); return image ? <div className="t3-pull-photo"><Photo image={image} sizes="(max-width: 860px) 60vw, 320px" /></div> : null; })()} />
        </section> : null}

        {questions.length ? <section className="t3-section t3-faq" id="faq" data-section={localized(faq.title, locale)} aria-labelledby="t3-faq-title">
          <Stop index={++stop} />
          <div className="t3-wrap t3-faq-grid">
            <div>
              <header className="t3-head" data-reveal="rise"><h2 id="t3-faq-title">{localized(faq.title, locale)}</h2></header>
              <div className="t3-faq-list">{questions.map((item, index) => <details key={index} name="t3-faq">
                <summary><span>{localized(item.question, locale)}</span><i aria-hidden="true" /></summary>
                <div className="t3-faq-answer"><p>{localized(item.answer, locale)}</p></div>
              </details>)}</div>
            </div>
            <aside className="t3-ask" data-reveal="rise" aria-label={chrome.t("stillUnsure")}>
              {(() => { const image = art(faq, locale, design, "faq.tena"); return image ? <div className="t3-ask-photo" data-pan=""><Photo image={image} sizes="(max-width: 860px) 92vw, 420px" /></div> : null; })()}
              <div className="t3-ask-card">
                <h3>{chrome.t("stillUnsure")}</h3>
                {phone ? <a className="t3-ghost" href={telHref(phone)}>{chrome.t("call")} · {formatPhone(phone)}</a> : null}
                <HoursList days={days} chrome={chrome} locale={locale} habesha={habesha} onHabesha={setHabesha} />
              </div>
            </aside>
          </div>
        </section> : null}

        {rooms.length ? <section className="t3-section t3-rooms" id="visit" data-section={chrome.t("visit")} aria-labelledby="t3-rooms-title">
          <Stop index={++stop} />
          <div className="t3-wrap">
            <header className="t3-head" data-reveal="rise"><p className="t3-eyebrow">{chrome.t("rooms")}</p><h2 id="t3-rooms-title">{localized(locations.title, locale)}</h2>{localized(locations.intro, locale) ? <p className="t3-muted">{localized(locations.intro, locale)}</p> : null}</header>
            {rooms.length > 1 ? <div className="t3-tabs" role="tablist" aria-label={chrome.t("rooms")}>{rooms.map((item, index) => <button key={String(item.id || index)} type="button" role="tab"
              id={`t3-room-tab-${index}`} aria-controls="t3-room-panel" aria-selected={index === room} tabIndex={index === room ? 0 : -1} data-qa={`tena-room-tab-${index}`}
              onClick={() => setRoom(index)} onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  const next = (room + (event.key === "ArrowRight" ? 1 : rooms.length - 1)) % rooms.length;
                  setRoom(next);
                  (event.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
                }
              }}><i aria-hidden="true">{String(index + 1).padStart(2, "0")}</i>{localized(item.name, locale)}</button>)}</div> : null}
            {(() => {
              const item = rooms[room] || rooms[0];
              const image = art(item, locale, design, ROOM_ROLES[room % ROOM_ROLES.length]);
              const directions = action(item.directionsAction, locale);
              const telephone = typeof item.phone === "string" ? item.phone : phone;
              const address = localized(item.address, locale);
              const name = localized(item.name, locale);
              return <div className="t3-room" id="t3-room-panel" role={rooms.length > 1 ? "tabpanel" : undefined} aria-labelledby={rooms.length > 1 ? `t3-room-tab-${room}` : undefined} data-qa="tena-room-panel">
                {image ? <div className="t3-room-photo" key={image.src} data-pan=""><Photo image={image} sizes="(max-width: 860px) 92vw, 52vw" /></div> : null}
                <div className="t3-room-side">
                  <div className="t3-room-card">
                    <h3>{name}</h3>
                    <OpenBadge days={placeDays(snapshot, item.id)} now={now} chrome={chrome} locale={locale} habesha={habesha} qa="tena-room-open" />
                    <p>{address}</p>
                    {localized(item.hours, locale) ? <p className="t3-muted t3-small">{localized(item.hours, locale)}</p> : null}
                    <div className="t3-room-links">
                      <CopyChip text={address} chrome={chrome} />
                      {telephone ? <a className="t3-mini" href={telHref(telephone)}><span className="t3-sr">{chrome.t("phone")} </span>{formatPhone(telephone)}</a> : null}
                      {directions ? <a className="t3-mini" href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}
                    </div>
                  </div>
                  <figure className="t3-map">
                    <AreaMap className="t3-map-art" />
                    <figcaption>{chrome.t("areaMap", { name })}</figcaption>
                  </figure>
                </div>
              </div>;
            })()}
          </div>
        </section> : null}
      </div>

      {bookNow ? <section ref={band} className="t3-band" id="book" data-section={bookingAction?.label || bookLabel} aria-labelledby="t3-band-title">
        {(() => { const image = art(booking, locale, design, "band.tena"); return image ? <div className="t3-band-photo" data-scroll=""><Photo image={image} night={night} sizes="100vw" decorative /></div> : null; })()}
        <span className="t3-desk" aria-hidden="true"><i />{tt(chrome, "bookingDesk")}</span>
        <div className="t3-wrap t3-band-inner">
          <div className="t3-glass t3-band-card" data-reveal="rise">
            <h2 id="t3-band-title">{localized(booking.title, locale)}</h2>
            {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
            <BookLink href={bookingAction?.href || bookHref!} label={bookingAction?.label || bookLabel} level={level} qa="tena-band-book" />
            {data?.next ? <div className="t3-band-live">
              <NextChip facts={{ next: data.next.start, todayLeft: data.todayLeft }} data={data} chrome={chrome} locale={locale} qa="tena-band-next" />
              {data.todayLeft && data.todayLeft <= 8 ? <p className="t3-left" data-qa="tena-left-today">{data.todayLeft === 1 ? chrome.t("leftTodayOne") : chrome.t("leftToday", { count: data.todayLeft })}</p> : null}
            </div> : null}
          </div>
        </div>
      </section> : null}
    </main>

    <footer className="t3-footer">
      <div className="t3-wrap t3-footer-grid">
        <div className="t3-footer-id">
          <p className="t3-footer-word" aria-hidden="true">{word}</p>
          <p className="t3-footer-name">{applicationName}</p>
          {localized(footer.body, locale) ? <p className="t3-muted">{localized(footer.body, locale)}</p> : null}
          <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={habesha} qa="tena-footer-open" />
        </div>
        <ul className="t3-footer-links">
          {board.length ? <li><a href="#services">{chrome.t("services")}</a></li> : null}
          {team.length ? <li><a href="#team">{chrome.t("team")}</a></li> : null}
          {rooms.length ? <li><a href="#visit">{chrome.t("visit")}</a></li> : null}
          {questions.length ? <li><a href="#faq">{chrome.t("questions")}</a></li> : null}
          <li><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a></li>
          <li><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a></li>
        </ul>
        <div className="t3-footer-book">
          {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} magnetic={false} /> : null}
          {phone ? <a className="t3-mini" href={telHref(phone)}>{chrome.t("call")} · {formatPhone(phone)}</a> : null}
        </div>
      </div>
      <div className="t3-wrap t3-legal">
        <small>© {new Date().getFullYear()} {applicationName}</small>
        {credit ? <p className="t3-credit" lang={locale} data-qa="template-credit">{credit.before}<a href={credit.href} rel="noopener" data-qa="template-credit-link">{credit.product}</a>{credit.after}</p> : null}
      </div>
    </footer>

    {bookNow ? <div className="t3-sticky" data-show={sticky.scrolled && !bandVisible} data-qa="tena-sticky-book">
      {phone ? <a className="t3-sticky-call" href={telHref(phone)} aria-label={chrome.t("call")}><span className="t3-call-icon" aria-hidden="true" /></a> : null}
      <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} variant="short" />
      <BookLink href={bookHref!} label={bookLabel} level={level} magnetic={false} />
    </div> : null}
  </div>;
}

/**
 * The services as an illuminated appointment board: a row per service with the duration on a yellow
 * plate, the price in open figures and the next free time. The photo of the row under the pointer or
 * the focus shows on the screen beside the board.
 */
function Board({ items, photos, locale, chrome, data }: { items: ContentRecord[]; photos: Array<Art | null>; locale: string; chrome: PublicChrome; data: NextAvailability | null }) {
  const [current, setCurrent] = useState(0);
  const shown = photos[current] ? current : photos.findIndex(Boolean);
  return <div className="t3-board-grid">
    <div className="t3-board">
      <p className="t3-board-head" aria-hidden="true"><span>{chrome.t("services")}</span><span>{chrome.t("duration")}</span><span>{chrome.t("price")}</span><span>{tt(chrome, "boardNext")}</span></p>
      <ol className="t3-board-rows" data-reveal-stagger="">{items.map((item, index) => {
        const minutes = durationMinutes(item.durationMinutes);
        const price = formatPrice(item.price, item.currency, locale);
        const choose = action(item.action, locale);
        const name = localized(item.name, locale);
        const photo = photos[index];
        const facts = typeof item.id === "string" ? data?.services[item.id] : null;
        const body = <>
          {photo ? <span className="t3-board-thumb" aria-hidden="true"><Photo image={photo} sizes="64px" decorative /></span> : null}
          <span className="t3-board-name"><strong>{name}</strong>{localized(item.summary, locale) ? <span className="t3-board-summary">{localized(item.summary, locale)}</span> : null}</span>
          {minutes ? <span className="t3-plate"><span className="t3-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</span> : <span />}
          {price ? <span className="t3-price"><span className="t3-sr">{chrome.t("price")} </span>{price}</span> : <span />}
          <span className="t3-board-next">{facts?.next && data ? <><span className="t3-pulse" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale, "short")}</> : null}</span>
          {choose ? <span className="t3-board-go" aria-hidden="true">→</span> : null}
        </>;
        return <li key={String(item.id || index)} data-reveal="rise" data-on={index === shown} onPointerEnter={() => setCurrent(index)} onFocus={() => setCurrent(index)}>
          {choose ? <a className="t3-board-row" href={choose.href} data-qa={`tena-board-row-${index}`}>{body}</a> : <div className="t3-board-row">{body}</div>}
        </li>;
      })}</ol>
    </div>
    <div className="t3-board-screen" aria-hidden="true" data-reveal="plate">
      {photos.map((photo, index) => photo ? <Photo key={index} image={photo} sizes="(max-width: 1100px) 40vw, 420px" decorative className={index === shown ? "is-on" : undefined} /> : null)}
      {items[shown] ? <p className="t3-board-caption">{localized(items[shown].name, locale)}</p> : null}
    </div>
  </div>;
}

/** The template's own loading screen: the entrance plate and a route line that keeps drawing while the published design loads. */
export function TenaLoading({ mode, locale = "en" }: { mode: TemplateProps["mode"]; locale?: string }) {
  const chrome = usePublicChrome(locale);
  return <div className="t3 t3-loading" data-pe-mode={mode} data-template="tena-clinic-v3" role="status" aria-busy="true" data-qa="tena-loading">
    <span className="t3-sr">{chrome.t("loadingSite")}</span>
    <div className="t3-load-bar" aria-hidden="true"><i /><i /><i /><i /></div>
    <div className="t3-load-hero" aria-hidden="true">
      <div className="t3-load-copy"><i className="t3-bone t3-bone-plate" /><i className="t3-bone t3-bone-title" /><i className="t3-bone t3-bone-title t3-bone-short" /><i className="t3-bone" /><i className="t3-bone t3-bone-btn" /></div>
      <div className="t3-load-photo"><span className="t3-load-route"><i /></span></div>
    </div>
  </div>;
}

export function TenaBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const navigate = useNavigate();
  const design = snapshot.compiledDesign;
  const root = useRef<HTMLDivElement>(null);
  const level = useTenaMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useLiveAvailability(snapshot, publicRoot);
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const booking = section(snapshot.sections, "booking_cta");
  const locations = section(snapshot.sections, "locations");
  const contact = section(snapshot.sections, "contact");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const image = art(booking, locale, design, "band.tena");
  const board = records(services.items);
  const place = records(locations.items)[0];
  const phone = typeof contact.phone === "string" ? contact.phone : "";
  const data = live.data;
  return <div ref={root} data-motion={design.motion} data-motion-level={level} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode}
    data-night={night} lang={locale} className="t3 t3-handoff" data-template="tena-clinic-v3" style={rootStyle}>
    <Bar logo={brandLogo(design)} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode} level={level}>
      <a className="t3-link t3-back" href={publicRoot}>{chrome.t("backToSite")}</a>
    </Bar>
    <main className="t3-handoff-stage">
      {image ? <div className="t3-band-photo"><Photo image={image} night={night} eager sizes="100vw" decorative /></div> : null}
      <div className="t3-wrap t3-handoff-grid">
        <div className="t3-glass t3-handoff-panel" data-vt-book="">
          <p className="t3-greet"><span>{greeting(chrome, now)}</span></p>
          <h1>{localized(booking.title, locale)}</h1>
          {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
          {bookingPath && label ? <a className="t3-btn" href={bookingPath} onClick={(event) => inApp(event, bookingPath, navigate)} data-magnetic="5" data-qa="tena-handoff-book"><span>{label}</span><span className="t3-btn-arrow" aria-hidden="true">→</span></a> : null}
          <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} href={bookingPath || undefined} qa="tena-handoff-next" />
          {place ? <div className="t3-handoff-place">
            <OpenBadge days={placeDays(snapshot, place.id)} now={now} chrome={chrome} locale={locale} habesha={locale === "am"} qa="tena-handoff-open" />
            <p>{localized(place.address, locale)}</p>
            {phone ? <a className="t3-mini" href={telHref(phone)}>{chrome.t("call")} · {formatPhone(phone)}</a> : null}
          </div> : null}
        </div>
        {board.length ? <ol className="t3-handoff-board" aria-label={localized(services.title, locale) || undefined}>{board.map((item, index) => {
          const photo = art(item, locale, design, SERVICE_ROLES[index % SERVICE_ROLES.length]);
          const price = formatPrice(item.price, item.currency, locale);
          const minutes = durationMinutes(item.durationMinutes);
          const facts = typeof item.id === "string" ? data?.services[item.id] : null;
          // Each row opens its own service in the scheduler, with any clinician.
          const href = (typeof item.id === "string" && snapshot.bookingPaths?.[item.id]) || bookingPath || "";
          const body = <>
            {photo ? <span className="t3-board-thumb" aria-hidden="true"><Photo image={photo} sizes="64px" decorative /></span> : null}
            <span className="t3-board-name"><strong>{localized(item.name, locale)}</strong>
              {facts?.next && data ? <span className="t3-board-next"><span className="t3-pulse" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale, "short")}</span> : null}</span>
            {minutes ? <span className="t3-plate">{chrome.t("minutes", { count: minutes })}</span> : <span />}
            {price ? <span className="t3-price">{price}</span> : <span />}
            {href ? <span className="t3-board-go" aria-hidden="true">→</span> : null}
          </>;
          return <li key={String(item.id || index)} data-reveal="rise">
            {href ? <a className="t3-handoff-row" href={href} onClick={(event) => inApp(event, href, navigate)} data-qa={`tena-handoff-service-${index}`}>{body}</a>
              : <div className="t3-handoff-row">{body}</div>}
          </li>;
        })}</ol> : null}
      </div>
    </main>
  </div>;
}

