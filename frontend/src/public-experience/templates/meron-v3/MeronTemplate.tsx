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
import { BENEFIT_ART, CourtyardMap, Needle, SeamRule, Stitch, Tape, Tibeb } from "./art";
import {
  art, BeforeAfter, CopyChip, HoursList, KenBurns, mt, NextChip, OpenBadge, Photo, Reviews, role, slotText, smallest,
  type Art, type Review,
} from "./parts";
import "./meron.css";

/*
 * Meron Atelier v3, "The Fitting Room": quiet luxury tailoring in a Kazanchis courtyard atelier.
 * Shape language: the garment tag (cut corners, a punched hole, a thread) and the stitch line.
 * Radius 0 everywhere. Navy wool for actions, chalk blue for tags, deep wine for small marks and
 * tibeb gold for borders. After dark (Addis Ababa time) and in dark mode the fitting room turns
 * "navy velvet": a spotlit stage and the night photos. Behaviour comes from the headless kit;
 * every visual here belongs to this package.
 */

function useMeronMotion(root: RefObject<HTMLDivElement | null>, motion: unknown, locale: string) {
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
  return <button type="button" className="m3-mode" onClick={(event) => circularModeSwitch(event.currentTarget, toggleMode, level)}
    aria-label={chrome.modeSwitchLabel(mode)} data-qa="meron-mode">
    <span className="m3-mode-icon" aria-hidden="true" />
    <span className="m3-mode-text">{chrome.modeName(mode)}</span>
  </button>;
}

function Bar({ logo, name, root, chrome, mode, toggleMode, level, children }: { logo?: string; name: string; root: string; chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; level: MotionLevel; children?: ReactNode }) {
  const scroll = useScrollState(40);
  return <header className="m3-bar" data-scrolled={scroll.scrolled}>
    <div className="m3-wrap m3-bar-inner">
      <a className="m3-brand" href={root}>{logo ? <img src={logo} alt="" width={36} height={36} /> : null}<span>{name}</span></a>
      {children}
      <ModeButton chrome={chrome} mode={mode} toggleMode={toggleMode} level={level} />
    </div>
    <span className="m3-tape" aria-hidden="true" />
  </header>;
}

/** A booking link that morphs into the booking page header where the browser can. */
function BookLink({ href, label, level, className = "m3-btn", qa, magnetic = true }: { href: string; label: string; level: MotionLevel; className?: string; qa?: string; magnetic?: boolean }) {
  const navigate = useNavigate();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (/\/book(\?|$)/.test(href)) bookingTransition(event, href, navigate, level);
  };
  return <a className={className} href={href} onClick={onClick} data-magnetic={magnetic ? "5" : undefined} data-qa={qa}>
    <span>{label}</span><span className="m3-btn-arrow" aria-hidden="true">→</span>
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

/** The index of the item in the middle of the screen, among `selector` inside `root`. */
function useActiveIndex(root: RefObject<HTMLElement | null>, selector: string, key: unknown): number {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const node = root.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const items = Array.from(node.querySelectorAll<HTMLElement>(selector));
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(items.indexOf(entry.target as HTMLElement));
    }, { rootMargin: "-42% 0px -45% 0px" });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [root, selector, key]);
  return active;
}

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
const LOOK_KEYS = ["lookSuit", "lookWrap", "lookKemis"] as const;
const STORY_ROLES = ["story1.meron", "story2.meron", "story3.meron", "story4.meron"];
export const SERVICE_ROLES = ["loop1.meron", "story1.meron", "loop3.meron"];

interface Look { image: Art; caption: string }

