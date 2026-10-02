import { useRef, type CSSProperties } from "react";

import type { BookingTemplateProps, TemplateProps } from "../types";
import type { ContentRecord } from "../content";
import { action, brandLogo, contentImage, designImage, durationMinutes, formatPrice, localized, records, section, sectionImage } from "../content";
import { usePublicChrome, type PublicChrome } from "../chrome";
import { useReveal, useScrollState } from "../motion";
import "./tena.css";

/*
 * Tena Clinic v2: a wayfinding page for a clinic that books by appointment.
 * The services board is the one bold element; everything else stays quiet.
 * Signal yellow marks "when and where" facts only (durations, steps, open answers).
 */

interface BoardProps {
  items: ContentRecord[];
  locale: string;
  chrome: PublicChrome;
  linkRows: boolean;
}

function ServiceBoard({ items, locale, chrome, linkRows }: BoardProps) {
  return <ol className="tc-board-rows" data-reveal>
    {items.map((item, index) => {
      const minutes = durationMinutes(item.durationMinutes);
      const price = formatPrice(item.price, item.currency, locale);
      const choose = linkRows ? action(item.action, locale) : null;
      const name = localized(item.name, locale);
      return <li key={String(item.id || index)} className="tc-board-row" style={{ "--i": index } as CSSProperties}>
        <div className="tc-board-name">
          <h3>{choose ? <a href={choose.href}>{name}</a> : name}</h3>
          {localized(item.summary, locale) ? <p>{localized(item.summary, locale)}</p> : null}
        </div>
        {minutes ? <span className="tc-plate"><span className="tc-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</span> : <span />}
        {price ? <span className="tc-price"><span className="tc-sr">{chrome.t("price")} </span>{price}</span> : <span />}
      </li>;
    })}
  </ol>;
}

function Arrival({ location, locale, chrome, phone, email }: { location: ContentRecord; locale: string; chrome: PublicChrome; phone?: string; email?: string }) {
  const directions = action(location.directionsAction, locale);
  const telephone = phone || (typeof location.phone === "string" ? location.phone : "");
  return <dl className="tc-fields">
    <div><dt>{chrome.t("address")}</dt><dd>{localized(location.name, locale) ? <strong>{localized(location.name, locale)}</strong> : null}<span>{localized(location.address, locale)}</span>{directions ? <a href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}</dd></div>
    {localized(location.hours, locale) ? <div><dt>{chrome.t("hours")}</dt><dd>{localized(location.hours, locale)}</dd></div> : null}
    {telephone ? <div><dt>{chrome.t("phone")}</dt><dd><a href={`tel:${telephone.replace(/\s+/g, "")}`}>{telephone}</a></dd></div> : null}
    {email ? <div><dt>{chrome.t("email")}</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div> : null}
  </dl>;
}

function Brand({ logo, name, href }: { logo?: string; name: string; href: string }) {
  return <a className="tc-brand" href={href}>{logo ? <img src={logo} alt="" /> : null}<span>{name}</span></a>;
}

export function TenaSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const root = useRef<HTMLDivElement>(null);
  const scroll = useScrollState();
  useReveal(root, locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const about = section(snapshot.sections, "about");
  const benefits = section(snapshot.sections, "benefits");
  const proof = section(snapshot.sections, "proof");
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
  // One label per intent: every booking entry point uses the hero's words.
  const bookLabel = primary?.label || bookingAction?.label || "";
  const bookHref = primary?.href || bookingAction?.href;
  const heroImage = designImage(design, "hero.primary");
  const aboutImage = sectionImage(about, locale, design);
  const logo = brandLogo(design);
  const serviceItems = records(services.items);
  const facts = records(proof.items);
  const notes = records(benefits.items);
  const team = records(providers.items);
  const steps = records(process.items);
  const review = records(testimonials.items)[0];
  const questions = records(faq.items);
  const places = records(locations.items);
  const firstPlace = places[0];
  const placeImage = firstPlace ? contentImage(firstPlace, locale) : null;
  const phone = typeof contact.phone === "string" ? contact.phone : undefined;
  const email = typeof contact.email === "string" ? contact.email : undefined;
  // Booking and contact already have their own entries; the footer lists anything else the owner added.
  const footerLinks = records(footer.items).flatMap((item) => {
    const link = action(item.action, locale);
    return link && !link.href.endsWith("/book") && !link.href.endsWith("#contact") ? [link] : [];
  });

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} className="tc" data-template="tena-clinic-v2" style={rootStyle}>
    <a className="tc-skip" href="#tc-main">{chrome.t("skip")}</a>
    <header className="tc-bar" data-scrolled={scroll.scrolled}>
      <div className="tc-wrap tc-bar-inner">
        <Brand logo={logo} name={applicationName} href={publicRoot} />
        <nav aria-label={chrome.t("navLabel")} className="tc-nav">
          {serviceItems.length ? <a href="#services">{chrome.t("services")}</a> : null}
          {team.length ? <a href="#team">{chrome.t("team")}</a> : null}
          {firstPlace ? <a href="#contact">{chrome.t("visit")}</a> : null}
          {questions.length ? <a href="#faq">{chrome.t("questions")}</a> : null}
        </nav>
        <button type="button" className="tc-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}>{chrome.modeName(mode)}</button>
        {bookHref && bookLabel ? <a className="tc-btn tc-bar-book" href={bookHref}>{bookLabel}</a> : null}
      </div>
    </header>

    <main id="tc-main">
      <section className="tc-hero">
        <div className="tc-wrap tc-hero-grid">
          <div className="tc-hero-copy">
            {localized(hero.eyebrow, locale) ? <p className="tc-kicker">{localized(hero.eyebrow, locale)}</p> : null}
            <h1>{localized(hero.title, locale)}</h1>
            {localized(hero.subtitle || hero.body, locale) ? <p className="tc-lede">{localized(hero.subtitle || hero.body, locale)}</p> : null}
            <div className="tc-actions">
              {bookHref && bookLabel ? <a className="tc-btn" href={bookHref}>{bookLabel}</a> : null}
              {secondary ? <a className="tc-link" href={secondary.href}>{secondary.label}</a> : null}
            </div>
          </div>
          {heroImage ? <figure className="tc-hero-photo"><img src={heroImage.src} alt={heroImage.alt} /></figure> : null}
        </div>
      </section>

      {serviceItems.length ? <section className="tc-section tc-services" id="services" aria-labelledby="tc-services-title">
        <div className="tc-wrap">
          <header className="tc-head" data-reveal>
            <h2 id="tc-services-title">{localized(services.title, locale)}</h2>
            {localized(services.intro, locale) ? <p>{localized(services.intro, locale)}</p> : null}
          </header>
          <div className="tc-board">
            <ServiceBoard items={serviceItems} locale={locale} chrome={chrome} linkRows />
            {facts.length ? <dl className="tc-facts">{facts.map((item, index) => <div key={index}><dt>{localized(item.label, locale)}</dt><dd>{localized(item.value, locale)}</dd></div>)}</dl> : null}
          </div>
        </div>
      </section> : null}

      {localized(about.body, locale) || notes.length ? <section className="tc-section tc-about">
        <div className="tc-wrap tc-about-grid">
          {aboutImage ? <figure className="tc-about-photo" data-reveal><img src={aboutImage.src} alt={aboutImage.alt} /></figure> : null}
          <div className="tc-about-copy">
            <h2>{localized(about.title, locale) || localized(benefits.title, locale)}</h2>
            {localized(about.body, locale) ? <p>{localized(about.body, locale)}</p> : null}
            {notes.length ? <ul className="tc-notes" aria-label={localized(benefits.title, locale) || undefined}>{notes.map((item, index) => <li key={index}><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></li>)}</ul> : null}
          </div>
        </div>
      </section> : null}

      {team.length ? <section className="tc-section tc-team" id="team" aria-labelledby="tc-team-title">
        <div className="tc-wrap">
          <header className="tc-head" data-reveal>
            <h2 id="tc-team-title">{localized(providers.title, locale)}</h2>
            {localized(providers.intro, locale) ? <p>{localized(providers.intro, locale)}</p> : null}
          </header>
          <ul className="tc-directory">{team.map((item, index) => {
            const photo = contentImage(item, locale);
            const name = localized(item.name, locale);
            const specialties = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
            return <li key={String(item.id || index)} data-reveal style={{ "--i": index } as CSSProperties}>
              {photo ? <img src={photo.src} alt={photo.alt || name} /> : <span className="tc-initial" aria-hidden="true">{name.slice(0, 1)}</span>}
              <div><h3>{name}</h3>{localized(item.role, locale) ? <p className="tc-role">{localized(item.role, locale)}</p> : null}{specialties.length ? <p>{specialties.join(", ")}</p> : null}</div>
            </li>;
          })}</ul>
        </div>
      </section> : null}

      {steps.length ? <section className="tc-section tc-steps" aria-labelledby="tc-steps-title">
        <div className="tc-wrap">
          <header className="tc-head" data-reveal>
            <h2 id="tc-steps-title">{localized(process.title, locale)}</h2>
            {localized(process.intro, locale) ? <p>{localized(process.intro, locale)}</p> : null}
          </header>
          <ol className="tc-step-list">{steps.map((item, index) => <li key={index} data-reveal style={{ "--i": index } as CSSProperties}>
            <span className="tc-plate" aria-hidden="true">{String(item.step || index + 1)}</span>
            <h3><span className="tc-sr">{chrome.t("step", { count: String(item.step || index + 1) })} </span>{localized(item.title, locale)}</h3>
            <p>{localized(item.description, locale)}</p>
          </li>)}</ol>
        </div>
      </section> : null}

      {review ? <section className="tc-section tc-review" aria-labelledby="tc-review-title">
        <div className="tc-wrap">
          <h2 id="tc-review-title" className="tc-sr">{localized(testimonials.title, locale)}</h2>
          <figure data-reveal>
            <blockquote><p>{localized(review.quote, locale)}</p></blockquote>
            <figcaption><strong>{localized(review.attribution, locale)}</strong>{localized(review.role, locale) ? <span>{localized(review.role, locale)}</span> : null}{localized(testimonials.intro, locale) ? <span>{localized(testimonials.intro, locale)}</span> : null}</figcaption>
          </figure>
        </div>
      </section> : null}

      {questions.length ? <section className="tc-section tc-faq" id="faq" aria-labelledby="tc-faq-title">
        <div className="tc-wrap tc-faq-grid">
          <h2 id="tc-faq-title">{localized(faq.title, locale)}</h2>
          <div className="tc-faq-list">{questions.map((item, index) => <details key={index}>
            <summary>{localized(item.question, locale)}</summary>
            <p>{localized(item.answer, locale)}</p>
          </details>)}</div>
        </div>
      </section> : null}

      {firstPlace ? <section className="tc-section tc-visit" id="contact" aria-labelledby="tc-visit-title">
        <div className="tc-wrap tc-visit-grid">
          <div className="tc-card">
            <h2 id="tc-visit-title">{localized(locations.title, locale)}</h2>
            {localized(locations.intro, locale) ? <p>{localized(locations.intro, locale)}</p> : null}
            <Arrival location={firstPlace} locale={locale} chrome={chrome} phone={phone} email={email} />
            {places.length > 1 ? <ul className="tc-rooms">{places.slice(1).map((item, index) => <li key={index}>{localized(item.name, locale)}</li>)}</ul> : null}
          </div>
          {placeImage ? <figure className="tc-visit-photo" data-reveal><img src={placeImage.src} alt={placeImage.alt} /></figure> : null}
        </div>
      </section> : null}

      {bookHref && bookLabel ? <section className="tc-band" aria-labelledby="tc-band-title">
        <div className="tc-wrap tc-band-inner">
          <div>
            <h2 id="tc-band-title">{localized(booking.title, locale)}</h2>
            {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
          </div>
          <a className="tc-btn tc-btn-inverse" href={bookingAction?.href || bookHref}>{bookLabel}</a>
        </div>
      </section> : null}
    </main>

    <footer className="tc-footer">
      <div className="tc-wrap tc-footer-grid">
        <div>
          <Brand logo={logo} name={applicationName} href={publicRoot} />
          {localized(footer.body, locale) ? <p>{localized(footer.body, locale)}</p> : null}
        </div>
        <nav aria-label={chrome.t("navLabel")}>
          {serviceItems.length ? <a href="#services">{chrome.t("services")}</a> : null}
          {firstPlace ? <a href="#contact">{chrome.t("visit")}</a> : null}
          {questions.length ? <a href="#faq">{chrome.t("questions")}</a> : null}
          {footerLinks.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <small>© {new Date().getFullYear()} {applicationName}</small>
      </div>
    </footer>
  </div>;
}

export function TenaBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const locations = section(snapshot.sections, "locations");
  const contact = section(snapshot.sections, "contact");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const firstPlace = records(locations.items)[0];
  const logo = brandLogo(design);
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, locale);
  return <div ref={root} data-motion={design.motion} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="tc tc-handoff" data-template="tena-clinic-v2" style={rootStyle}>
    <header className="tc-bar">
      <div className="tc-wrap tc-bar-inner">
        <Brand logo={logo} name={applicationName} href={publicRoot} />
        <a className="tc-link tc-back" href={publicRoot}>{chrome.t("backToSite")}</a>
        <button type="button" className="tc-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}>{chrome.modeName(mode)}</button>
      </div>
    </header>
    <main className="tc-wrap tc-handoff-grid">
      <div className="tc-handoff-copy">
        <h1>{localized(booking.title, locale)}</h1>
        {localized(booking.body, locale) ? <p className="tc-lede">{localized(booking.body, locale)}</p> : null}
        {bookingPath && label ? <a className="tc-btn" href={bookingPath}>{label}</a> : null}
        {firstPlace ? <div className="tc-card tc-handoff-arrival"><Arrival location={firstPlace} locale={locale} chrome={chrome} phone={typeof contact.phone === "string" ? contact.phone : undefined} /></div> : null}
      </div>
      {records(services.items).length ? <div className="tc-board" aria-label={localized(services.title, locale) || undefined}>
        <ServiceBoard items={records(services.items)} locale={locale} chrome={chrome} linkRows={false} />
      </div> : null}
    </main>
  </div>;
}
