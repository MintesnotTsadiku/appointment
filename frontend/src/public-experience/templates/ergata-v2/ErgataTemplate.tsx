import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode, type RefObject } from "react";
import { useNavigate } from "react-router-dom";

import { formatPhone, phoneHref } from "@/lib/phone";
import type { BookingTemplateProps, TemplateProps } from "../types";
import type { CompiledDesign, SessionFormat } from "../../types";
import { meetOfFormat, placeMeetOf, sessionMeetOf, type Meet } from "@/lib/online-session";
import type { ContentRecord } from "../content";
import { action, brandLogo, contentImage, durationMinutes, formatPrice, localized, records, section } from "../content";
import { useTemplateCredit } from "../credit";
import { usePublicChrome, type PublicChrome } from "../chrome";
import { useScrollState } from "../motion";
import {
  bookingTransition, circularModeSwitch, useMotionLevel, useNextAvailability, usePointerEffects, useReveal,
  useScrollProgress, useSectionProgress, useTimeOfDay,
  type MotionLevel, type NextAvailability, type OpeningDay, type TimeOfDay,
} from "../kit";
import { Icon, iconName, type ErgataIconName } from "./icons";
import { AreaMap, Blob, FormatArt, Horizon, NeedArt, NoticeArt, OnlineArt, Sprig, StepArt, StepPath, StoneArt, type FormatKey } from "./illustrations";
import { art, ClockSwitch, ex, HoursList, NextChip, OpenBadge, Photo, Voices, type Art, type Voice } from "./parts";
import { ErgataHoliday } from "./holiday";
import "./ergata.css";

/*
 * Ergata Therapy v2: a page for a counsellor or a small group practice, at v3 parity.
 * The arched window is the one recurring shape (hero photo, portraits, image slots, booking band).
 * Every section carries a picture: an owner photo when the release has one, otherwise the template's
 * own photo for that slot (imagery roles `*.ergata`) and its drawn line art. After dark in Addis Ababa,
 * and always in dark mode, the hero and the booking band show the same room lamp-lit at dusk.
 * Behaviour comes from the headless kit; every visual here belongs to this package.
 */

type Formats = Record<string, SessionFormat> | undefined;

/** The derived format of a content item from the snapshot, by its `id` (service or location). */
function derivedFormat(item: ContentRecord, formats: Formats) {
  return typeof item.id === "string" ? meetOfFormat(formats?.[item.id]) : null;
}

/**
 * How a session meets: the release's `format`; else the type of its offering's location (`sessionFormats`,
 * so an online location reads "Online video" without any content); else its name in either language.
 */
function sessionMeet(item: ContentRecord, formats?: Formats): Meet {
  return sessionMeetOf(item.format, derivedFormat(item, formats), `${localized(item.name, "en")} ${localized(item.name, "am")}`);
}

function isIntro(item: ContentRecord): boolean {
  return /intro|ትውውቅ/i.test(`${localized(item.name, "en")} ${localized(item.name, "am")}`);
}

function sessionArt(item: ContentRecord, meet: Meet): FormatKey {
  return isIntro(item) ? "intro" : meet;
}

const MEET_ICON: Record<Meet, ErgataIconName> = { in_person: "room", online: "video", phone: "phone" };
const MEET_LABEL = { in_person: "formatInPerson", online: "formatOnline", phone: "formatPhone" } as const;

function placeMeet(item: ContentRecord, formats?: Formats): "in_person" | "online" {
  return placeMeetOf(item.format, derivedFormat(item, formats));
}

function sessionPrice(item: ContentRecord, locale: string, chrome: PublicChrome): string {
  if (item.price === 0) return chrome.t("free");
  return formatPrice(item.price, item.currency, locale);
}