export function MeronSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const credit = useTemplateCredit(chrome);
  const root = useRef<HTMLDivElement>(null);
  const design = snapshot.compiledDesign;
  const level = useMeronMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useLiveAvailability(snapshot, publicRoot);
  const progress = useSectionProgress(root, locale);
  const [habesha, setHabesha] = useState(locale === "am");
  const sticky = useScrollState(620);
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
  const tags = records(services.items);
  const makers = records(providers.items);
  const steps = records(process.items);
  const facts = records(proof.items);
  const notes = records(benefits.items);
  const reviews: Review[] = records(testimonials.items).map((item) => ({ quote: localized(item.quote, locale), who: localized(item.attribution, locale), role: localized(item.role, locale) })).filter((item) => item.quote);
  const questions = records(faq.items);
  const places = records(locations.items);
  const place = places[0];
  const phone = typeof contact.phone === "string" ? contact.phone : (typeof place?.phone === "string" ? place.phone : "");
  const data: NextAvailability | null = live.data;
  const days = placeDays(snapshot, place?.id);
  const showDots = progress.sections.length > 4;
  const activeStep = useActiveIndex(root, ".m3-story-steps > li", locale);

  // The hero film: the owner's hero photo first (else the measuring still), then cutting and pinning.
  const film = [art(hero, locale, design, "hero.primary"), role(design, "loop2.meron"), role(design, "loop3.meron")]
    .filter((image, index, list): image is Art => Boolean(image) && list.findIndex((other) => other?.src === image?.src) === index);
  const ownGallery = records(gallery.items).map((item) => ({ item, image: art(item, locale, design, "") }))
    .filter((row): row is { item: ContentRecord; image: Art } => Boolean(row.image));
  const templateLooks: Look[] = ["look1.meron", "look2.meron", "story4.meron"].map((name, index) => ({ image: role(design, name), caption: mt(chrome, LOOK_KEYS[index]) }))
    .filter((look): look is Look => Boolean(look.image));
  const lookbook: Look[] = ownGallery.length ? ownGallery.map((row) => ({ image: row.image, caption: localized(row.item.caption, locale) })) : templateLooks;
  const sides = lookbook.length >= 2 ? [lookbook[0].image, lookbook[1].image] : [];
  const before = role(design, "before.meron");
  const after = role(design, "after.meron");
  const swatch = role(design, "swatch.meron");
  const swatchStyle = swatch ? ({ "--m3-swatch": `url("${smallest(swatch)}")` } as CSSProperties) : undefined;

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} data-motion-level={level}
    data-night={night} data-daypart={now.part} lang={locale} className="m3" data-template="meron-atelier-v3" style={{ ...rootStyle, ...swatchStyle }}>
    <a className="m3-skip" href="#m3-main">{chrome.t("skip")}</a>
    <Bar logo={logo} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode} level={level}>
      <nav aria-label={chrome.t("navLabel")} className="m3-nav">
        {tags.length ? <a href="#services">{chrome.t("services")}</a> : null}
        {lookbook.length ? <a href="#looks">{chrome.t("lookbook")}</a> : null}
        {makers.length ? <a href="#team">{chrome.t("team")}</a> : null}
        {place ? <a href="#visit">{chrome.t("visit")}</a> : null}
        <a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a>
      </nav>
      {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} className="m3-btn m3-bar-book" magnetic={false} /> : null}
    </Bar>

    {showDots ? <nav className="m3-dots" aria-label={chrome.t("onThisPage")} data-hidden={progress.active === 0}>
      <ol>{progress.sections.map((item, index) => <li key={item.id}><a href={`#${item.id}`} aria-current={index === progress.active ? "true" : undefined}><span>{item.label}</span></a></li>)}</ol>
    </nav> : null}

    <main id="m3-main">
      <section className="m3-hero" id="top" data-section={applicationName} aria-labelledby="m3-hero-title">
        <div className="m3-spot" aria-hidden="true" />
        <div className="m3-wrap m3-hero-copy">
          <div className="m3-greet" data-qa="meron-greeting"><span className="m3-eyebrow">{greeting(chrome, now)}</span>{days.length ? <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={locale === "am"} /> : null}</div>
          <div className="m3-title">
            <Stitch d="M4 4H996V196H4Z" viewBox="0 0 1000 200" mode="load" className="m3-title-stitch" />
            <h1 id="m3-hero-title">{localized(hero.title, locale)}</h1>
          </div>
          {localized(hero.subtitle || hero.body, locale) ? <p className="m3-lede">{localized(hero.subtitle || hero.body, locale)}</p> : null}
          <div className="m3-actions">
            {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} qa="meron-hero-book" /> : null}
            {secondary ? <a className="m3-link" href={secondary.href}>{secondary.label}</a> : null}
          </div>
          {/* The chip arrives with the availability answer; its row is reserved so nothing below it moves. */}
          {snapshot.booking?.liveAvailability === true ? <div className="m3-chip-slot"><NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} qa="meron-next-free" /></div> : null}
        </div>
        {film.length ? <div className="m3-wrap m3-screen-wrap">
          <div className={sides.length ? "m3-screen" : "m3-screen m3-screen-single"} data-reveal="screen">
            {sides.length ? <figure className="m3-panel m3-panel-side" data-side="left" data-pan=""><Photo image={sides[0]} sizes="(max-width: 760px) 24vw, 300px" decorative /></figure> : null}
            <figure className="m3-panel m3-panel-centre">
              <KenBurns frames={film} night={night} level={level} chrome={chrome} />
            </figure>
            {sides.length ? <figure className="m3-panel m3-panel-side" data-side="right" data-pan=""><Photo image={sides[1]} sizes="(max-width: 760px) 24vw, 300px" decorative /></figure> : null}
          </div>
        </div> : null}
      </section>

      {tags.length ? <section className="m3-section m3-tags-band" id="services" data-section={chrome.t("services")} aria-labelledby="m3-tags-title">
        <div className="m3-wrap">
          <header className="m3-head m3-head-centre" data-reveal="rise">
            <p className="m3-eyebrow">{chrome.t("services")}</p>
            <h2 id="m3-tags-title">{localized(services.title, locale)}</h2>
            {localized(services.intro, locale) ? <p className="m3-muted">{localized(services.intro, locale)}</p> : null}
          </header>
          <div className="m3-rail" aria-hidden="true"><span /></div>
          <ul className="m3-tags" data-cols={Math.min(tags.length, 4)} data-reveal-stagger="">{tags.map((item, index) => {
            const minutes = durationMinutes(item.durationMinutes);
            const price = formatPrice(item.price, item.currency, locale);
            const choose = action(item.action, locale);
            const name = localized(item.name, locale);
            const photo = art(item, locale, design, SERVICE_ROLES[index % SERVICE_ROLES.length]);
            const facts = typeof item.id === "string" ? data?.services[item.id] : null;
            const body = <>
              <span className="m3-tag-hole" aria-hidden="true" />
              <span className="m3-tag-no">{mt(chrome, "tagNo", { count: String(index + 1).padStart(2, "0") })}</span>
              {photo ? <span className="m3-tag-photo" aria-hidden="true"><Photo image={photo} sizes="(max-width: 760px) 80vw, 340px" decorative /></span> : null}
              <span className="m3-tag-name">{name}</span>
              {localized(item.summary, locale) ? <span className="m3-tag-summary">{localized(item.summary, locale)}</span> : null}
              <span className="m3-tag-facts">
                {minutes ? <span><span className="m3-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</span> : null}
                {price ? <span className="m3-tag-price"><span className="m3-sr">{chrome.t("price")} </span>{price}</span> : null}
              </span>
              {facts?.next && data ? <span className="m3-tag-live"><span className="m3-knot" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale, "plain")}</span> : null}
              {choose ? <span className="m3-tag-cta" aria-hidden="true">{mt(chrome, "chooseTime")} →</span> : null}
            </>;
            return <li key={String(item.id || index)} className="m3-tag-wrap" data-reveal="swing">
              <span className="m3-thread" aria-hidden="true" />
              <span className="m3-swatch" aria-hidden="true" />
              {choose ? <a className="m3-tag" href={choose.href} data-qa={`meron-tag-${index}`}>{body}</a> : <div className="m3-tag">{body}</div>}
            </li>;
          })}</ul>
        </div>
      </section> : null}

      {steps.length ? <section className="m3-section m3-story" id="story" data-section={mt(chrome, "clothToFitting")} aria-labelledby="m3-story-title">
        <div className="m3-wrap m3-story-grid">
          <div className="m3-story-stage">
            <div className="m3-story-frame">{steps.slice(0, 6).map((item, index) => {
              const image = art(item, locale, design, "") || role(design, STORY_ROLES[index % STORY_ROLES.length]);
              return image ? <Photo key={index} image={image} sizes="(max-width: 760px) 86vw, 40vw" decorative={index !== activeStep}
                className={index === Math.min(activeStep, steps.length - 1) ? "m3-story-photo is-on" : "m3-story-photo"} /> : null;
            })}<span className="m3-story-count" aria-hidden="true">{ROMAN[Math.min(activeStep, steps.length - 1)] || ""} / {ROMAN[steps.length - 1] || steps.length}</span></div>
          </div>
          <div className="m3-story-text">
            <header className="m3-head" data-reveal="rise">
              <p className="m3-eyebrow">{mt(chrome, "clothToFitting")}</p>
              <h2 id="m3-story-title">{localized(process.title, locale)}</h2>
              {localized(process.intro, locale) ? <p className="m3-muted">{localized(process.intro, locale)}</p> : null}
            </header>
            <div className="m3-story-seam">
              <Stitch d="M10 0 C 30 120, -10 240, 10 360 S 30 600, 10 720 S -10 960, 10 1000" viewBox="0 0 20 1000" className="m3-story-stitch" />
              <ol className="m3-story-steps">{steps.map((item, index) => {
                const image = art(item, locale, design, "") || role(design, STORY_ROLES[index % STORY_ROLES.length]);
                return <li key={index} data-reveal="rise" data-active={index === activeStep}>
                  <span className="m3-step-no" aria-hidden="true">{ROMAN[index] || index + 1}</span>
                  <div>
                    {image ? <div className="m3-story-inline" aria-hidden="true"><Photo image={image} sizes="86vw" decorative /></div> : null}
                    <h3><span className="m3-sr">{chrome.t("step", { count: index + 1 })}: </span>{localized(item.title, locale)}</h3>
                    <p className="m3-muted">{localized(item.description, locale)}</p>
                  </div>
                </li>;
              })}</ol>
            </div>
          </div>
        </div>
      </section> : null}

      {makers.length ? <section className="m3-section m3-makers" id="team" data-section={chrome.t("team")} aria-labelledby="m3-team-title">
        <div className="m3-wrap">
          <header className="m3-head" data-reveal="rise"><p className="m3-eyebrow">{mt(chrome, "theMaker")}</p><h2 id="m3-team-title">{localized(providers.title, locale)}</h2>
            {localized(providers.intro, locale) ? <p className="m3-muted">{localized(providers.intro, locale)}</p> : null}</header>
          <ul className="m3-maker-list" data-cols={Math.min(makers.length, 3)}>{makers.map((item, index) => {
            const photo = art(item, locale, design, "");
            const name = localized(item.name, locale);
            const choose = action(item.action, locale);
            const specialties = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
            const first = name.split(" ")[0];
            return <li key={String(item.id || index)} className="m3-maker" data-reveal="rise">
              <div className="m3-maker-frame" data-tilt="2" data-glow="">
                {photo ? <Photo image={{ ...photo, alt: photo.alt || name }} sizes="(max-width: 760px) 80vw, 420px" /> : <Tape className="m3-maker-empty" />}
                {specialties.length ? <ul className="m3-maker-tags">{specialties.slice(0, 3).map((tag) => <li key={tag}><span className="m3-tag-hole" aria-hidden="true" />{tag}</li>)}</ul> : null}
              </div>
              <div className="m3-maker-text">
                <Tape className="m3-maker-tape" />
                <h3>{name}</h3>
                {localized(item.role, locale) ? <p className="m3-maker-role">{localized(item.role, locale)}</p> : null}
                {records(item.credentials).length || Array.isArray(item.credentials) ? <ul className="m3-maker-notes">{(Array.isArray(item.credentials) ? item.credentials : []).map((entry, entryIndex) => <li key={entryIndex}>{localized(entry, locale)}</li>)}</ul> : null}
                <NextChip facts={typeof item.id === "string" ? data?.providers[item.id] : null} data={data} chrome={chrome} locale={locale} qa={`meron-maker-next-${index}`} />
                {choose ? <a className="m3-ghost" href={choose.href}>{chrome.t("bookWith", { name: first })}</a> : null}
              </div>
            </li>;
          })}</ul>
        </div>
      </section> : null}

      {lookbook.length ? <section className="m3-section m3-looks" id="looks" data-section={chrome.t("lookbook")} aria-labelledby="m3-looks-title">
        <div className="m3-wrap">
          <header className="m3-head" data-reveal="rise"><p className="m3-eyebrow">{chrome.t("lookbook")}</p>
            <h2 id="m3-looks-title">{localized(gallery.title, locale) || chrome.t("lookbook")}</h2>
            {localized(gallery.intro, locale) ? <p className="m3-muted">{localized(gallery.intro, locale)}</p> : null}</header>
          <div className="m3-looks-grid">
            <Rail looks={lookbook} chrome={chrome} />
            {!ownGallery.length && before && after ? <BeforeAfter before={before} after={after} chrome={chrome} caption={mt(chrome, "alteration")} /> : null}
          </div>
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="m3-section m3-about" id="atelier" data-section={localized(about.title, locale)} aria-labelledby="m3-about-title">
        <div className="m3-wrap m3-about-grid">
          {(() => { const image = art(about, locale, design, "section.detail"); return image ? <div className="m3-about-photo" data-scroll="" data-pan=""><Photo image={image} sizes="(max-width: 760px) 92vw, 64vw" /></div> : null; })()}
          <div className="m3-label" data-reveal="rise">
            <p className="m3-eyebrow">{mt(chrome, "theAtelier")}</p>
            <h2 id="m3-about-title">{localized(about.title, locale)}</h2>
            <p>{localized(about.body, locale)}</p>
            {Array.isArray(about.highlights) && about.highlights.length ? <ul className="m3-label-list">{about.highlights.map((entry, index) => <li key={index}>{localized(entry, locale)}</li>)}</ul> : null}
          </div>
        </div>
      </section> : null}

      {facts.length ? <section className="m3-proof" aria-labelledby="m3-proof-title">
        <Tibeb className="m3-proof-tibeb" />
        <div className="m3-wrap">
          <h2 id="m3-proof-title" className="m3-proof-title">{localized(proof.title, locale)}</h2>
          <ul className="m3-proof-list" data-reveal-stagger="">{facts.map((item, index) => <li key={index} data-reveal="rise">
            <p className="m3-proof-value" data-count="">{localized(item.value, locale)}</p>
            <p className="m3-proof-label">{localized(item.label, locale)}</p>
            {localized(item.detail, locale) ? <p className="m3-proof-detail">{localized(item.detail, locale)}</p> : null}
          </li>)}</ul>
        </div>
        <Tibeb className="m3-proof-tibeb" />
      </section> : null}

      {notes.length ? <section className="m3-section m3-notes" aria-labelledby="m3-notes-title">
        <div className="m3-wrap">
          <header className="m3-head" data-reveal="rise"><h2 id="m3-notes-title">{localized(benefits.title, locale)}</h2>{localized(benefits.intro, locale) ? <p className="m3-muted">{localized(benefits.intro, locale)}</p> : null}</header>
          <ul className="m3-note-grid" data-cols={Math.min(notes.length, 4)} data-reveal-stagger="">
            {(() => { const image = art(benefits, locale, design, "loop2.meron"); return image ? <li className="m3-note m3-note-photo" data-reveal="rise" data-pan=""><Photo image={image} sizes="(max-width: 760px) 92vw, 30vw" /></li> : null; })()}
            {notes.slice(0, 4).map((item, index) => {
              const Icon = BENEFIT_ART[index % BENEFIT_ART.length];
              return <li key={index} className="m3-note" data-reveal="rise" data-glow=""><Icon className="m3-note-art" /><h3>{localized(item.title, locale)}</h3><p className="m3-muted">{localized(item.description, locale)}</p></li>;
            })}
          </ul>
        </div>
      </section> : null}

      {reviews.length ? <section className="m3-section m3-reviews" id="reviews" data-section={localized(testimonials.title, locale)} aria-labelledby="m3-reviews-title">
        <div className="m3-wrap">
          <header className="m3-head" data-reveal="rise"><h2 id="m3-reviews-title">{localized(testimonials.title, locale)}</h2>{localized(testimonials.intro, locale) ? <p className="m3-muted">{localized(testimonials.intro, locale)}</p> : null}</header>
        </div>
        <Reviews items={reviews} chrome={chrome} level={level}
          aside={(() => { const image = art(testimonials, locale, design, "story3.meron"); return image ? <div className="m3-pull-photo" data-pan=""><Photo image={image} sizes="(max-width: 760px) 70vw, 360px" /></div> : null; })()} />
      </section> : null}

      {questions.length ? <section className="m3-section m3-faq" id="faq" data-section={localized(faq.title, locale)} aria-labelledby="m3-faq-title">
        <div className="m3-wrap m3-faq-grid">
          <div>
            <header className="m3-head" data-reveal="rise"><h2 id="m3-faq-title">{localized(faq.title, locale)}</h2></header>
            <div className="m3-faq-list">{questions.map((item, index) => <details key={index} name="m3-faq">
              <summary><span>{localized(item.question, locale)}</span><i aria-hidden="true" /></summary>
              <div className="m3-faq-answer"><p>{localized(item.answer, locale)}</p></div>
            </details>)}</div>
          </div>
          <aside className="m3-ask" data-reveal="rise" aria-label={chrome.t("stillUnsure")}>
            {(() => { const image = art(faq, locale, design, "story2.meron"); return image ? <div className="m3-ask-photo"><Photo image={image} sizes="(max-width: 760px) 92vw, 400px" /></div> : null; })()}
            <div className="m3-ask-card">
              <h3>{chrome.t("stillUnsure")}</h3>
              {phone ? <a className="m3-ghost" href={phoneHref(phone) || `tel:${phone.replace(/\s+/g, "")}`}>{chrome.t("call")} · {formatPhone(phone)}</a> : null}
              <HoursList days={days} chrome={chrome} locale={locale} habesha={habesha} onHabesha={setHabesha} />
            </div>
          </aside>
        </div>
      </section> : null}

      {place ? <section className="m3-section m3-visit" id="visit" data-section={chrome.t("visit")} aria-labelledby="m3-visit-title">
        <div className="m3-wrap">
          <header className="m3-head" data-reveal="rise"><p className="m3-eyebrow">{chrome.t("visit")}</p><h2 id="m3-visit-title">{localized(locations.title, locale)}</h2>{localized(locations.intro, locale) ? <p className="m3-muted">{localized(locations.intro, locale)}</p> : null}</header>
          <div className="m3-visit-grid">
            <figure className="m3-map" data-reveal="rise" role="img" aria-label={mt(chrome, "mapLabel")}>
              <CourtyardMap place={localized(place.name, locale)} labels={{ street: mt(chrome, "mapStreet"), gate: mt(chrome, "mapGate"), courtyard: mt(chrome, "mapCourtyard"), fitting: mt(chrome, "mapFittingRoom") }} />
            </figure>
            {places.map((item, index) => {
              const image = art(item, locale, design, "atelier.meron");
              const directions = action(item.directionsAction, locale);
              const telephone = typeof item.phone === "string" ? item.phone : phone;
              const address = localized(item.address, locale);
              return <div key={String(item.id || index)} className="m3-place" data-qa={`meron-place-${index}`}>
                {image && index === 0 ? <div className="m3-place-photo" data-pan=""><Photo image={image} sizes="(max-width: 760px) 92vw, 40vw" /></div> : null}
                <div className="m3-label m3-place-card">
                  <h3>{localized(item.name, locale)}</h3>
                  <OpenBadge days={placeDays(snapshot, item.id)} now={now} chrome={chrome} locale={locale} habesha={habesha} qa={`meron-place-open-${index}`} />
                  <p>{address}</p>
                  {localized(item.hours, locale) ? <p className="m3-muted">{localized(item.hours, locale)}</p> : null}
                  <div className="m3-place-links">
                    <CopyChip text={address} chrome={chrome} />
                    {telephone ? <a className="m3-mini" href={phoneHref(telephone) || `tel:${telephone.replace(/\s+/g, "")}`}><span className="m3-sr">{chrome.t("phone")} </span>{formatPhone(telephone)}</a> : null}
                    {directions ? <a className="m3-mini" href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}
                  </div>
                </div>
              </div>;
            })}
          </div>
        </div>
      </section> : null}

      {bookNow ? <section ref={band} className="m3-band" id="book" data-section={bookingAction?.label || bookLabel} aria-labelledby="m3-band-title">
        {(() => { const image = art(booking, locale, design, "band.meron"); return image ? <div className="m3-band-photo" data-scroll=""><Photo image={image} night={night} sizes="100vw" decorative /></div> : null; })()}
        <Tibeb className="m3-band-tibeb m3-band-tibeb-top" />
        <div className="m3-wrap m3-band-inner">
          <div className="m3-band-card" data-reveal="rise">
            <span className="m3-tag-hole" aria-hidden="true" />
            <h2 id="m3-band-title">{localized(booking.title, locale)}</h2>
            {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
            <BookLink href={bookingAction?.href || bookHref!} label={bookingAction?.label || bookLabel} level={level} qa="meron-band-book" />
            {data?.next ? <div className="m3-band-live">
              <NextChip facts={{ next: data.next.start, todayLeft: data.todayLeft }} data={data} chrome={chrome} locale={locale} />
              {data.todayLeft && data.todayLeft <= 8 ? <p className="m3-left" data-qa="meron-left-today">{data.todayLeft === 1 ? chrome.t("leftTodayOne") : chrome.t("leftToday", { count: data.todayLeft })}</p> : null}
            </div> : null}
          </div>
        </div>
        <Tibeb className="m3-band-tibeb m3-band-tibeb-bottom" />
      </section> : null}
    </main>

    <footer className="m3-footer">
      <SeamRule className="m3-footer-seam" />
      <div className="m3-wrap m3-footer-grid">
        <div>
          <p className="m3-footer-name">{applicationName}</p>
          {localized(footer.body, locale) ? <p className="m3-footer-muted">{localized(footer.body, locale)}</p> : null}
          <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={habesha} qa="meron-footer-open" />
        </div>
        <ul className="m3-footer-links">
          {tags.length ? <li><a href="#services">{chrome.t("services")}</a></li> : null}
          {makers.length ? <li><a href="#team">{chrome.t("team")}</a></li> : null}
          {place ? <li><a href="#visit">{chrome.t("visit")}</a></li> : null}
          <li><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a></li>
          <li><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a></li>
        </ul>
        {bookNow ? <div className="m3-footer-book"><BookLink href={bookHref!} label={bookLabel} level={level} magnetic={false} /></div> : null}
      </div>
      <div className="m3-wrap m3-legal">
        <small>© {new Date().getFullYear()} {applicationName}</small>
        {credit ? <p className="m3-credit" lang={locale} data-qa="template-credit">{credit.before}<a href={credit.href} rel="noopener" data-qa="template-credit-link">{credit.product}</a>{credit.after}</p> : null}
      </div>
    </footer>

    {bookNow ? <div className="m3-sticky" data-show={sticky.scrolled && !bandVisible} data-qa="meron-sticky-book">
      <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} variant="short" />
      <BookLink href={bookHref!} label={bookLabel} level={level} magnetic={false} />
    </div> : null}
  </div>;
}

