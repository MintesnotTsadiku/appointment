import { useRef, type CSSProperties } from "react";

import type { BookingTemplateProps, TemplateProps } from "../types";
import type { ContentRecord } from "../content";
import { action, brandLogo, contentImage, durationMinutes, formatPrice, localized, records, section, sectionImage } from "../content";
import { useTemplateCredit } from "../credit";
import { usePublicChrome, type PublicChrome } from "../chrome";
import { useReveal, useScrollState } from "../motion";
import { Icon, iconName, type ErgataIconName } from "./icons";
import "./ergata.css";

/*
 * Ergata Therapy v1: a page for a counsellor or a small group practice.
 * The arched window is the one recurring shape (hero photo, portrait, booking band).
 * Everything else stays quiet: linen ground, sage actions, clay for small marks only.
 * Copy is the owner's; anything the release does not contain is hidden.
 */

type Format = "room" | "video" | "phone" | "intro";

/** A session's format, read from its English name, chooses only the icon. */
function sessionFormat(item: ContentRecord): Format {
  const name = `${localized(item.name, "en")} ${localized(item.name, "am")}`.toLowerCase();
  if (/intro|ትውውቅ/.test(name)) return "intro";
  if (/online|video|ኦንላይን|ቪዲዮ/.test(name)) return "video";
  if (/phone|ስልክ/.test(name)) return "phone";
  return "room";
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

interface SessionsProps {
  items: ContentRecord[];
  locale: string;
  chrome: PublicChrome;
  bookHref?: string;
  compact?: boolean;
}

function Sessions({ items, locale, chrome, bookHref, compact = false }: SessionsProps) {
  return <ul className={compact ? "eg-sessions eg-sessions-compact" : "eg-sessions"}>
    {items.map((item, index) => {
      const minutes = durationMinutes(item.durationMinutes);
      const price = sessionPrice(item, locale, chrome);
      const name = localized(item.name, locale);
      const summary = localized(item.summary, locale);
      const choose = action(item.action, locale);
      const href = compact ? undefined : choose?.href || bookHref;
      const format = sessionFormat(item);
      return <li key={String(item.id || index)} className="eg-session" data-format={format} data-reveal={compact ? undefined : true} style={{ "--i": index } as CSSProperties}>
        <span className="eg-session-icon"><Icon name={format} /></span>
        <div className="eg-session-body">
          <h3>{name}</h3>
          {summary && !compact ? <p>{summary}</p> : null}
          <p className="eg-session-facts">
            {minutes ? <span><span className="eg-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</span> : null}
            {price ? <span className="eg-session-price" data-free={item.price === 0 || undefined}><span className="eg-sr">{chrome.t("price")} </span>{price}</span> : null}
          </p>
        </div>
        {href ? <a className="eg-session-book" href={href} aria-label={`${chrome.t("bookThis")}: ${name}`} data-qa="ergata-session-book">
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
    <span className="eg-notice-icon"><Icon name="lifebuoy" /></span>
    <div className="eg-notice-copy">
      <h2 id={compact ? "eg-notice-title-compact" : "eg-notice-title"}>{title}</h2>
      {localized(notice.body, locale) ? <p>{localized(notice.body, locale)}</p> : null}
    </div>
    {lines.length ? <ul className="eg-notice-lines">
      {lines.map((item, index) => {
        const label = localized(item.label, locale);
        const phone = String(item.phone).trim();
        return <li key={index}><a href={telHref(phone)} aria-label={chrome.t("callNumber", { label, number: phone })} data-qa="ergata-notice-call">
          <strong>{phone}</strong><span>{label}</span>
        </a></li>;
      })}
    </ul> : null}
  </aside>;
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
  const heroImage = sectionImage(hero, locale, design, "hero.primary");
  const aboutImage = sectionImage(about, locale, design, "section.detail");
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
  const highlights = records(about.highlights).map((item) => localized(item, locale)).filter(Boolean);
  const lead = team[0];
  const leadPhoto = lead ? contentImage(lead, locale) : null;
  const firstPlace = places[0];
  const placeImage = firstPlace ? contentImage(firstPlace, locale) : null;
  const directions = firstPlace ? action(firstPlace.directionsAction, locale) : null;
  const phone = typeof contact.phone === "string" ? contact.phone : typeof firstPlace?.phone === "string" ? firstPlace.phone : "";
  const email = typeof contact.email === "string" ? contact.email : "";
  const contactAction = action(contact.action, locale);
  const footerLinks = records(footer.items).flatMap((item) => {
    const link = action(item.action, locale);
    return link && !link.href.endsWith("/book") && !link.href.endsWith("#contact") ? [link] : [];
  });
  const hasVisit = Boolean(firstPlace || phone || email);

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
            {localized(hero.body, locale) ? <p className="eg-reassure"><Icon name="lock" />{localized(hero.body, locale)}</p> : null}
          </div>
          {heroImage ? <figure className="eg-hero-art">
            <div className="eg-arch"><img src={heroImage.src} alt={heroImage.alt} width={1040} height={1300} /></div>
            {lead && localized(lead.name, locale) ? <figcaption className="eg-hero-card">
              {leadPhoto ? <img src={leadPhoto.src} alt="" width={64} height={64} /> : <span className="eg-initial" aria-hidden="true">{localized(lead.name, locale).slice(0, 1)}</span>}
              <span><strong>{localized(lead.name, locale)}</strong>{localized(lead.role, locale) ? <span>{localized(lead.role, locale)}</span> : null}</span>
            </figcaption> : null}
          </figure> : null}
        </div>
      </section>

      {needs.length ? <section className="eg-section eg-needs" id="help" aria-labelledby="eg-needs-title">
        <div className="eg-wrap eg-split">
          <header className="eg-head" data-reveal>
            <h2 id="eg-needs-title">{localized(benefits.title, locale)}</h2>
            {localized(benefits.intro, locale) ? <p>{localized(benefits.intro, locale)}</p> : null}
          </header>
          <ul className="eg-needs-list">
            {needs.map((item, index) => <li key={index} data-reveal style={{ "--i": index % 4 } as CSSProperties}>
              <span className="eg-needs-icon"><Icon name={iconName(item.icon, "leaf") as ErgataIconName} /></span>
              <div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div>
            </li>)}
          </ul>
        </div>
      </section> : null}

      {ways.length ? <section className="eg-section eg-approach" id="approach" aria-labelledby="eg-approach-title">
        <div className="eg-wrap">
          <header className="eg-head eg-head-wide" data-reveal>
            <h2 id="eg-approach-title">{localized(approaches.title, locale)}</h2>
            {localized(approaches.intro, locale) ? <p>{localized(approaches.intro, locale)}</p> : null}
          </header>
          <dl className="eg-ways">
            {ways.map((item, index) => <div key={index} data-reveal style={{ "--i": index } as CSSProperties}>
              <dt>{localized(item.title, locale)}</dt>
              <dd>{localized(item.description, locale)}</dd>
            </div>)}
          </dl>
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="eg-section eg-about" id="about" aria-labelledby="eg-about-title">
        <div className="eg-wrap eg-about-grid">
          {aboutImage ? <figure className="eg-about-art" data-reveal><img src={aboutImage.src} alt={aboutImage.alt} loading="lazy" width={1440} height={960} /></figure> : null}
          <div className="eg-about-copy" data-reveal>
            <h2 id="eg-about-title">{localized(about.title, locale)}</h2>
            {localized(about.body, locale).split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {highlights.length ? <ul className="eg-chips">{highlights.map((item, index) => <li key={index}>{item}</li>)}</ul> : null}
          </div>
        </div>
      </section> : null}

      {steps.length ? <section className="eg-section eg-steps" aria-labelledby="eg-steps-title">
        <div className="eg-wrap">
          <header className="eg-head eg-head-wide" data-reveal>
            <h2 id="eg-steps-title">{localized(process.title, locale)}</h2>
            {localized(process.intro, locale) ? <p>{localized(process.intro, locale)}</p> : null}
          </header>
          <ol className="eg-step-list" style={{ "--eg-steps": Math.min(steps.length, 4) } as CSSProperties}>
            {steps.map((item, index) => {
              const number = String(item.step || index + 1);
              return <li key={index} data-reveal style={{ "--i": index } as CSSProperties}>
                <span className="eg-step-dot" aria-hidden="true">{number}</span>
                <h3><span className="eg-sr">{chrome.t("step", { count: number })} </span>{localized(item.title, locale)}</h3>
                <p>{localized(item.description, locale)}</p>
              </li>;
            })}
          </ol>
        </div>
      </section> : null}

      {sessions.length ? <section className="eg-section eg-sessions-section" id="sessions" aria-labelledby="eg-sessions-title">
        <div className="eg-wrap">
          <header className="eg-head eg-head-wide" data-reveal>
            <h2 id="eg-sessions-title">{localized(services.title, locale)}</h2>
            {localized(services.intro, locale) ? <p>{localized(services.intro, locale)}</p> : null}
          </header>
          <Sessions items={sessions} locale={locale} chrome={chrome} bookHref={bookHref} />
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
                return <li key={String(item.id || index)} className="eg-person" data-reveal style={{ "--i": index } as CSSProperties}>
                  {photo ? <img className="eg-portrait" src={photo.src} alt={photo.alt || name} loading="lazy" width={768} height={768} /> : <span className="eg-portrait eg-initial" aria-hidden="true">{name.slice(0, 1)}</span>}
                  <div>
                    <h3>{name}</h3>
                    {localized(item.role, locale) ? <p className="eg-role">{localized(item.role, locale)}</p> : null}
                    {specialties.length ? <ul className="eg-chips">{specialties.map((entry, key) => <li key={key}>{entry}</li>)}</ul> : null}
                    {notes.length ? <ul className="eg-ticks">{notes.map((entry, key) => <li key={key}><Icon name="check" />{entry}</li>)}</ul> : null}
                  </div>
                </li>;
              })}
            </ul>
            {credentials.length ? <aside className="eg-credentials" aria-labelledby="eg-credentials-title" data-reveal>
              <h3 id="eg-credentials-title">{localized(proof.title, locale)}</h3>
              {localized(proof.intro, locale) ? <p className="eg-credentials-intro">{localized(proof.intro, locale)}</p> : null}
              <dl>{credentials.map((item, index) => <div key={index}>
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
          <header className="eg-head" data-reveal>
            <h2 id="eg-faq-title">{localized(faq.title, locale)}</h2>
            {hasVisit && localized(contact.title, locale) ? <a className="eg-soft-link eg-faq-ask" href="#contact">
              <Icon name="intro" /><span>{localized(contact.title, locale)}</span><Icon name="arrow" className="eg-icon eg-icon-arrow" />
            </a> : null}
          </header>
          <div className="eg-faq-list">{questions.map((item, index) => <details key={index} data-qa="ergata-faq-item">
            <summary><span>{localized(item.question, locale)}</span><Icon name="plus" className="eg-icon eg-faq-icon" /></summary>
            <p>{localized(item.answer, locale)}</p>
          </details>)}</div>
        </div>
      </section> : null}

      {localized(notice.title, locale) ? <section className="eg-section eg-notice-section" aria-label={localized(notice.title, locale)}>
        <div className="eg-wrap"><SafetyNotice notice={notice} locale={locale} chrome={chrome} /></div>
      </section> : null}

      {hasVisit ? <section className="eg-section eg-visit" id="contact" aria-labelledby="eg-visit-title">
        <div className="eg-wrap eg-visit-grid">
          <div className="eg-visit-card" data-reveal>
            <h2 id="eg-visit-title">{localized(locations.title, locale) || localized(contact.title, locale)}</h2>
            {localized(locations.intro, locale) ? <p className="eg-visit-intro">{localized(locations.intro, locale)}</p> : null}
            <dl className="eg-visit-facts">
              {firstPlace ? <div><dt><Icon name="pin" /><span>{chrome.t("address")}</span></dt><dd>
                {localized(firstPlace.name, locale) ? <strong>{localized(firstPlace.name, locale)}</strong> : null}
                <span>{localized(firstPlace.address, locale)}</span>
                {directions ? <a href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}
              </dd></div> : null}
              {firstPlace && localized(firstPlace.hours, locale) ? <div><dt><Icon name="clock" /><span>{chrome.t("hours")}</span></dt><dd>{localized(firstPlace.hours, locale)}</dd></div> : null}
              {phone ? <div><dt><Icon name="phone" /><span>{chrome.t("phone")}</span></dt><dd><a href={telHref(phone)}>{phone}</a></dd></div> : null}
              {email ? <div><dt><Icon name="mail" /><span>{chrome.t("email")}</span></dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div> : null}
            </dl>
            {places.length > 1 ? <ul className="eg-chips">{places.slice(1).map((item, index) => <li key={index}>{localized(item.name, locale)}</li>)}</ul> : null}
            {localized(contact.body, locale) ? <p className="eg-visit-note">{localized(contact.body, locale)}</p> : null}
            {contactAction && !contactAction.href.endsWith("/book") ? <a className="eg-soft-link" href={contactAction.href}><Icon name="phone" /><span>{contactAction.label}</span><Icon name="arrow" className="eg-icon eg-icon-arrow" /></a> : null}
          </div>
          {placeImage ? <figure className="eg-visit-art" data-reveal><img src={placeImage.src} alt={placeImage.alt} loading="lazy" width={1440} height={960} /></figure> : null}
        </div>
      </section> : null}

      {bookHref && bookLabel ? <section className="eg-band" aria-labelledby="eg-band-title">
        <div className="eg-wrap">
          <div className="eg-band-inner" data-reveal>
            <span className="eg-band-arch" aria-hidden="true" />
            <div>
              <h2 id="eg-band-title">{localized(booking.title, locale)}</h2>
              {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
            </div>
            <a className="eg-btn eg-btn-inverse eg-btn-lg" href={bookingAction?.href || bookHref} data-qa="ergata-band-book">{bookLabel}</a>
          </div>
        </div>
      </section> : null}
    </main>

    <footer className="eg-footer">
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
        <span className="eg-handoff-arch" aria-hidden="true" />
        <h1>{localized(booking.title, locale)}</h1>
        {localized(booking.body, locale) ? <p className="eg-lede">{localized(booking.body, locale)}</p> : null}
        {bookingPath && label ? <a className="eg-btn eg-btn-lg" href={bookingPath} data-qa="ergata-handoff-book">{label}</a> : null}
        {localized(hero.body, locale) ? <p className="eg-reassure"><Icon name="lock" />{localized(hero.body, locale)}</p> : null}
        <SafetyNotice notice={notice} locale={locale} chrome={chrome} compact />
      </div>
      {sessions.length ? <section className="eg-handoff-sessions" aria-labelledby="eg-handoff-sessions-title">
        <h2 id="eg-handoff-sessions-title">{localized(services.title, locale)}</h2>
        <Sessions items={sessions} locale={locale} chrome={chrome} compact />
      </section> : null}
    </main>
  </div>;
}