function telHref(phone: string): string {
  return phoneHref(phone) || `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function greeting(chrome: PublicChrome, now: TimeOfDay) {
  return chrome.t(now.part === "morning" ? "greetingMorning" : now.part === "afternoon" ? "greetingAfternoon" : now.part === "evening" ? "greetingEvening" : "greetingNight");
}

/** Night photos: always in dark mode, and in light mode after dark in Addis Ababa (a lamp-lit room at dusk). */
function useNight(mode: TemplateProps["mode"], now: TimeOfDay) {
  return mode === "dark" || now.afterDark;
}

function useErgataMotion(root: RefObject<HTMLDivElement | null>, motion: unknown, locale: string) {
  const level = useMotionLevel(motion);
  useReveal(root, level, locale);
  useScrollProgress(root, level, "standard", locale);
  usePointerEffects(root, level, locale);
  return level;
}

/** The free introductory call (a free session, or one named as an introduction), whose next time the page offers. */
function introSession(items: ContentRecord[]): ContentRecord | undefined {
  return items.find((item) => item.price === 0 && isIntro(item)) || items.find((item) => item.price === 0) || items.find(isIntro);
}

function placeDays(snapshot: TemplateProps["snapshot"], id: unknown): OpeningDay[] {
  const hours = snapshot.placeHours || {};
  return (typeof id === "string" ? hours[id]?.days : undefined) || [];
}

function Brand({ logo, name, href }: { logo?: string; name: string; href: string }) {
  return <a className="eg2-brand" href={href}>{logo ? <img src={logo} alt="" width={40} height={40} /> : <span className="eg2-brand-mark" aria-hidden="true" />}<span>{name}</span></a>;
}

function ModeSwitch({ mode, toggleMode, chrome, level }: Pick<TemplateProps, "mode" | "toggleMode"> & { chrome: PublicChrome; level: MotionLevel }) {
  return <button type="button" className="eg2-mode" onClick={(event) => circularModeSwitch(event.currentTarget, toggleMode, level)}
    aria-label={chrome.modeSwitchLabel(mode)} data-qa="ergata-mode">
    <Icon name={mode === "dark" ? "sun" : "moon"} /><span>{chrome.modeName(mode)}</span>
  </button>;
}

/** A booking link that grows into the booking page's window where the browser can (same-site `/book` only). */
function BookLink({ href, label, level, className = "eg2-btn", qa, children }: { href: string; label: string; level: MotionLevel; className?: string; qa?: string; children?: ReactNode }) {
  const navigate = useNavigate();
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (/\/book(\?|$)/.test(href)) bookingTransition(event, href, navigate, level);
  };
  return <a className={className} href={href} onClick={onClick} data-qa={qa}>{children}<span>{label}</span></a>;
}

function MeetBadge({ meet, chrome }: { meet: Meet; chrome: PublicChrome }) {
  return <span className="eg2-meet" data-meet={meet}><Icon name={MEET_ICON[meet]} /><span>{chrome.t(MEET_LABEL[meet])}</span></span>;
}

interface SessionsProps {
  items: ContentRecord[];
  locale: string;
  chrome: PublicChrome;
  bookHref?: string;
  paths?: Record<string, string>;
  /** `sessionFormats` from the snapshot: the format of each session's location, by service id. */
  formats?: Formats;
  data: NextAvailability | null;
  compact?: boolean;
  onPick?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}

/** Session cards. With per-session scheduler paths each card books its own session (online or office). */
function Sessions({ items, locale, chrome, bookHref, paths = {}, formats, data, compact = false, onPick }: SessionsProps) {
  return <ul className={compact ? "eg2-sessions eg2-sessions-compact" : "eg2-sessions eg2-rail"} tabIndex={compact ? undefined : 0}
    aria-label={compact ? undefined : ex(chrome, "chooseSession")} data-reveal-stagger={compact ? undefined : ""}>
    {items.map((item, index) => {
      const minutes = durationMinutes(item.durationMinutes);
      const price = sessionPrice(item, locale, chrome);
      const name = localized(item.name, locale);
      const summary = localized(item.summary, locale);
      const own = typeof item.id === "string" ? paths[item.id] : undefined;
      const href = compact ? own : own || action(item.action, locale)?.href || bookHref;
      const meet = sessionMeet(item, formats);
      const scene = sessionArt(item, meet);
      const next = typeof item.id === "string" ? data?.services[item.id]?.next : null;
      return <li key={String(item.id || index)} className="eg2-session" data-format={scene} data-meet={meet} data-reveal={compact ? undefined : "rise"}>
        {compact ? <span className="eg2-session-icon"><Icon name={MEET_ICON[meet]} /></span> : <div className="eg2-session-scene"><FormatArt format={scene} /></div>}
        <div className="eg2-session-body">
          {compact ? null : <MeetBadge meet={meet} chrome={chrome} />}
          <h3>{name}</h3>
          {summary && !compact ? <p>{summary}</p> : null}
          <p className="eg2-session-facts">
            {compact ? <span className="eg2-session-meet">{chrome.t(MEET_LABEL[meet])}</span> : null}
            {minutes ? <span><span className="eg2-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</span> : null}
            {price ? <span className="eg2-session-price" data-free={item.price === 0 || undefined}><span className="eg2-sr">{chrome.t("price")} </span>{price}</span> : null}
          </p>
          <NextChip iso={next} data={data} chrome={chrome} locale={locale} variant="nextShort" className="eg2-next eg2-next-small" qa={`ergata-session-next-${index}`} />
        </div>
        {href ? <a className="eg2-session-book" href={href} lang={locale} onClick={onPick ? (event) => onPick(event, href) : undefined}
          aria-label={`${chrome.t("bookThis")}: ${name}`} data-qa={compact ? `ergata-handoff-session-${index}` : "ergata-session-book"} data-meet={meet}>
          <span>{chrome.t("bookThis")}</span><Icon name="arrow" />
        </a> : null}
      </li>;
    })}
  </ul>;
}

interface NoticeProps {
  notice: ContentRecord;
  locale: string;
  chrome: PublicChrome;
  compact?: boolean;
}

function SafetyNotice({ notice, locale, chrome, compact = false }: NoticeProps) {
  const lines = records(notice.items).filter((item) => typeof item.phone === "string" && localized(item.label, locale));
  const title = localized(notice.title, locale);
  if (!title) return null;
  return <aside className={compact ? "eg2-notice eg2-notice-compact" : "eg2-notice"} aria-labelledby={compact ? "eg2-notice-title-compact" : "eg2-notice-title"} data-qa="ergata-notice">
    {compact ? <span className="eg2-notice-icon"><Icon name="lifebuoy" /></span> : <div className="eg2-notice-art-wrap"><Blob variant={2} className="eg2-blob eg2-notice-blob" /><NoticeArt /></div>}
    <div className="eg2-notice-copy">
      <h2 id={compact ? "eg2-notice-title-compact" : "eg2-notice-title"}>{title}</h2>
      {localized(notice.body, locale) ? <p>{localized(notice.body, locale)}</p> : null}
      {lines.length ? <ul className="eg2-notice-lines">
        {lines.map((item, index) => {
          const label = localized(item.label, locale);
          const phone = String(item.phone).trim();
          return <li key={index}><a href={telHref(phone)} aria-label={chrome.t("callNumber", { label, number: phone })} data-qa="ergata-notice-call">
            <Icon name="phone" /><strong>{formatPhone(phone)}</strong><span>{label}</span>
          </a></li>;
        })}
      </ul> : null}
    </div>
  </aside>;
}

interface PlaceProps {
  place: ContentRecord; locale: string; chrome: PublicChrome; design: CompiledDesign; phone: string;
  days: OpeningDay[]; now: TimeOfDay; habesha: boolean;
}

function OfficeCard({ place, locale, chrome, design, phone, days, now, habesha }: PlaceProps) {
  const photo = art(place, locale, design, "office.ergata");
  const directions = action(place.directionsAction, locale);
  const notes = records(place.notes).map((entry) => localized(entry, locale)).filter(Boolean);
  const name = localized(place.name, locale);
  const placePhone = typeof place.phone === "string" ? place.phone : phone;
  return <article className="eg2-place eg2-place-office" data-reveal="rise" data-qa="ergata-place-office">
    <div className="eg2-place-media">
      {photo ? <div className="eg2-place-frame" data-pan=""><Photo className="eg2-place-photo" image={photo} sizes="(max-width: 760px) 92vw, 46vw" /></div> : null}
      <div className="eg2-map-card" role="img" aria-label={chrome.t("areaMap", { name })}>
        <AreaMap />
        <span className="eg2-map-label"><Icon name="pin" />{name}</span>
      </div>
    </div>
    <div className="eg2-place-body">
      <MeetBadge meet="in_person" chrome={chrome} />
      <h3>{name}</h3>
      <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={habesha} />
      <p className="eg2-place-address"><Icon name="pin" /><span>{localized(place.address, locale)}</span></p>
      {localized(place.body, locale) ? <p className="eg2-place-note">{localized(place.body, locale)}</p> : null}
      {notes.length ? <ul className="eg2-place-notes" aria-label={chrome.t("goodToKnow")}>{notes.map((note, index) => <li key={index}><Icon name="check" />{note}</li>)}</ul> : null}
      {days.length ? <HoursList days={days} locale={locale} habesha={habesha} label={ex(chrome, "officeHours")} />
        : localized(place.hours, locale) ? <dl className="eg2-place-facts"><div><dt><Icon name="clock" /><span>{chrome.t("hours")}</span></dt><dd>{localized(place.hours, locale)}</dd></div></dl> : null}
      {placePhone ? <dl className="eg2-place-facts"><div><dt><Icon name="phone" /><span>{chrome.t("phone")}</span></dt><dd><a href={telHref(placePhone)}>{formatPhone(placePhone)}</a></dd></div></dl> : null}
      {directions ? <a className="eg2-btn eg2-btn-quiet" href={directions.href} rel="noopener noreferrer" data-qa="ergata-directions"><Icon name="pin" /><span>{directions.label}</span></a> : null}
    </div>
  </article>;
}

function OnlineCard({ place, locale, chrome, design, days, now, habesha }: PlaceProps) {
  const photo = art(place, locale, design, "online.ergata");
  const notes = records(place.notes).map((entry) => localized(entry, locale)).filter(Boolean);
  return <article className="eg2-place eg2-place-online" data-reveal="rise" data-qa="ergata-place-online">
    <div className="eg2-place-media">
      {photo ? <div className="eg2-place-frame" data-pan=""><Photo className="eg2-place-photo" image={photo} sizes="(max-width: 760px) 92vw, 46vw" /></div> : null}
      <div className="eg2-online-card" aria-hidden="true"><OnlineArt /></div>
    </div>
    <div className="eg2-place-body">
      <MeetBadge meet="online" chrome={chrome} />
      <h3>{localized(place.name, locale)}</h3>
      <OpenBadge days={days} now={now} chrome={chrome} locale={locale} habesha={habesha} />
      <p className="eg2-place-address"><Icon name="video" /><span>{localized(place.address, locale)}</span></p>
      {notes.length ? <ol className="eg2-place-steps" aria-label={chrome.t("goodToKnow")}>{notes.map((note, index) => <li key={index}><span aria-hidden="true">{index + 1}</span>{note}</li>)}</ol> : null}
      {localized(place.body, locale) ? <p className="eg2-place-privacy"><Icon name="lock" /><span>{localized(place.body, locale)}</span></p> : null}
      {days.length ? <HoursList days={days} locale={locale} habesha={habesha} label={ex(chrome, "onlineHours")} />
        : localized(place.hours, locale) ? <dl className="eg2-place-facts"><div><dt><Icon name="clock" /><span>{chrome.t("hours")}</span></dt><dd>{localized(place.hours, locale)}</dd></div></dl> : null}
    </div>
  </article>;
}

export function ErgataSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const credit = useTemplateCredit(chrome);
  const root = useRef<HTMLDivElement>(null);
  const design = snapshot.compiledDesign;
  const level = useErgataMotion(root, design.motion, locale);
  const scroll = useScrollState(16);
  const sticky = useScrollState(560);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useNextAvailability(snapshot.booking?.liveAvailability === true, publicRoot);
  const progress = useSectionProgress(root, locale);
  const [habesha, setHabesha] = useState(locale === "am");
  const band = useRef<HTMLElement>(null);
  const [bandVisible, setBandVisible] = useState(false);
  useEffect(() => {
    const node = band.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => setBandVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const get = (type: string) => section(snapshot.sections, type);
  const hero = get("hero");
  const benefits = get("benefits");
  const approaches = get("approaches");
  const about = get("about");
  const process = get("process");
  const services = get("services");
  const providers = get("providers");
  const proof = get("proof");
  const testimonials = get("testimonials");
  const faq = get("faq");
  const notice = get("notice");
  const locations = get("locations");
  const contact = get("contact");
  const booking = get("booking_cta");
  const footer = get("footer");

  const primary = action(hero.primaryAction, locale);
  const secondary = action(hero.secondaryAction, locale);
  const bookingAction = action(booking.action, locale);
  const bookLabel = primary?.label || bookingAction?.label || "";
  const bookHref = primary?.href || bookingAction?.href;
  const heroImage = art(hero, locale, design, "hero.primary");
  const aboutImage = art(about, locale, design, "section.detail");
  const aboutDetail = art(null, locale, design, "window.ergata");
  const needsImage = art(benefits, locale, design, "needs.ergata");
  const approachImage = art(approaches, locale, design, "approach.ergata");
  const faqImage = art(faq, locale, design, "faq.ergata");
  const bandImage = art(booking, locale, design, "band.ergata");
  const voicesImage = art(testimonials, locale, design, "testimonial.ergata");
  const contactImage = art(contact, locale, design, "contact.ergata");
  const logo = brandLogo(design);
  const needs = records(benefits.items);
  const ways = records(approaches.items);
  const steps = records(process.items);
  const sessions = records(services.items);
  const team = records(providers.items);
  const credentials = records(proof.items);
  const voices: Voice[] = records(testimonials.items).map((item) => ({ quote: localized(item.quote, locale), who: localized(item.attribution, locale), role: localized(item.role, locale) })).filter((item) => item.quote);
  const questions = records(faq.items);
  const places = records(locations.items);
  const offices = places.filter((item) => placeMeet(item, snapshot.placeFormats) === "in_person");
  const online = places.filter((item) => placeMeet(item, snapshot.placeFormats) === "online");
  const highlights = records(about.highlights).map((item) => localized(item, locale)).filter(Boolean);
  const lead = team[0];
  const leadPhoto = lead ? contentImage(lead, locale) : null;
  const phone = typeof contact.phone === "string" ? contact.phone : typeof offices[0]?.phone === "string" ? offices[0].phone : "";
  const email = typeof contact.email === "string" ? contact.email : "";
  const contactAction = action(contact.action, locale);
  const footerLinks = records(footer.items).flatMap((item) => {
    const link = action(item.action, locale);
    return link && !link.href.endsWith("/book") && !link.href.endsWith("#contact") ? [link] : [];
  });
  const hasVisit = Boolean(places.length || phone || email);
  const paths = snapshot.bookingPaths || {};
  const meets = Array.from(new Set(sessions.map((item) => sessionMeet(item, snapshot.sessionFormats))));
  const data = live.data;
  const intro = introSession(sessions);
  const introNext = intro && typeof intro.id === "string" ? data?.services[intro.id]?.next : null;
  const nextIso = introNext || data?.next?.start || null;
  const nextVariant = introNext ? "nextIntro" : "nextSession";
  const introHref = intro && typeof intro.id === "string" ? paths[intro.id] : undefined;
  const bookNow = Boolean(bookHref && bookLabel);
  const anyHours = places.some((item) => placeDays(snapshot, item.id).length);
  const showDots = progress.sections.length > 4;

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} data-motion-level={level}
    data-night={night} data-daypart={now.part} data-density={String(design.density.presentation || "spacious")} className="eg2"
    data-template="ergata-therapy-v2" lang={locale} style={rootStyle}>
    <a className="eg2-skip" href="#eg2-main">{chrome.t("skip")}</a>
    <header className="eg2-bar" data-scrolled={scroll.scrolled}>
      <div className="eg2-wrap eg2-bar-inner">
        <Brand logo={logo} name={applicationName} href={publicRoot} />
        <nav aria-label={chrome.t("navLabel")} className="eg2-nav">
          {ways.length ? <a href="#approach">{chrome.t("approach")}</a> : null}
          {sessions.length ? <a href="#sessions">{chrome.t("sessions")}</a> : null}
          {questions.length ? <a href="#faq">{chrome.t("questions")}</a> : null}
          {hasVisit ? <a href="#contact">{chrome.t("visit")}</a> : null}
        </nav>
        <ModeSwitch mode={mode} toggleMode={toggleMode} chrome={chrome} level={level} />
        {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} className="eg2-btn eg2-bar-book" qa="ergata-bar-book" /> : null}
      </div>
    </header>

    {showDots ? <nav className="eg2-dots" aria-label={chrome.t("onThisPage")} data-hidden={progress.active === 0} data-qa="ergata-dots">
      <ol>{progress.sections.map((item, index) => <li key={item.id}><a href={`#${item.id}`} aria-current={index === progress.active ? "true" : undefined}><span>{item.label}</span></a></li>)}</ol>
    </nav> : null}

    <main id="eg2-main">
      <section className="eg2-hero" id="top" data-section={applicationName} aria-labelledby="eg2-hero-title">
        <div className="eg2-wrap eg2-hero-grid">
          <div className="eg2-hero-copy">
            <p className="eg2-greet" data-qa="ergata-greeting"><Sprig className="eg2-greet-sprig" /><span>{greeting(chrome, now)}</span></p>
            <ErgataHoliday snapshot={snapshot} locale={locale} chrome={chrome} />
            {localized(hero.eyebrow, locale) ? <p className="eg2-eyebrow"><span className="eg2-eyebrow-dot" aria-hidden="true" />{localized(hero.eyebrow, locale)}</p> : null}
            <h1 id="eg2-hero-title">{localized(hero.title, locale)}</h1>
            {localized(hero.subtitle, locale) ? <p className="eg2-lede">{localized(hero.subtitle, locale)}</p> : null}
            <div className="eg2-actions">
              {bookNow ? <BookLink href={bookHref!} label={bookLabel} level={level} className="eg2-btn eg2-btn-lg" qa="ergata-hero-book" /> : null}
              {secondary ? <a className="eg2-soft-link" href={secondary.href} data-qa="ergata-hero-secondary">
                <Icon name={secondary.href.endsWith("#faq") ? "intro" : "phone"} /><span>{secondary.label}</span><Icon name="arrow" className="eg2-icon eg2-icon-arrow" />
              </a> : null}
            </div>
            {live.status === "loading" ? <span className="eg2-next eg2-next-wait" aria-hidden="true" />
              : <NextChip iso={nextIso} data={data} chrome={chrome} locale={locale} variant={nextVariant} href={introNext ? introHref : undefined} qa="ergata-next-free" />}
            {meets.length > 1 ? <ul className="eg2-hero-meets">{meets.map((meet) => <li key={meet}><MeetBadge meet={meet} chrome={chrome} /></li>)}</ul> : null}
            {localized(hero.body, locale) ? <p className="eg2-reassure"><Icon name="lock" />{localized(hero.body, locale)}</p> : null}
          </div>
          {heroImage ? <figure className="eg2-hero-art">
            <Blob variant={0} className="eg2-blob eg2-hero-blob" />
            <span className="eg2-par eg2-par-sprig" data-scroll="" aria-hidden="true"><Sprig className="eg2-sprig eg2-hero-sprig" /></span>
            <div className="eg2-arch eg2-hero-arch" data-scroll=""><Photo image={heroImage} night={night} eager sizes="(max-width: 760px) 92vw, 40vw" className="eg2-hero-photo" /></div>
            {lead && localized(lead.name, locale) ? <figcaption className="eg2-hero-card">
              {leadPhoto ? <img src={leadPhoto.src} alt="" width={64} height={64} /> : <span className="eg2-initial" aria-hidden="true">{localized(lead.name, locale).slice(0, 1)}</span>}
              <span><strong>{localized(lead.name, locale)}</strong>{localized(lead.role, locale) ? <span>{localized(lead.role, locale)}</span> : null}</span>
            </figcaption> : null}
          </figure> : null}
        </div>
      </section>

      {needs.length ? <section className="eg2-section eg2-needs" id="help" data-section={localized(benefits.title, locale)} aria-labelledby="eg2-needs-title">
        <div className="eg2-wrap eg2-split">
          <header className="eg2-head eg2-needs-head" data-reveal="rise">
            <h2 id="eg2-needs-title">{localized(benefits.title, locale)}</h2>
            {localized(benefits.intro, locale) ? <p>{localized(benefits.intro, locale)}</p> : null}
            {needsImage ? <figure className="eg2-needs-art">
              <span className="eg2-par eg2-par-blob" data-scroll="" aria-hidden="true"><Blob variant={1} className="eg2-blob eg2-needs-blob" /></span>
              <div className="eg2-arch eg2-arch-soft" data-pan=""><Photo image={needsImage} sizes="(max-width: 760px) 80vw, 30vw" /></div>
            </figure> : null}
          </header>
          <div className="eg2-rail-wrap">
            <ul className="eg2-needs-list eg2-rail" tabIndex={0} aria-label={localized(benefits.title, locale)} data-reveal-stagger="">
              {needs.map((item, index) => <li key={index} data-reveal="rise" data-tone={index % 3}>
                <span className="eg2-needs-scene"><NeedArt name={iconName(item.icon, "leaf")} /></span>
                <div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div>
              </li>)}
            </ul>
            <p className="eg2-swipe" aria-hidden="true"><Icon name="arrow" />{ex(chrome, "swipeHint")}</p>
          </div>
        </div>
      </section> : null}

      {ways.length ? <section className="eg2-section eg2-approach" id="approach" data-section={localized(approaches.title, locale)} aria-labelledby="eg2-approach-title">
        <span className="eg2-par eg2-par-deep" data-scroll="" aria-hidden="true"><Blob variant={2} className="eg2-blob eg2-approach-blob" /></span>
        <svg className="eg2-approach-path" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true" focusable="false" data-scroll="">
          <path d="M-20 700C200 620 260 470 420 450s300 80 440-40 160-300 360-360" pathLength={1} />
        </svg>
        <div className="eg2-wrap eg2-approach-grid">
          <div className="eg2-approach-side">
            <header className="eg2-head" data-reveal="rise">
              <h2 id="eg2-approach-title">{localized(approaches.title, locale)}</h2>
              {localized(approaches.intro, locale) ? <p>{localized(approaches.intro, locale)}</p> : null}
            </header>
            {approachImage ? <figure className="eg2-approach-art" data-reveal="arch">
              <div className="eg2-arch" data-pan=""><Photo image={approachImage} sizes="(max-width: 760px) 92vw, 34vw" /></div>
            </figure> : null}
          </div>
          <ol className="eg2-ways" data-reveal-stagger="">
            {ways.map((item, index) => <li key={index} data-reveal="rise">
              <span className="eg2-way-stone"><StoneArt index={index} /></span>
              <div>
                <h3>{localized(item.title, locale)}</h3>
                <p>{localized(item.description, locale)}</p>
              </div>
            </li>)}
          </ol>
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="eg2-section eg2-about" id="about" data-section={localized(about.title, locale)} aria-labelledby="eg2-about-title">
        <div className="eg2-wrap eg2-about-grid">
          {aboutImage ? <figure className="eg2-about-art" data-reveal="rise">
            <span className="eg2-par eg2-par-blob" data-scroll="" aria-hidden="true"><Blob variant={0} className="eg2-blob eg2-about-blob" /></span>
            <div className="eg2-about-main" data-pan=""><Photo image={aboutImage} sizes="(max-width: 760px) 92vw, 46vw" /></div>
            {aboutDetail ? <div className="eg2-about-detail" data-scroll=""><Photo image={aboutDetail} sizes="(max-width: 760px) 40vw, 18vw" decorative /></div> : null}
          </figure> : null}
          <div className="eg2-about-copy" data-reveal="rise">
            <h2 id="eg2-about-title">{localized(about.title, locale)}</h2>
            {localized(about.body, locale).split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {highlights.length ? <ul className="eg2-chips">{highlights.map((item, index) => <li key={index}><Icon name="leaf" />{item}</li>)}</ul> : null}
          </div>
        </div>
      </section> : null}

      {steps.length ? <section className="eg2-section eg2-steps" id="first-session" data-section={localized(process.title, locale)} aria-labelledby="eg2-steps-title">
        <div className="eg2-wrap">
          <header className="eg2-head eg2-head-wide eg2-head-center" data-reveal="rise">
            <h2 id="eg2-steps-title">{localized(process.title, locale)}</h2>
            {localized(process.intro, locale) ? <p>{localized(process.intro, locale)}</p> : null}
          </header>
          <div className="eg2-step-track">
            <StepPath />
            <ol className="eg2-step-list" style={{ "--e2-steps": Math.min(steps.length, 4) } as CSSProperties} data-reveal-stagger="">
              {steps.map((item, index) => {
                const number = String(item.step || index + 1);
                return <li key={index} data-reveal="rise">
                  <span className="eg2-step-stop"><StepArt index={index} /><span className="eg2-step-dot" aria-hidden="true">{number}</span></span>
                  <h3><span className="eg2-sr">{chrome.t("step", { count: number })} </span>{localized(item.title, locale)}</h3>
                  <p>{localized(item.description, locale)}</p>
                </li>;
              })}
            </ol>
          </div>
        </div>
      </section> : null}

      {sessions.length ? <section className="eg2-section eg2-sessions-section" id="sessions" data-section={localized(services.title, locale)} aria-labelledby="eg2-sessions-title">
        <div className="eg2-wrap">
          <header className="eg2-head eg2-head-wide" data-reveal="rise">
            <h2 id="eg2-sessions-title">{localized(services.title, locale)}</h2>
            {localized(services.intro, locale) ? <p>{localized(services.intro, locale)}</p> : null}
          </header>
          <div className="eg2-rail-wrap">
            <Sessions items={sessions} locale={locale} chrome={chrome} bookHref={bookHref} paths={paths} formats={snapshot.sessionFormats} data={data} />
            <p className="eg2-swipe" aria-hidden="true"><Icon name="arrow" />{ex(chrome, "swipeHint")}</p>
          </div>
        </div>
      </section> : null}

      {team.length ? <section className="eg2-section eg2-people" id="team" data-section={localized(providers.title, locale)} aria-labelledby="eg2-people-title">
        <div className="eg2-wrap">
          <header className="eg2-head eg2-head-wide" data-reveal="rise">
            <h2 id="eg2-people-title">{localized(providers.title, locale)}</h2>
            {localized(providers.intro, locale) ? <p>{localized(providers.intro, locale)}</p> : null}
          </header>
          <div className={team.length === 1 ? "eg2-people-grid eg2-people-solo" : "eg2-people-grid"}>
            <ul className="eg2-people-list">
              {team.map((item, index) => {
                const photo = contentImage(item, locale);
                const name = localized(item.name, locale);
                const specialties = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
                const notes = records(item.credentials).map((entry) => localized(entry, locale)).filter(Boolean);
                const bookWith = action(item.action, locale);
                const next = typeof item.id === "string" ? data?.providers[item.id]?.next : null;
                return <li key={String(item.id || index)} className="eg2-person" data-reveal="rise">
                  <div className="eg2-portrait-wrap">
                    <span className="eg2-par eg2-par-blob" data-scroll="" aria-hidden="true"><Blob variant={index + 1} className="eg2-blob eg2-portrait-blob" /></span>
                    {photo ? <img className="eg2-portrait" src={photo.src} alt={photo.alt || name} style={photo.position ? { objectPosition: photo.position } : undefined} loading="lazy" decoding="async" width={768} height={768} /> : <span className="eg2-portrait eg2-initial" aria-hidden="true">{name.slice(0, 1)}</span>}
                    <span className="eg2-par eg2-par-sprig" data-scroll="" aria-hidden="true"><Sprig className="eg2-sprig eg2-portrait-sprig" /></span>
                  </div>
                  <div>
                    <h3>{name}</h3>
                    {localized(item.role, locale) ? <p className="eg2-role">{localized(item.role, locale)}</p> : null}
                    {specialties.length ? <ul className="eg2-chips">{specialties.map((entry, key) => <li key={key}>{entry}</li>)}</ul> : null}
                    {notes.length ? <ul className="eg2-ticks">{notes.map((entry, key) => <li key={key}><Icon name="check" />{entry}</li>)}</ul> : null}
                    <NextChip iso={next} data={data} chrome={chrome} locale={locale} variant="nextSession" qa={`ergata-person-next-${index}`} />
                    {bookWith && bookHref ? <BookLink href={bookHref} label={bookWith.label} level={level} qa="ergata-person-book" /> : null}
                  </div>
                </li>;
              })}
            </ul>
            {credentials.length ? <aside className="eg2-credentials" aria-labelledby="eg2-credentials-title" data-reveal="rise">
              <h3 id="eg2-credentials-title">{localized(proof.title, locale)}</h3>
              {localized(proof.intro, locale) ? <p className="eg2-credentials-intro">{localized(proof.intro, locale)}</p> : null}
              <dl>{credentials.map((item, index) => <div key={index}>
                <span className="eg2-credential-mark" aria-hidden="true"><Icon name={(["leaf", "shield", "link", "path"] as const)[index % 4]} /></span>
                <dt>{localized(item.label, locale)}</dt>
                <dd><strong>{localized(item.value, locale)}</strong>{localized(item.detail, locale) ? <span>{localized(item.detail, locale)}</span> : null}</dd>
              </div>)}</dl>
            </aside> : null}
          </div>
        </div>
      </section> : null}

      {voices.length ? <section className="eg2-section eg2-voices" id="voices" data-section={localized(testimonials.title, locale) || ex(chrome, "voices")} aria-labelledby="eg2-voices-title">
        <div className="eg2-wrap">
          <header className="eg2-head eg2-head-wide" data-reveal="rise">
            <h2 id="eg2-voices-title">{localized(testimonials.title, locale) || ex(chrome, "voices")}</h2>
            {localized(testimonials.intro, locale) ? <p>{localized(testimonials.intro, locale)}</p> : null}
          </header>
        </div>
        <div className={voices.length >= 3 ? "eg2-voices-wide" : "eg2-wrap"}>
          <Voices items={voices} chrome={chrome} level={level}
            aside={voicesImage ? <div className="eg2-voices-art" data-reveal="arch"><div className="eg2-arch" data-pan=""><Photo image={voicesImage} sizes="(max-width: 760px) 60vw, 300px" /></div></div> : null} />
        </div>
      </section> : null}

      {questions.length ? <section className="eg2-section eg2-faq" id="faq" data-section={localized(faq.title, locale)} aria-labelledby="eg2-faq-title">
        <div className="eg2-wrap eg2-split">
          <header className="eg2-head eg2-faq-head" data-reveal="rise">
            <h2 id="eg2-faq-title">{localized(faq.title, locale)}</h2>
            {faqImage ? <figure className="eg2-faq-art">
              <div className="eg2-arch" data-pan=""><Photo image={faqImage} sizes="(max-width: 760px) 80vw, 30vw" /></div>
              {hasVisit && localized(contact.title, locale) ? <a className="eg2-faq-ask" href="#contact">
                <span className="eg2-faq-ask-icon"><Icon name="intro" /></span><span>{localized(contact.title, locale)}</span><Icon name="arrow" className="eg2-icon eg2-icon-arrow" />
              </a> : null}
            </figure> : hasVisit && localized(contact.title, locale) ? <a className="eg2-soft-link" href="#contact">
              <Icon name="intro" /><span>{localized(contact.title, locale)}</span><Icon name="arrow" className="eg2-icon eg2-icon-arrow" />
            </a> : null}
          </header>
          <div className="eg2-faq-list">{questions.map((item, index) => <details key={index} data-qa="ergata-faq-item">
            <summary><span className="eg2-faq-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{localized(item.question, locale)}</span><Icon name="plus" className="eg2-icon eg2-faq-icon" /></summary>
            <div className="eg2-faq-answer"><p>{localized(item.answer, locale)}</p></div>
          </details>)}</div>
        </div>
      </section> : null}

      {localized(notice.title, locale) ? <section className="eg2-section eg2-notice-section" aria-label={localized(notice.title, locale)}>
        <div className="eg2-wrap" data-reveal="rise"><SafetyNotice notice={notice} locale={locale} chrome={chrome} /></div>
      </section> : null}

      {hasVisit ? <section className="eg2-section eg2-visit" id="contact" data-section={chrome.t("visit")} aria-labelledby="eg2-visit-title">
        <div className="eg2-wrap">
          <header className="eg2-head eg2-head-wide eg2-head-center" data-reveal="rise">
            <h2 id="eg2-visit-title">{localized(locations.title, locale) || localized(contact.title, locale)}</h2>
            {localized(locations.intro, locale) ? <p>{localized(locations.intro, locale)}</p> : null}
            {anyHours ? <ClockSwitch chrome={chrome} habesha={habesha} onHabesha={setHabesha} /> : null}
          </header>
          {places.length ? <div className={offices.length + online.length > 1 ? "eg2-places" : "eg2-places eg2-places-one"}>
            {offices.map((place, index) => <OfficeCard key={`office-${index}`} place={place} locale={locale} chrome={chrome} design={design} phone={phone}
              days={placeDays(snapshot, place.id)} now={now} habesha={habesha} />)}
            {online.map((place, index) => <OnlineCard key={`online-${index}`} place={place} locale={locale} chrome={chrome} design={design} phone={phone}
              days={placeDays(snapshot, place.id)} now={now} habesha={habesha} />)}
          </div> : null}
          {phone || email || localized(contact.body, locale) ? <div className="eg2-contact-strip" data-reveal="rise">
            {contactImage ? <div className="eg2-contact-photo" data-pan=""><Photo image={contactImage} sizes="(max-width: 760px) 92vw, 220px" /></div>
              : <span className="eg2-contact-mark" aria-hidden="true"><Icon name="mail" /></span>}
            <div className="eg2-contact-copy">
              <h3>{localized(contact.title, locale) || ex(chrome, "askFirst")}</h3>
              {localized(contact.body, locale) ? <p>{localized(contact.body, locale)}</p> : null}
            </div>
            <div className="eg2-contact-links">
              {phone ? <a href={telHref(phone)}><Icon name="phone" /><span>{formatPhone(phone)}</span></a> : null}
              {email ? <a href={`mailto:${email}`}><Icon name="mail" /><span>{email}</span></a> : null}
              {contactAction && !contactAction.href.endsWith("/book") && !contactAction.href.startsWith("tel:") ? <a href={contactAction.href}><Icon name="arrow" /><span>{contactAction.label}</span></a> : null}
            </div>
          </div> : null}
        </div>
      </section> : null}

      {bookNow ? <section ref={band} className="eg2-band" id="book" data-section={bookingAction?.label || bookLabel} aria-labelledby="eg2-band-title">
        <div className="eg2-wrap">
          <div className="eg2-band-inner" data-reveal="rise">
            <span className="eg2-par eg2-par-band" data-scroll="" aria-hidden="true"><Blob variant={1} className="eg2-blob eg2-band-blob" /></span>
            <div className="eg2-band-copy">
              <h2 id="eg2-band-title">{localized(booking.title, locale)}</h2>
              {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
              <BookLink href={bookingAction?.href || bookHref!} label={bookLabel} level={level} className="eg2-btn eg2-btn-inverse eg2-btn-lg" qa="ergata-band-book" />
              {data && nextIso ? <div className="eg2-band-live">
                <NextChip iso={nextIso} data={data} chrome={chrome} locale={locale} variant={nextVariant} href={introNext ? introHref : undefined} className="eg2-next eg2-next-on-deep" qa="ergata-band-next" />
                {data.todayLeft && data.todayLeft <= 8 ? <p className="eg2-left" data-qa="ergata-left-today">{data.todayLeft === 1 ? chrome.t("leftTodayOne") : chrome.t("leftToday", { count: data.todayLeft })}</p> : null}
              </div> : null}
            </div>
            {bandImage ? <div className="eg2-band-window" data-scroll=""><Photo image={bandImage} night={night} sizes="(max-width: 760px) 70vw, 300px" decorative /></div> : <span className="eg2-band-arch" aria-hidden="true" />}
          </div>
        </div>
      </section> : null}
    </main>

    <footer className="eg2-footer">
      <Horizon />
      <div className="eg2-wrap eg2-footer-grid">
        <div className="eg2-footer-brand">
          <Brand logo={logo} name={applicationName} href={publicRoot} />
          {localized(footer.body, locale) ? <p>{localized(footer.body, locale)}</p> : null}
          {offices[0] ? <OpenBadge days={placeDays(snapshot, offices[0].id)} now={now} chrome={chrome} locale={locale} habesha={habesha} /> : null}
        </div>
        <nav aria-label={chrome.t("navLabel")} className="eg2-footer-nav">
          {ways.length ? <a href="#approach">{chrome.t("approach")}</a> : null}
          {sessions.length ? <a href="#sessions">{chrome.t("sessions")}</a> : null}
          {questions.length ? <a href="#faq">{chrome.t("questions")}</a> : null}
          <a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a>
          <a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a>
          {footerLinks.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="eg2-legal">
          <small>© {new Date().getFullYear()} {applicationName}</small>
          {credit ? <p className="eg2-credit" lang={locale} data-qa="template-credit">{credit.before}<a href={credit.href} rel="noopener" data-qa="template-credit-link">{credit.product}</a>{credit.after}</p> : null}
        </div>
      </div>
    </footer>

    {bookNow ? <div className="eg2-sticky" data-show={sticky.scrolled && !bandVisible} data-qa="ergata-sticky-book">
      <span className="eg2-sticky-arch" aria-hidden="true" />
      <NextChip iso={nextIso} data={data} chrome={chrome} locale={locale} variant="nextShort" className="eg2-next eg2-next-small" />
      <BookLink href={bookHref!} label={bookLabel} level={level} className="eg2-btn" />
    </div> : null}
  </div>;
}

/** The template's own loading screen: linen, an arch that slowly fills with dawn light, and quiet bones. */
export function ErgataLoading({ mode, locale = "en" }: { mode: TemplateProps["mode"]; locale?: string }) {
  const chrome = usePublicChrome(locale);
  return <div className="eg2 eg2-loading" data-pe-mode={mode} data-template="ergata-therapy-v2" role="status" aria-busy="true" data-qa="ergata-loading" lang={locale}>
    <span className="eg2-sr">{chrome.t("loadingSite")}</span>
    <div className="eg2-load-bar" aria-hidden="true"><div className="eg2-wrap"><i className="eg2-bone eg2-bone-brand" /><i className="eg2-bone eg2-bone-pill" /></div></div>
    <div className="eg2-wrap eg2-load-hero" aria-hidden="true">
      <div className="eg2-load-copy"><i className="eg2-bone eg2-bone-short" /><i className="eg2-bone eg2-bone-title" /><i className="eg2-bone eg2-bone-title eg2-bone-mid" /><i className="eg2-bone" /><i className="eg2-bone eg2-bone-btn" /></div>
      <div className="eg2-load-arch"><span className="eg2-load-glow" /><Sprig className="eg2-load-sprig" /></div>
    </div>
  </div>;
}

/** A plain click on a booking link moves inside the app, so the scheduler opens without a full reload. */
function inApp(event: MouseEvent<HTMLAnchorElement>, href: string, navigate: (to: string) => void) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !href.startsWith("/") || href.startsWith("//")) return;
  event.preventDefault();
  navigate(href);
}