/** The lookbook rail: native horizontal scroll with snap and arrow buttons. */
function Rail({ looks, chrome }: { looks: Look[]; chrome: PublicChrome }) {
  const rail = useRef<HTMLUListElement>(null);
  const move = (direction: number) => {
    const node = rail.current;
    if (!node) return;
    const card = node.querySelector("li");
    node.scrollBy({ left: direction * ((card?.getBoundingClientRect().width || 300) + 24), behavior: "smooth" });
  };
  return <div className="m3-rail-wrap" data-reveal="rise">
    <ul className="m3-look-rail" ref={rail} tabIndex={0} aria-label={chrome.t("lookbook")} data-qa="meron-lookbook">
      {looks.map((look, index) => <li key={look.image.src + index}>
        <figure><div className="m3-look-frame" data-pan=""><Photo image={look.image} sizes="(max-width: 760px) 70vw, 300px" /></div>
          {look.caption ? <figcaption><span className="m3-tag-hole" aria-hidden="true" />{look.caption}</figcaption> : null}</figure>
      </li>)}
    </ul>
    {looks.length > 2 ? <div className="m3-rail-nav">
      <button type="button" className="m3-square" onClick={() => move(-1)} aria-label={chrome.t("previous")}>‹</button>
      <button type="button" className="m3-square" onClick={() => move(1)} aria-label={chrome.t("next")}>›</button>
    </div> : null}
  </div>;
}

