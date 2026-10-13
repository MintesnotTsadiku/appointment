import { useRef, type CSSProperties } from "react";

import type { BookingTemplateProps, TemplateProps } from "../types";
import type { CompiledDesign, SessionFormat } from "../../types";
import { meetOfFormat, placeMeetOf, sessionMeetOf, type Meet } from "@/lib/online-session";
import type { ContentRecord } from "../content";
import { action, brandLogo, contentImage, durationMinutes, formatPrice, localized, records, section } from "../content";
import { useTemplateCredit } from "../credit";
import { usePublicChrome, type PublicChrome } from "../chrome";
import { useReveal, useScrollState } from "../motion";
import { Icon, iconName, type ErgataIconName } from "./icons";
import { AreaMap, Blob, FormatArt, Horizon, NeedArt, NoticeArt, OnlineArt, Sprig, StepArt, StepPath, StoneArt, type FormatKey } from "./illustrations";
import "./ergata.css";

/*
 * Ergata Therapy v1: a page for a counsellor or a small group practice.
 * The arched window is the one recurring shape (hero photo, portraits, image slots, booking band).
 * Every section carries a picture: an owner photo when the release has one, otherwise the
 * template's own photo for that slot (imagery roles `*.ergata`) and its drawn line art.
 * Copy is the owner's; anything the release does not contain is hidden.
 */

interface Art { src: string; alt: string; mobile?: string; position?: string }

/** A section's own photo, or the template's photo for that slot with its smaller mobile file. */
function art(value: unknown, locale: string, design: CompiledDesign, role: string): Art | null {
  const own = contentImage(value, locale);
  if (own) return own;
  const found = design.assets[role];
  if (!found?.src) return null;
  return { src: found.src, alt: found.alt || "", mobile: found.mobileSrc && found.mobileSrc !== found.src ? found.mobileSrc : undefined };
}

interface PhotoProps { image: Art; width: number; height: number; sizes: string; className?: string; eager?: boolean; decorative?: boolean }

function Photo({ image, width, height, sizes, className, eager = false, decorative = false }: PhotoProps) {
  return <img className={className} src={image.src} srcSet={image.mobile ? `${image.mobile} 720w, ${image.src} ${width}w` : undefined}
    sizes={image.mobile ? sizes : undefined} alt={decorative ? "" : image.alt} width={width} height={height}
    style={image.position ? { objectPosition: image.position } : undefined} loading={eager ? undefined : "lazy"} decoding="async" />;
}

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