export function ErgataBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const design = snapshot.compiledDesign;
  const level = useErgataMotion(root, design.motion, locale);
  const now = useTimeOfDay();
  const night = useNight(mode, now);
  const live = useNextAvailability(snapshot.booking?.liveAvailability === true, publicRoot);
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const notice = section(snapshot.sections, "notice");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const logo = brandLogo(design);
  const sessions = records(services.items);
  const windowArt: Art | null = art(booking, locale, design, "band.ergata");
  const data = live.data;
  const intro = introSession(sessions);
  const introNext = intro && typeof intro.id === "string" ? data?.services[intro.id]?.next : null;
  const introHref = intro && typeof intro.id === "string" ? snapshot.bookingPaths?.[intro.id] : undefined;
  return <div ref={root} data-motion={design.motion} data-motion-level={level} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode}
    data-night={night} className="eg2 eg2-handoff" data-template="ergata-therapy-v2" lang={locale} style={rootStyle}>
    <header className="eg2-bar">
      <div className="eg2-wrap eg2-bar-inner">
        <Brand logo={logo} name={applicationName} href={publicRoot} />
        <a className="eg2-back" href={publicRoot} data-qa="ergata-back"><Icon name="arrow" className="eg2-icon eg2-icon-back" /><span>{chrome.t("backToSite")}</span></a>
        <ModeSwitch mode={mode} toggleMode={toggleMode} chrome={chrome} level={level} />
      </div>
    </header>
    <main className="eg2-wrap eg2-handoff-grid">
      <div className="eg2-handoff-copy" data-vt-book="">
        {windowArt ? <div className="eg2-handoff-window"><Photo image={windowArt} night={night} eager sizes="(max-width: 760px) 120px, 160px" decorative /></div> : <span className="eg2-handoff-arch" aria-hidden="true" />}
        <p className="eg2-greet"><Sprig className="eg2-greet-sprig" /><span>{greeting(chrome, now)}</span></p>
        <h1>{localized(booking.title, locale)}</h1>
        {localized(booking.body, locale) ? <p className="eg2-lede">{localized(booking.body, locale)}</p> : null}
        {bookingPath && label ? <a className="eg2-btn eg2-btn-lg" href={bookingPath} onClick={(event) => inApp(event, bookingPath, navigate)} data-qa="ergata-handoff-book">{label}</a> : null}
        <NextChip iso={introNext || data?.next?.start} data={data} chrome={chrome} locale={locale} variant={introNext ? "nextIntro" : "nextSession"}
          href={introNext ? introHref : undefined} qa="ergata-handoff-next" pending={live.status === "loading"} />
        {localized(hero.body, locale) ? <p className="eg2-reassure"><Icon name="lock" />{localized(hero.body, locale)}</p> : null}
        <SafetyNotice notice={notice} locale={locale} chrome={chrome} compact />
      </div>
      {sessions.length ? <section className="eg2-handoff-sessions" aria-labelledby="eg2-handoff-sessions-title">
        <h2 id="eg2-handoff-sessions-title">{localized(services.title, locale)}</h2>
        <Sessions items={sessions} locale={locale} chrome={chrome} paths={snapshot.bookingPaths} formats={snapshot.sessionFormats} data={data} compact
          onPick={(event, href) => inApp(event, href, navigate)} />
      </section> : null}
    </main>
  </div>;
}