/** The template's own loading screen: the fitting room before the lights come up, with a stitch that runs around the title. */
export function MeronLoading({ mode, locale = "en" }: { mode: TemplateProps["mode"]; locale?: string }) {
  const chrome = usePublicChrome(locale);
  return <div className="m3 m3-loading" data-pe-mode={mode} data-template="meron-atelier-v3" role="status" aria-busy="true" data-qa="meron-loading" lang={locale}>
    <span className="m3-sr">{chrome.t("loadingSite")}</span>
    <div className="m3-load-bar" aria-hidden="true"><i /><i /><i /></div>
    <div className="m3-wrap m3-load-stage" aria-hidden="true">
      <div className="m3-load-title">
        <svg className="m3-load-stitch" viewBox="0 0 400 120" preserveAspectRatio="none"><rect x="2" y="2" width="396" height="116" pathLength={1} /></svg>
        <i className="m3-bone" /><i className="m3-bone m3-bone-short" />
        <Needle className="m3-load-needle" />
      </div>
      <i className="m3-bone m3-bone-btn" />
      <div className="m3-load-screen"><i /><i /><i /></div>
    </div>
  </div>;
}

/** A plain click on a booking link moves inside the app, so the booking pages open without a full reload. */
function inApp(event: MouseEvent<HTMLAnchorElement>, href: string, navigate: (to: string) => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !href.startsWith("/") || href.startsWith("//")) return;
  event.preventDefault();
  navigate(href);
}

