import { useRef, type CSSProperties, type ReactNode } from "react";

import type { BookingTemplateProps, TemplateProps } from "../types";
import type { ContentRecord } from "../content";
import { action, brandLogo, contentImage, designImage, durationMinutes, formatPrice, localized, records, section, sectionImage } from "../content";
import { usePublicChrome, type PublicChrome } from "../chrome";
import { useReveal, useScrollState } from "../motion";
import "./selam.css";

/*
 * Selam Movement v2: a movement magazine opening spread. A very large headline,
 * then a full-bleed panoramic studio strip. Durations are set as tempo numerals.
 * Radius system: controls pill, images 0, panels 16px. Lime fills the review band only.
 */

function Sessions({ items, locale, chrome, compact }: { items: ContentRecord[]; locale: string; chrome: PublicChrome; compact?: boolean }) {
  // The pace bar shows each session's true length against the longest one.
  const longest = Math.max(1, ...items.map((item) => durationMinutes(item.durationMinutes) || 0));
  return <div className={compact ? "sm-sessions sm-sessions-compact" : "sm-sessions"}>
    {items.map((item, index) => {
      const minutes = durationMinutes(item.durationMinutes);
      const price = formatPrice(item.price, item.currency, locale);
      const choose = compact ? null : action(item.action, locale);
      const photo = compact ? null : contentImage(item, locale);
      const name = localized(item.name, locale);
      return <article key={String(item.id || index)} className="sm-session" data-reveal style={{ "--i": index, "--sm-pace": minutes ? minutes / longest : 0 } as CSSProperties}>
        {minutes ? <p className="sm-tempo"><span className="sm-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</p> : null}
        {minutes ? <span className="sm-pace" aria-hidden="true" /> : null}
        <h3>{choose ? <a href={choose.href}>{name}</a> : name}</h3>
        {!compact && localized(item.summary, locale) ? <p className="sm-muted">{localized(item.summary, locale)}</p> : null}
        {price ? <p className="sm-price"><span className="sm-sr">{chrome.t("price")} </span>{price}</p> : null}
        {photo ? <img src={photo.src} alt={photo.alt} /> : null}
      </article>;
    })}
  </div>;
}

function Bar({ logo, name, root, chrome, mode, toggleMode, children }: { logo?: string; name: string; root: string; chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; children?: ReactNode }) {
  const scroll = useScrollState(120);
  return <header className="sm-bar" data-scrolled={scroll.scrolled} data-direction={scroll.direction}>
    <div className="sm-wrap sm-bar-inner">
      <a className="sm-brand" href={root}>{logo ? <img src={logo} alt="" /> : null}<span>{name}</span></a>
      {children}
      <button type="button" className="sm-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}>{chrome.modeName(mode)}</button>
    </div>
  </header>;
}

export function SelamSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const about = section(snapshot.sections, "about");
  const benefits = section(snapshot.sections, "benefits");
  const providers = section(snapshot.sections, "providers");
  const process = section(snapshot.sections, "process");
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
  const heroImage = designImage(design, "hero.primary");
  const logo = brandLogo(design);
  const sessions = records(services.items);
  const notes = records(benefits.items);
  const coaches = records(providers.items);
  const steps = records(process.items);
  const review = records(testimonials.items)[0];
  const questions = records(faq.items);
  const place = records(locations.items)[0];
  const placeImage = place ? sectionImage(place, locale, design) : null;
  const directions = place ? action(place.directionsAction, locale) : null;
  const phone = typeof contact.phone === "string" ? contact.phone : (typeof place?.phone === "string" ? place.phone : "");
  const email = typeof contact.email === "string" ? contact.email : "";

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} className="sm" data-template="selam-movement-v2" style={rootStyle}>
    <a className="sm-skip" href="#sm-main">{chrome.t("skip")}</a>
    <Bar logo={logo} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode}>
      <nav aria-label={chrome.t("navLabel")} className="sm-nav">
        {sessions.length ? <a href="#services">{chrome.t("services")}</a> : null}
        {coaches.length ? <a href="#team">{chrome.t("team")}</a> : null}
        {place ? <a href="#contact">{chrome.t("visit")}</a> : null}
      </nav>
      {bookHref && bookLabel ? <a className="sm-pill sm-bar-book" href={bookHref}>{bookLabel}</a> : null}
    </Bar>

    <main id="sm-main">
      <section className="sm-hero">
        <div className="sm-wrap sm-hero-copy">
          <h1>{localized(hero.title, locale)}</h1>
          <div className="sm-hero-row">
            {localized(hero.subtitle || hero.body, locale) ? <p className="sm-lede">{localized(hero.subtitle || hero.body, locale)}</p> : null}
            <div className="sm-actions">
              {bookHref && bookLabel ? <a className="sm-pill" href={bookHref}>{bookLabel}</a> : null}
              {secondary ? <a className="sm-link" href={secondary.href}>{secondary.label}</a> : null}
            </div>
          </div>
        </div>
        {heroImage ? <figure className="sm-strip"><img src={heroImage.src} alt={heroImage.alt} /></figure> : null}
      </section>

      {sessions.length ? <section className="sm-section" id="services" aria-labelledby="sm-services-title">
        <div className="sm-wrap">
          <header className="sm-head" data-reveal><h2 id="sm-services-title">{localized(services.title, locale)}</h2>{localized(services.intro, locale) ? <p className="sm-muted">{localized(services.intro, locale)}</p> : null}</header>
          <Sessions items={sessions} locale={locale} chrome={chrome} />
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="sm-section sm-story" aria-labelledby="sm-story-title">
        <div className="sm-wrap sm-prose" data-reveal>
          <h2 id="sm-story-title">{localized(about.title, locale)}</h2>
          <p>{localized(about.body, locale)}</p>
          {notes.length ? <dl className="sm-notes">{notes.map((item, index) => <div key={index}><dt>{localized(item.title, locale)}</dt><dd>{localized(item.description, locale)}</dd></div>)}</dl> : null}
        </div>
      </section> : null}

      {coaches.length ? <section className="sm-section" id="team" aria-labelledby="sm-team-title">
        <div className="sm-wrap">
          <h2 id="sm-team-title" className="sm-team-title" data-reveal>{localized(providers.title, locale)}</h2>
          {coaches.map((item, index) => {
            const photo = contentImage(item, locale);
            const name = localized(item.name, locale);
            const specialties = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
            return <article key={String(item.id || index)} className="sm-coach" data-reveal>
              {photo ? <img src={photo.src} alt={photo.alt || name} /> : null}
              <div>
                {localized(item.role, locale) ? <p className="sm-role">{localized(item.role, locale)}</p> : null}
                <h3>{name}</h3>
                {localized(providers.intro, locale) && coaches.length === 1 ? <p className="sm-muted">{localized(providers.intro, locale)}</p> : null}
                {specialties.length ? <ul className="sm-tags">{specialties.map((entry) => <li key={entry}>{entry}</li>)}</ul> : null}
              </div>
            </article>;
          })}
        </div>
      </section> : null}

      {steps.length ? <section className="sm-section" aria-labelledby="sm-steps-title">
        <div className="sm-wrap sm-ledger-grid">
          <header className="sm-head" data-reveal><h2 id="sm-steps-title">{localized(process.title, locale)}</h2>{localized(process.intro, locale) ? <p className="sm-muted">{localized(process.intro, locale)}</p> : null}</header>
          <ol className="sm-ledger">{steps.map((item, index) => <li key={index} data-reveal style={{ "--i": index } as CSSProperties}>
            <span className="sm-step" aria-hidden="true">{String(item.step || index + 1)}</span>
            <div><h3><span className="sm-sr">{chrome.t("step", { count: String(item.step || index + 1) })} </span>{localized(item.title, locale)}</h3><p className="sm-muted">{localized(item.description, locale)}</p></div>
          </li>)}</ol>
        </div>
      </section> : null}

      {review ? <section className="sm-review" aria-labelledby="sm-review-title" data-reveal>
        <div className="sm-wrap">
          <h2 id="sm-review-title" className="sm-sr">{localized(testimonials.title, locale)}</h2>
          <figure>
            <blockquote><p>{localized(review.quote, locale)}</p></blockquote>
            <figcaption><strong>{localized(review.attribution, locale)}</strong>{localized(review.role, locale) ? <span>{localized(review.role, locale)}</span> : null}{localized(testimonials.intro, locale) ? <span>{localized(testimonials.intro, locale)}</span> : null}</figcaption>
          </figure>
        </div>
      </section> : null}

      {questions.length ? <section className="sm-section" id="faq" aria-labelledby="sm-faq-title">
        <div className="sm-wrap sm-narrow" data-reveal>
          <h2 id="sm-faq-title">{localized(faq.title, locale)}</h2>
          <div className="sm-faq">{questions.map((item, index) => <details key={index}><summary>{localized(item.question, locale)}</summary><p className="sm-muted">{localized(item.answer, locale)}</p></details>)}</div>
        </div>
      </section> : null}

      {place ? <section className="sm-visit" id="contact" aria-labelledby="sm-visit-title">
        <div className="sm-visit-text" data-reveal>
          <h2 id="sm-visit-title">{localized(locations.title, locale)}</h2>
          <p className="sm-address">{localized(place.address, locale)}</p>
          {localized(place.hours, locale) ? <p className="sm-muted">{localized(place.hours, locale)}</p> : null}
          <p className="sm-contacts">
            {phone ? <a href={`tel:${phone.replace(/\s+/g, "")}`}><span className="sm-sr">{chrome.t("phone")} </span>{phone}</a> : null}
            {email ? <a href={`mailto:${email}`}><span className="sm-sr">{chrome.t("email")} </span>{email}</a> : null}
            {directions ? <a href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}
          </p>
        </div>
        {placeImage ? <figure className="sm-visit-photo" data-reveal><img src={placeImage.src} alt={placeImage.alt} /></figure> : null}
      </section> : null}

      {bookHref && bookLabel ? <section className="sm-section sm-final" aria-labelledby="sm-final-title">
        <div className="sm-wrap sm-final-inner" data-reveal>
          <h2 id="sm-final-title">{localized(booking.title, locale)}</h2>
          {localized(booking.body, locale) ? <p className="sm-muted">{localized(booking.body, locale)}</p> : null}
          <a className="sm-pill" href={bookingAction?.href || bookHref}>{bookLabel}</a>
        </div>
      </section> : null}
    </main>

    <footer className="sm-footer">
      <div className="sm-wrap sm-footer-inner">
        <p className="sm-footer-name">{applicationName}</p>
        {localized(footer.body, locale) ? <p className="sm-muted">{localized(footer.body, locale)}</p> : null}
        <small>© {new Date().getFullYear()} {applicationName}</small>
      </div>
    </footer>
  </div>;
}

export function SelamBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const image = designImage(design, "hero.primary");
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, locale);
  return <div ref={root} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} className="sm sm-handoff" data-template="selam-movement-v2" style={rootStyle}>
    <Bar logo={brandLogo(design)} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode}>
      <a className="sm-link sm-back" href={publicRoot}>{chrome.t("backToSite")}</a>
    </Bar>
    <main className="sm-hero">
      <div className="sm-wrap sm-hero-copy">
        <h1>{localized(booking.title, locale)}</h1>
        <div className="sm-hero-row">
          {localized(booking.body, locale) ? <p className="sm-lede">{localized(booking.body, locale)}</p> : null}
          {bookingPath && label ? <div className="sm-actions"><a className="sm-pill" href={bookingPath}>{label}</a></div> : null}
        </div>
        {records(services.items).length ? <Sessions items={records(services.items)} locale={locale} chrome={chrome} compact /> : null}
      </div>
      {image ? <figure className="sm-strip"><img src={image.src} alt={image.alt} /></figure> : null}
    </main>
  </div>;
}