function sessionArt(item: ContentRecord, meet: Meet): FormatKey {
  const name = `${localized(item.name, "en")} ${localized(item.name, "am")}`.toLowerCase();
  return /intro|ትውውቅ/.test(name) ? "intro" : meet;
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
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function Brand({ logo, name, href }: { logo?: string; name: string; href: string }) {
  return <a className="eg-brand" href={href}>{logo ? <img src={logo} alt="" width={40} height={40} /> : <span className="eg-brand-mark" aria-hidden="true" />}<span>{name}</span></a>;
}

function ModeSwitch({ mode, toggleMode, chrome }: Pick<TemplateProps, "mode" | "toggleMode"> & { chrome: PublicChrome }) {
  return <button type="button" className="eg-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)} data-qa="ergata-mode">
    <Icon name={mode === "dark" ? "sun" : "moon"} /><span>{chrome.modeName(mode)}</span>
  </button>;
}

function MeetBadge({ meet, chrome }: { meet: Meet; chrome: PublicChrome }) {
  return <span className="eg-meet" data-meet={meet}><Icon name={MEET_ICON[meet]} /><span>{chrome.t(MEET_LABEL[meet])}</span></span>;
}

interface SessionsProps {
  items: ContentRecord[];
  locale: string;
  chrome: PublicChrome;
  bookHref?: string;
  paths?: Record<string, string>;
  /** `sessionFormats` from the snapshot: the format of each session's location, by service id. */
  formats?: Formats;
  compact?: boolean;
}

/** Session cards. With per-session scheduler paths each card books its own session (online or office). */
function Sessions({ items, locale, chrome, bookHref, paths = {}, formats, compact = false }: SessionsProps) {
  return <ul className={compact ? "eg-sessions eg-sessions-compact" : "eg-sessions"}>
    {items.map((item, index) => {
      const minutes = durationMinutes(item.durationMinutes);
      const price = sessionPrice(item, locale, chrome);
      const name = localized(item.name, locale);
      const summary = localized(item.summary, locale);
      const own = typeof item.id === "string" ? paths[item.id] : undefined;
      const href = compact ? own : own || action(item.action, locale)?.href || bookHref;
      const meet = sessionMeet(item, formats);
      const scene = sessionArt(item, meet);
      return <li key={String(item.id || index)} className="eg-session" data-format={scene} data-meet={meet} data-reveal={compact ? undefined : true} style={{ "--i": index % 3 } as CSSProperties}>
        {compact ? <span className="eg-session-icon"><Icon name={MEET_ICON[meet]} /></span> : <div className="eg-session-scene"><FormatArt format={scene} /></div>}
        <div className="eg-session-body">
          {compact ? null : <MeetBadge meet={meet} chrome={chrome} />}
          <h3>{name}</h3>
          {summary && !compact ? <p>{summary}</p> : null}
          <p className="eg-session-facts">
            {compact ? <span className="eg-session-meet">{chrome.t(MEET_LABEL[meet])}</span> : null}
            {minutes ? <span><span className="eg-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</span> : null}
            {price ? <span className="eg-session-price" data-free={item.price === 0 || undefined}><span className="eg-sr">{chrome.t("price")} </span>{price}</span> : null}
          </p>
        </div>
        {href ? <a className="eg-session-book" href={href} aria-label={`${chrome.t("bookThis")}: ${name}`} data-qa="ergata-session-book" data-meet={meet}>
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
  return <aside className={compact ? "eg-notice eg-notice-compact" : "eg-notice"} aria-labelledby={compact ? "eg-notice-title-compact" : "eg-notice-title"} data-qa="ergata-notice">
    {compact ? <span className="eg-notice-icon"><Icon name="lifebuoy" /></span> : <div className="eg-notice-art-wrap"><Blob variant={2} className="eg-blob eg-notice-blob" /><NoticeArt /></div>}
    <div className="eg-notice-copy">
      <h2 id={compact ? "eg-notice-title-compact" : "eg-notice-title"}>{title}</h2>
      {localized(notice.body, locale) ? <p>{localized(notice.body, locale)}</p> : null}
      {lines.length ? <ul className="eg-notice-lines">
        {lines.map((item, index) => {
          const label = localized(item.label, locale);
          const phone = String(item.phone).trim();
          return <li key={index}><a href={telHref(phone)} aria-label={chrome.t("callNumber", { label, number: phone })} data-qa="ergata-notice-call">
            <Icon name="phone" /><strong>{phone}</strong><span>{label}</span>
          </a></li>;
        })}
      </ul> : null}
    </div>
  </aside>;
}

interface PlaceProps { place: ContentRecord; locale: string; chrome: PublicChrome; design: CompiledDesign; phone: string }

function OfficeCard({ place, locale, chrome, design, phone }: PlaceProps) {
  const photo = art(place, locale, design, "office.ergata");
  const directions = action(place.directionsAction, locale);
  const notes = records(place.notes).map((entry) => localized(entry, locale)).filter(Boolean);
  const name = localized(place.name, locale);
  const placePhone = typeof place.phone === "string" ? place.phone : phone;
  return <article className="eg-place eg-place-office" data-reveal data-qa="ergata-place-office">
    <div className="eg-place-media">
      {photo ? <Photo className="eg-place-photo" image={photo} width={1440} height={960} sizes="(max-width: 760px) 92vw, 46vw" /> : null}
      <div className="eg-map-card" role="img" aria-label={chrome.t("areaMap", { name })}>
        <AreaMap />
        <span className="eg-map-label"><Icon name="pin" />{name}</span>
      </div>
    </div>
    <div className="eg-place-body">
      <MeetBadge meet="in_person" chrome={chrome} />
      <h3>{name}</h3>
      <p className="eg-place-address"><Icon name="pin" /><span>{localized(place.address, locale)}</span></p>
      {localized(place.body, locale) ? <p className="eg-place-note">{localized(place.body, locale)}</p> : null}
      {notes.length ? <ul className="eg-place-notes" aria-label={chrome.t("goodToKnow")}>{notes.map((note, index) => <li key={index}><Icon name="check" />{note}</li>)}</ul> : null}
      <dl className="eg-place-facts">
        {localized(place.hours, locale) ? <div><dt><Icon name="clock" /><span>{chrome.t("hours")}</span></dt><dd>{localized(place.hours, locale)}</dd></div> : null}
        {placePhone ? <div><dt><Icon name="phone" /><span>{chrome.t("phone")}</span></dt><dd><a href={telHref(placePhone)}>{placePhone}</a></dd></div> : null}
      </dl>
      {directions ? <a className="eg-btn eg-btn-quiet" href={directions.href} rel="noopener noreferrer" data-qa="ergata-directions"><Icon name="pin" /><span>{directions.label}</span></a> : null}
    </div>
  </article>;
}

function OnlineCard({ place, locale, chrome, design }: PlaceProps) {
  const photo = art(place, locale, design, "online.ergata");
  const notes = records(place.notes).map((entry) => localized(entry, locale)).filter(Boolean);
  return <article className="eg-place eg-place-online" data-reveal data-qa="ergata-place-online">
    <div className="eg-place-media">
      {photo ? <Photo className="eg-place-photo" image={photo} width={1440} height={960} sizes="(max-width: 760px) 92vw, 46vw" /> : null}
      <div className="eg-online-card" aria-hidden="true"><OnlineArt /></div>
    </div>
    <div className="eg-place-body">
      <MeetBadge meet="online" chrome={chrome} />
      <h3>{localized(place.name, locale)}</h3>
      <p className="eg-place-address"><Icon name="video" /><span>{localized(place.address, locale)}</span></p>
      {notes.length ? <ol className="eg-place-steps" aria-label={chrome.t("goodToKnow")}>{notes.map((note, index) => <li key={index}><span aria-hidden="true">{index + 1}</span>{note}</li>)}</ol> : null}
      {localized(place.body, locale) ? <p className="eg-place-privacy"><Icon name="lock" /><span>{localized(place.body, locale)}</span></p> : null}
      {localized(place.hours, locale) ? <dl className="eg-place-facts"><div><dt><Icon name="clock" /><span>{chrome.t("hours")}</span></dt><dd>{localized(place.hours, locale)}</dd></div></dl> : null}
    </div>
  </article>;
}

export function ErgataSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const credit = useTemplateCredit(chrome);
  const root = useRef<HTMLDivElement>(null);
  const scroll = useScrollState(16);
  useReveal(root, locale);
  const design = snapshot.compiledDesign;
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
  const logo = brandLogo(design);
  const needs = records(benefits.items);
  const ways = records(approaches.items);
  const steps = records(process.items);
  const sessions = records(services.items);
  const team = records(providers.items);
  const credentials = records(proof.items);
  const quotes = records(testimonials.items);
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

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion}
    data-density={String(design.density.presentation || "spacious")} className="eg" data-template="ergata-therapy-v1" lang={locale} style={rootStyle}>
    <a className="eg-skip" href="#eg-main">{chrome.t("skip")}</a>
    <header className="eg-bar" data-scrolled={scroll.scrolled}>
      <div className="eg-wrap eg-bar-inner">
        <Brand logo={logo} name={applicationName} href={publicRoot} />
        <nav aria-label={chrome.t("navLabel")} className="eg-nav">
          {ways.length ? <a href="#approach">{chrome.t("approach")}</a> : null}
          {sessions.length ? <a href="#sessions">{chrome.t("sessions")}</a> : null}
          {questions.length ? <a href="#faq">{chrome.t("questions")}</a> : null}
          {hasVisit ? <a href="#contact">{chrome.t("visit")}</a> : null}
        </nav>
        <ModeSwitch mode={mode} toggleMode={toggleMode} chrome={chrome} />
        {bookHref && bookLabel ? <a className="eg-btn eg-bar-book" href={bookHref} data-qa="ergata-bar-book">{bookLabel}</a> : null}
      </div>
    </header>

    <main id="eg-main">
      <section className="eg-hero" aria-labelledby="eg-hero-title">
        <div className="eg-wrap eg-hero-grid">
          <div className="eg-hero-copy">
            {localized(hero.eyebrow, locale) ? <p className="eg-eyebrow"><span className="eg-eyebrow-dot" aria-hidden="true" />{localized(hero.eyebrow, locale)}</p> : null}
            <h1 id="eg-hero-title">{localized(hero.title, locale)}</h1>
            {localized(hero.subtitle, locale) ? <p className="eg-lede">{localized(hero.subtitle, locale)}</p> : null}
            <div className="eg-actions">
              {bookHref && bookLabel ? <a className="eg-btn eg-btn-lg" href={bookHref} data-qa="ergata-hero-book">{bookLabel}</a> : null}
              {secondary ? <a className="eg-soft-link" href={secondary.href} data-qa="ergata-hero-secondary">
                <Icon name={secondary.href.endsWith("#faq") ? "intro" : "phone"} /><span>{secondary.label}</span><Icon name="arrow" className="eg-icon eg-icon-arrow" />
              </a> : null}
            </div>
            {meets.length > 1 ? <ul className="eg-hero-meets">{meets.map((meet) => <li key={meet}><MeetBadge meet={meet} chrome={chrome} /></li>)}</ul> : null}
            {localized(hero.body, locale) ? <p className="eg-reassure"><Icon name="lock" />{localized(hero.body, locale)}</p> : null}
          </div>
          {heroImage ? <figure className="eg-hero-art">
            <Blob variant={0} className="eg-blob eg-hero-blob" />
            <Sprig className="eg-sprig eg-hero-sprig" />
            <div className="eg-arch"><Photo image={heroImage} width={1040} height={1300} sizes="(max-width: 760px) 92vw, 40vw" eager /></div>
            {lead && localized(lead.name, locale) ? <figcaption className="eg-hero-card">
              {leadPhoto ? <img src={leadPhoto.src} alt="" width={64} height={64} /> : <span className="eg-initial" aria-hidden="true">{localized(lead.name, locale).slice(0, 1)}</span>}
              <span><strong>{localized(lead.name, locale)}</strong>{localized(lead.role, locale) ? <span>{localized(lead.role, locale)}</span> : null}</span>
            </figcaption> : null}
          </figure> : null}
        </div>
      </section>

      {needs.length ? <section className="eg-section eg-needs" id="help" aria-labelledby="eg-needs-title">
        <div className="eg-wrap eg-split">
          <header className="eg-head eg-needs-head" data-reveal>
            <h2 id="eg-needs-title">{localized(benefits.title, locale)}</h2>
            {localized(benefits.intro, locale) ? <p>{localized(benefits.intro, locale)}</p> : null}
            {needsImage ? <figure className="eg-needs-art">
              <Blob variant={1} className="eg-blob eg-needs-blob" />
              <div className="eg-arch eg-arch-soft"><Photo image={needsImage} width={1024} height={1024} sizes="(max-width: 760px) 80vw, 30vw" /></div>
            </figure> : null}
          </header>
          <ul className="eg-needs-list">
            {needs.map((item, index) => <li key={index} data-reveal data-tone={index % 3} style={{ "--i": index % 4 } as CSSProperties}>
              <span className="eg-needs-scene"><NeedArt name={iconName(item.icon, "leaf")} /></span>
              <div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div>
            </li>)}
          </ul>
        </div>
      </section> : null}

      {ways.length ? <section className="eg-section eg-approach" id="approach" aria-labelledby="eg-approach-title">
        <Blob variant={2} className="eg-blob eg-approach-blob" />
        <div className="eg-wrap eg-approach-grid">
          <div className="eg-approach-side">
            <header className="eg-head" data-reveal>
              <h2 id="eg-approach-title">{localized(approaches.title, locale)}</h2>
              {localized(approaches.intro, locale) ? <p>{localized(approaches.intro, locale)}</p> : null}
            </header>
            {approachImage ? <figure className="eg-approach-art" data-reveal>
              <div className="eg-arch"><Photo image={approachImage} width={1024} height={1280} sizes="(max-width: 760px) 92vw, 34vw" /></div>
            </figure> : null}
          </div>
          <ol className="eg-ways">
            {ways.map((item, index) => <li key={index} data-reveal style={{ "--i": index % 3 } as CSSProperties}>
              <span className="eg-way-stone"><StoneArt index={index} /></span>
              <div>
                <h3>{localized(item.title, locale)}</h3>
                <p>{localized(item.description, locale)}</p>
              </div>
            </li>)}
          </ol>
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="eg-section eg-about" id="about" aria-labelledby="eg-about-title">
        <div className="eg-wrap eg-about-grid">
          {aboutImage ? <figure className="eg-about-art" data-reveal>
            <Blob variant={0} className="eg-blob eg-about-blob" />
            <div className="eg-about-main"><Photo image={aboutImage} width={1440} height={960} sizes="(max-width: 760px) 92vw, 46vw" /></div>
            {aboutDetail ? <div className="eg-about-detail"><Photo image={aboutDetail} width={1440} height={961} sizes="(max-width: 760px) 40vw, 18vw" decorative /></div> : null}
          </figure> : null}
          <div className="eg-about-copy" data-reveal>
            <h2 id="eg-about-title">{localized(about.title, locale)}</h2>
            {localized(about.body, locale).split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {highlights.length ? <ul className="eg-chips">{highlights.map((item, index) => <li key={index}><Icon name="leaf" />{item}</li>)}</ul> : null}
          </div>
        </div>
      </section> : null}

      {steps.length ? <section className="eg-section eg-steps" aria-labelledby="eg-steps-title">
        <div className="eg-wrap">
          <header className="eg-head eg-head-wide eg-head-center" data-reveal>
            <h2 id="eg-steps-title">{localized(process.title, locale)}</h2>
            {localized(process.intro, locale) ? <p>{localized(process.intro, locale)}</p> : null}
          </header>
          <div className="eg-step-track">
            <StepPath />
            <ol className="eg-step-list" style={{ "--eg-steps": Math.min(steps.length, 4) } as CSSProperties}>
              {steps.map((item, index) => {
                const number = String(item.step || index + 1);
                return <li key={index} data-reveal style={{ "--i": index } as CSSProperties}>
                  <span className="eg-step-stop"><StepArt index={index} /><span className="eg-step-dot" aria-hidden="true">{number}</span></span>
                  <h3><span className="eg-sr">{chrome.t("step", { count: number })} </span>{localized(item.title, locale)}</h3>
                  <p>{localized(item.description, locale)}</p>
                </li>;
              })}
            </ol>
          </div>
        </div>
      </section> : null}

      {sessions.length ? <section className="eg-section eg-sessions-section" id="sessions" aria-labelledby="eg-sessions-title">
        <div className="eg-wrap">
          <header className="eg-head eg-head-wide" data-reveal>
            <h2 id="eg-sessions-title">{localized(services.title, locale)}</h2>
            {localized(services.intro, locale) ? <p>{localized(services.intro, locale)}</p> : null}
          </header>
          <Sessions items={sessions} locale={locale} chrome={chrome} bookHref={bookHref} paths={paths} formats={snapshot.sessionFormats} />
        </div>
      </section> : null}

      {team.length ? <section className="eg-section eg-people" id="team" aria-labelledby="eg-people-title">
        <div className="eg-wrap">
          <header className="eg-head eg-head-wide" data-reveal>
            <h2 id="eg-people-title">{localized(providers.title, locale)}</h2>
            {localized(providers.intro, locale) ? <p>{localized(providers.intro, locale)}</p> : null}
          </header>
          <div className={team.length === 1 ? "eg-people-grid eg-people-solo" : "eg-people-grid"}>
            <ul className="eg-people-list">
              {team.map((item, index) => {
                const photo = contentImage(item, locale);
                const name = localized(item.name, locale);
                const specialties = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
                const notes = records(item.credentials).map((entry) => localized(entry, locale)).filter(Boolean);
                const bookWith = action(item.action, locale);
                return <li key={String(item.id || index)} className="eg-person" data-reveal style={{ "--i": index } as CSSProperties}>
                  <div className="eg-portrait-wrap">
                    <Blob variant={index + 1} className="eg-blob eg-portrait-blob" />
                    {photo ? <img className="eg-portrait" src={photo.src} alt={photo.alt || name} style={photo.position ? { objectPosition: photo.position } : undefined} loading="lazy" decoding="async" width={768} height={768} /> : <span className="eg-portrait eg-initial" aria-hidden="true">{name.slice(0, 1)}</span>}
                    <Sprig className="eg-sprig eg-portrait-sprig" />
                  </div>
                  <div>
                    <h3>{name}</h3>
                    {localized(item.role, locale) ? <p className="eg-role">{localized(item.role, locale)}</p> : null}
                    {specialties.length ? <ul className="eg-chips">{specialties.map((entry, key) => <li key={key}>{entry}</li>)}</ul> : null}
                    {notes.length ? <ul className="eg-ticks">{notes.map((entry, key) => <li key={key}><Icon name="check" />{entry}</li>)}</ul> : null}
                    {bookWith && bookHref ? <a className="eg-btn" href={bookHref} data-qa="ergata-person-book">{bookWith.label}</a> : null}
                  </div>
                </li>;
              })}
            </ul>
            {credentials.length ? <aside className="eg-credentials" aria-labelledby="eg-credentials-title" data-reveal>
              <h3 id="eg-credentials-title">{localized(proof.title, locale)}</h3>
              {localized(proof.intro, locale) ? <p className="eg-credentials-intro">{localized(proof.intro, locale)}</p> : null}
              <dl>{credentials.map((item, index) => <div key={index}>
                <span className="eg-credential-mark" aria-hidden="true"><Icon name={(["leaf", "shield", "link", "path"] as const)[index % 4]} /></span>
                <dt>{localized(item.label, locale)}</dt>
                <dd><strong>{localized(item.value, locale)}</strong>{localized(item.detail, locale) ? <span>{localized(item.detail, locale)}</span> : null}</dd>
              </div>)}</dl>
            </aside> : null}
          </div>
        </div>
      </section> : null}

      {quotes.length ? <section className="eg-section eg-voices" aria-labelledby="eg-voices-title">
        <div className="eg-wrap">
          <header className="eg-head eg-head-wide" data-reveal>
            <h2 id="eg-voices-title">{localized(testimonials.title, locale)}</h2>
            {localized(testimonials.intro, locale) ? <p>{localized(testimonials.intro, locale)}</p> : null}
          </header>
          <ul className="eg-voice-list">{quotes.map((item, index) => <li key={index} data-reveal style={{ "--i": index } as CSSProperties}>
            <figure>
              <blockquote><p>{localized(item.quote, locale)}</p></blockquote>
              <figcaption>{localized(item.attribution, locale)}{localized(item.role, locale) ? <span>{localized(item.role, locale)}</span> : null}</figcaption>
            </figure>
          </li>)}</ul>
        </div>
      </section> : null}

      {questions.length ? <section className="eg-section eg-faq" id="faq" aria-labelledby="eg-faq-title">
        <div className="eg-wrap eg-split">
          <header className="eg-head eg-faq-head" data-reveal>
            <h2 id="eg-faq-title">{localized(faq.title, locale)}</h2>
            {faqImage ? <figure className="eg-faq-art">
              <div className="eg-arch"><Photo image={faqImage} width={1024} height={1280} sizes="(max-width: 760px) 80vw, 30vw" /></div>
              {hasVisit && localized(contact.title, locale) ? <a className="eg-faq-ask" href="#contact">
                <span className="eg-faq-ask-icon"><Icon name="intro" /></span><span>{localized(contact.title, locale)}</span><Icon name="arrow" className="eg-icon eg-icon-arrow" />
              </a> : null}
            </figure> : hasVisit && localized(contact.title, locale) ? <a className="eg-soft-link" href="#contact">
              <Icon name="intro" /><span>{localized(contact.title, locale)}</span><Icon name="arrow" className="eg-icon eg-icon-arrow" />
            </a> : null}
          </header>
          <div className="eg-faq-list">{questions.map((item, index) => <details key={index} data-qa="ergata-faq-item">
            <summary><span className="eg-faq-num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><span>{localized(item.question, locale)}</span><Icon name="plus" className="eg-icon eg-faq-icon" /></summary>
            <p>{localized(item.answer, locale)}</p>
          </details>)}</div>
        </div>
      </section> : null}

      {localized(notice.title, locale) ? <section className="eg-section eg-notice-section" aria-label={localized(notice.title, locale)}>
        <div className="eg-wrap"><SafetyNotice notice={notice} locale={locale} chrome={chrome} /></div>
      </section> : null}

      {hasVisit ? <section className="eg-section eg-visit" id="contact" aria-labelledby="eg-visit-title">
        <div className="eg-wrap">
          <header className="eg-head eg-head-wide eg-head-center" data-reveal>
            <h2 id="eg-visit-title">{localized(locations.title, locale) || localized(contact.title, locale)}</h2>
            {localized(locations.intro, locale) ? <p>{localized(locations.intro, locale)}</p> : null}
          </header>
          {places.length ? <div className={offices.length + online.length > 1 ? "eg-places" : "eg-places eg-places-one"}>
            {offices.map((place, index) => <OfficeCard key={`office-${index}`} place={place} locale={locale} chrome={chrome} design={design} phone={phone} />)}
            {online.map((place, index) => <OnlineCard key={`online-${index}`} place={place} locale={locale} chrome={chrome} design={design} phone={phone} />)}
          </div> : null}
          {phone || email || localized(contact.body, locale) ? <div className="eg-contact-strip" data-reveal>
            <span className="eg-contact-mark" aria-hidden="true"><Icon name="mail" /></span>
            {localized(contact.body, locale) ? <p>{localized(contact.body, locale)}</p> : null}
            <div className="eg-contact-links">
              {phone ? <a href={telHref(phone)}><Icon name="phone" /><span>{phone}</span></a> : null}
              {email ? <a href={`mailto:${email}`}><Icon name="mail" /><span>{email}</span></a> : null}
              {contactAction && !contactAction.href.endsWith("/book") && !contactAction.href.startsWith("tel:") ? <a href={contactAction.href}><Icon name="arrow" /><span>{contactAction.label}</span></a> : null}
            </div>
          </div> : null}
        </div>
      </section> : null}

      {bookHref && bookLabel ? <section className="eg-band" aria-labelledby="eg-band-title">
        <div className="eg-wrap">
          <div className="eg-band-inner" data-reveal>
            <Blob variant={1} className="eg-blob eg-band-blob" />
            <div className="eg-band-copy">
              <h2 id="eg-band-title">{localized(booking.title, locale)}</h2>
              {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
              <a className="eg-btn eg-btn-inverse eg-btn-lg" href={bookingAction?.href || bookHref} data-qa="ergata-band-book">{bookLabel}</a>
            </div>
            {bandImage ? <div className="eg-band-window"><Photo image={bandImage} width={960} height={1280} sizes="(max-width: 760px) 70vw, 24vw" decorative /></div> : <span className="eg-band-arch" aria-hidden="true" />}
          </div>
        </div>
      </section> : null}
    </main>

    <footer className="eg-footer">
      <Horizon />
      <div className="eg-wrap eg-footer-grid">
        <div className="eg-footer-brand">
          <Brand logo={logo} name={applicationName} href={publicRoot} />
          {localized(footer.body, locale) ? <p>{localized(footer.body, locale)}</p> : null}
        </div>
        <nav aria-label={chrome.t("navLabel")} className="eg-footer-nav">
          {ways.length ? <a href="#approach">{chrome.t("approach")}</a> : null}
          {sessions.length ? <a href="#sessions">{chrome.t("sessions")}</a> : null}
          {questions.length ? <a href="#faq">{chrome.t("questions")}</a> : null}
          <a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a>
          <a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a>
          {footerLinks.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <div className="eg-legal">
          <small>© {new Date().getFullYear()} {applicationName}</small>
          {credit ? <p className="eg-credit" lang={locale} data-qa="template-credit">{credit.before}<a href={credit.href} rel="noopener" data-qa="template-credit-link">{credit.product}</a>{credit.after}</p> : null}
        </div>
      </div>
    </footer>
  </div>;
}

export function ErgataBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const notice = section(snapshot.sections, "notice");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const logo = brandLogo(design);
  const sessions = records(services.items);
  const windowArt = art(booking, locale, design, "band.ergata");
  return <div ref={root} data-motion={design.motion} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode}
    className="eg eg-handoff" data-template="ergata-therapy-v1" lang={locale} style={rootStyle}>
    <header className="eg-bar">
      <div className="eg-wrap eg-bar-inner">
        <Brand logo={logo} name={applicationName} href={publicRoot} />
        <a className="eg-back" href={publicRoot} data-qa="ergata-back"><Icon name="arrow" className="eg-icon eg-icon-back" /><span>{chrome.t("backToSite")}</span></a>
        <ModeSwitch mode={mode} toggleMode={toggleMode} chrome={chrome} />
      </div>
    </header>
    <main className="eg-wrap eg-handoff-grid">
      <div className="eg-handoff-copy">
        {windowArt ? <div className="eg-handoff-window"><Photo image={windowArt} width={960} height={1280} sizes="160px" eager decorative /></div> : <span className="eg-handoff-arch" aria-hidden="true" />}
        <h1>{localized(booking.title, locale)}</h1>
        {localized(booking.body, locale) ? <p className="eg-lede">{localized(booking.body, locale)}</p> : null}
        {bookingPath && label ? <a className="eg-btn eg-btn-lg" href={bookingPath} data-qa="ergata-handoff-book">{label}</a> : null}
        {localized(hero.body, locale) ? <p className="eg-reassure"><Icon name="lock" />{localized(hero.body, locale)}</p> : null}
        <SafetyNotice notice={notice} locale={locale} chrome={chrome} compact />
      </div>
      {sessions.length ? <section className="eg-handoff-sessions" aria-labelledby="eg-handoff-sessions-title">
        <h2 id="eg-handoff-sessions-title">{localized(services.title, locale)}</h2>
        <Sessions items={sessions} locale={locale} chrome={chrome} paths={snapshot.bookingPaths} formats={snapshot.sessionFormats} compact />
      </section> : null}
    </main>
  </div>;
}