export function MeronBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const navigate = useNavigate();
  const design = snapshot.compiledDesign;
  const root = useRef<HTMLDivElement>(null);
  const level = useMeronMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useLiveAvailability(snapshot, publicRoot);
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const image = art(booking, locale, design, "band.meron");
  const tags = records(services.items);
  const data = live.data;
  return <div ref={root} data-motion={design.motion} data-motion-level={level} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode}
    data-night={night} lang={locale} className="m3 m3-handoff" data-template="meron-atelier-v3" style={rootStyle}>
    <Bar logo={brandLogo(design)} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode} level={level}>
      <a className="m3-link m3-back" href={publicRoot}>{chrome.t("backToSite")}</a>
    </Bar>
    <main className="m3-handoff-stage">
      {image ? <div className="m3-band-photo"><Photo image={image} night={night} eager sizes="100vw" decorative /></div> : null}
      <div className="m3-wrap m3-handoff-grid">
        <div className="m3-band-card m3-handoff-panel" data-vt-book="">
          <span className="m3-tag-hole" aria-hidden="true" />
          <p className="m3-eyebrow">{greeting(chrome, now)}</p>
          <h1>{localized(booking.title, locale)}</h1>
          {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
          {bookingPath && label ? <a className="m3-btn" href={bookingPath} onClick={(event) => inApp(event, bookingPath, navigate)} data-magnetic="5" data-qa="meron-handoff-book"><span>{label}</span><span className="m3-btn-arrow" aria-hidden="true">→</span></a> : null}
          <NextChip facts={data?.next ? { next: data.next.start, todayLeft: data.todayLeft } : null} data={data} chrome={chrome} locale={locale} href={bookingPath || undefined} qa="meron-handoff-next" />
        </div>
        {tags.length ? <ol className="m3-handoff-tags" aria-label={localized(services.title, locale) || undefined}>{tags.map((item, index) => {
          const photo = art(item, locale, design, SERVICE_ROLES[index % SERVICE_ROLES.length]);
          const price = formatPrice(item.price, item.currency, locale);
          const minutes = durationMinutes(item.durationMinutes);
          const facts = typeof item.id === "string" ? data?.services[item.id] : null;
          // Each row opens its own service in the scheduler, with any provider.
          const href = (typeof item.id === "string" && snapshot.bookingPaths?.[item.id]) || bookingPath || "";
          const body = <>
            {photo ? <span className="m3-handoff-photo" aria-hidden="true"><Photo image={photo} sizes="88px" decorative /></span> : null}
            <span className="m3-handoff-name">{localized(item.name, locale)}</span>
            <span className="m3-handoff-meta">{minutes ? chrome.t("minutes", { count: minutes }) : null}{price ? <> · {price}</> : null}
              {facts?.next && data ? <span className="m3-tag-live"><span className="m3-knot" aria-hidden="true" />{slotText(chrome, facts.next, data.timezone, locale, "plain")}</span> : null}</span>
            {href ? <span className="m3-handoff-go" aria-hidden="true">→</span> : null}
          </>;
          return <li key={String(item.id || index)} data-reveal="rise">
            {href ? <a className="m3-handoff-row" href={href} onClick={(event) => inApp(event, href, navigate)} data-qa={`meron-handoff-service-${index}`}>{body}</a>
              : <div className="m3-handoff-row">{body}</div>}
          </li>;
        })}</ol> : null}
      </div>
    </main>
  </div>;
}
