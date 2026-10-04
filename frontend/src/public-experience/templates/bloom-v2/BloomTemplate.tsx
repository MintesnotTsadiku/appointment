import { useRef, type CSSProperties, type ReactNode } from "react";

import type { BookingTemplateProps, TemplateProps } from "../types";
import type { ContentRecord } from "../content";
import { action, brandLogo, contentImage, designImage, durationMinutes, formatPrice, localized, records, section, sectionImage } from "../content";
import { usePublicChrome, type PublicChrome } from "../chrome";
import { useReveal, useScrollState } from "../motion";
import "./bloom.css";

/*
 * Bloom Hair v2: a salon campaign poster. The hero photo fills the first view with
 * the headline on a solid aubergine panel; services read like the price board.
 * Radius system: 4px everywhere. Marigold fills booking actions and nothing else.
 */

function PriceBoard({ items, locale, chrome, linkRows }: { items: ContentRecord[]; locale: string; chrome: PublicChrome; linkRows: boolean }) {
  return <ul className="bl-prices">
    {items.map((item, index) => {
      const minutes = durationMinutes(item.durationMinutes);
      const price = formatPrice(item.price, item.currency, locale);
      const choose = linkRows ? action(item.action, locale) : null;
      const name = localized(item.name, locale);
      return <li key={String(item.id || index)} data-reveal style={{ "--i": index } as CSSProperties}>
        <div className="bl-price-name">
          <h3>{choose ? <a href={choose.href}>{name}</a> : name}</h3>
          {minutes ? <p><span className="bl-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</p> : null}
          {linkRows && localized(item.summary, locale) ? <p className="bl-muted">{localized(item.summary, locale)}</p> : null}
        </div>
        {price ? <p className="bl-price"><span className="bl-sr">{chrome.t("price")} </span>{price}</p> : null}
      </li>;
    })}
  </ul>;
}

function Bar({ logo, name, root, chrome, mode, toggleMode, children }: { logo?: string; name: string; root: string; chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; children?: ReactNode }) {
  const scroll = useScrollState();
  return <header className="bl-bar" data-scrolled={scroll.scrolled}>
    <div className="bl-wrap bl-bar-inner">
      <a className="bl-brand" href={root}>{logo ? <img src={logo} alt="" /> : null}<span>{name}</span></a>
      {children}
      <button type="button" className="bl-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}>{chrome.modeName(mode)}</button>
    </div>
  </header>;
}

export function BloomSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const providers = section(snapshot.sections, "providers");
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
  const heroImage = designImage(design, "hero.primary");
  const aboutImage = sectionImage(about, locale, design);
  const logo = brandLogo(design);
  const menu = records(services.items);
  const stylists = records(providers.items);
  const notes = records(benefits.items);
  const review = records(testimonials.items)[0];
  const questions = records(faq.items);
  const rooms = records(locations.items);
  const phone = typeof contact.phone === "string" ? contact.phone : "";

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} className="bl" data-template="bloom-hair-v2" style={rootStyle}>
    <a className="bl-skip" href="#bl-main">{chrome.t("skip")}</a>
    <Bar logo={logo} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode}>
      <nav aria-label={chrome.t("navLabel")} className="bl-nav"><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a>
        {menu.length ? <a href="#services">{chrome.t("services")}</a> : null}
        {stylists.length ? <a href="#team">{chrome.t("team")}</a> : null}
        {rooms.length ? <a href="#contact">{chrome.t("visit")}</a> : null}
      </nav>
      {bookHref && bookLabel ? <a className="bl-btn bl-bar-book" href={bookHref}>{bookLabel}</a> : null}
    </Bar>

    <main id="bl-main">
      <section className="bl-hero">
        {heroImage ? <img className="bl-hero-photo" src={heroImage.src} alt={heroImage.alt} /> : null}
        <div className="bl-wrap bl-hero-frame">
          <div className="bl-panel">
            <h1>{localized(hero.title, locale)}</h1>
            {localized(hero.subtitle || hero.body, locale) ? <p>{localized(hero.subtitle || hero.body, locale)}</p> : null}
            <div className="bl-actions">
              {bookHref && bookLabel ? <a className="bl-btn" href={bookHref}>{bookLabel}</a> : null}
              {secondary ? <a className="bl-link" href={secondary.href}>{secondary.label}</a> : null}
            </div>
          </div>
        </div>
      </section>

      {menu.length ? <section className="bl-section" id="services" aria-labelledby="bl-services-title">
        <div className="bl-wrap bl-board-grid">
          <header className="bl-head" data-reveal><h2 id="bl-services-title">{localized(services.title, locale)}</h2>{localized(services.intro, locale) ? <p className="bl-muted">{localized(services.intro, locale)}</p> : null}</header>
          <PriceBoard items={menu} locale={locale} chrome={chrome} linkRows />
        </div>
      </section> : null}

      {stylists.length ? <section className="bl-section bl-team" id="team" aria-labelledby="bl-team-title">
        <div className="bl-wrap">
          <header className="bl-head" data-reveal><h2 id="bl-team-title">{localized(providers.title, locale)}</h2>{localized(providers.intro, locale) ? <p className="bl-muted">{localized(providers.intro, locale)}</p> : null}</header>
          <ul className={stylists.length === 3 ? "bl-people bl-people-three" : "bl-people"}>{stylists.map((item, index) => {
            const photo = contentImage(item, locale);
            const name = localized(item.name, locale);
            const specialties = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
            return <li key={String(item.id || index)} data-reveal style={{ "--i": index } as CSSProperties}>
              {photo ? <img src={photo.src} alt={photo.alt || name} /> : null}
              <div><h3>{name}</h3><p className="bl-muted">{[localized(item.role, locale), ...specialties].filter(Boolean).join(", ")}</p></div>
            </li>;
          })}</ul>
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="bl-section" aria-labelledby="bl-story-title">
        <div className="bl-wrap bl-story" data-reveal>
          {aboutImage ? <img src={aboutImage.src} alt={aboutImage.alt} /> : null}
          <div><h2 id="bl-story-title">{localized(about.title, locale)}</h2><p>{localized(about.body, locale)}</p></div>
        </div>
      </section> : null}

      {notes.length ? <section className="bl-section bl-notes" aria-labelledby="bl-notes-title">
        <div className="bl-wrap">
          <h2 id="bl-notes-title" className="bl-sr">{localized(benefits.title, locale)}</h2>
          <ul>{notes.map((item, index) => <li key={index} data-reveal style={{ "--i": index } as CSSProperties}><h3>{localized(item.title, locale)}</h3><p className="bl-muted">{localized(item.description, locale)}</p></li>)}</ul>
        </div>
      </section> : null}

      {review ? <section className="bl-section bl-review" aria-labelledby="bl-review-title">
        <div className="bl-wrap">
          <h2 id="bl-review-title" className="bl-sr">{localized(testimonials.title, locale)}</h2>
          <figure data-reveal><blockquote><p>{localized(review.quote, locale)}</p></blockquote><figcaption><strong>{localized(review.attribution, locale)}</strong>{localized(review.role, locale) ? <span>{localized(review.role, locale)}</span> : null}{localized(testimonials.intro, locale) ? <span>{localized(testimonials.intro, locale)}</span> : null}</figcaption></figure>
        </div>
      </section> : null}

      {questions.length ? <section className="bl-section" id="faq" aria-labelledby="bl-faq-title">
        <div className="bl-wrap bl-faq-grid" data-reveal>
          <h2 id="bl-faq-title">{localized(faq.title, locale)}</h2>
          <div className="bl-faq">{questions.map((item, index) => <details key={index}><summary>{localized(item.question, locale)}</summary><p className="bl-muted">{localized(item.answer, locale)}</p></details>)}</div>
        </div>
      </section> : null}

      {rooms.length ? <section className="bl-section bl-visit" id="contact" aria-labelledby="bl-visit-title">
        <div className="bl-wrap">
          <header className="bl-head" data-reveal><h2 id="bl-visit-title">{localized(locations.title, locale)}</h2>{localized(locations.intro, locale) ? <p className="bl-muted">{localized(locations.intro, locale)}</p> : null}</header>
          <div className="bl-rooms">{rooms.map((item, index) => {
            const photo = contentImage(item, locale);
            const directions = action(item.directionsAction, locale);
            const telephone = typeof item.phone === "string" ? item.phone : phone;
            return <article key={String(item.id || index)} data-reveal style={{ "--i": index } as CSSProperties}>
              {photo ? <img src={photo.src} alt={photo.alt} /> : null}
              <h3>{localized(item.name, locale)}</h3>
              <p>{localized(item.address, locale)}</p>
              {localized(item.hours, locale) ? <p className="bl-muted">{localized(item.hours, locale)}</p> : null}
              <p className="bl-room-links">
                {telephone ? <a href={`tel:${telephone.replace(/\s+/g, "")}`}><span className="bl-sr">{chrome.t("phone")} </span>{telephone}</a> : null}
                {directions ? <a href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}
              </p>
            </article>;
          })}</div>
        </div>
      </section> : null}

      {bookHref && bookLabel ? <section className="bl-final" aria-labelledby="bl-final-title">
        <div className="bl-wrap bl-final-inner" data-reveal>
          <h2 id="bl-final-title">{localized(booking.title, locale)}</h2>
          <a className="bl-btn" href={bookingAction?.href || bookHref}>{bookLabel}</a>
        </div>
      </section> : null}
    </main>

    <footer className="bl-footer">
      <div className="bl-wrap bl-footer-inner">
        <p className="bl-footer-name">{applicationName}</p>
        {localized(footer.body, locale) ? <p className="bl-muted">{localized(footer.body, locale)}</p> : null}
        <small>© {new Date().getFullYear()} {applicationName}</small>
      </div>
    </footer>
  </div>;
}

export function BloomBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const image = designImage(design, "hero.primary");
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, locale);
  return <div ref={root} data-motion={design.motion} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="bl bl-handoff" data-template="bloom-hair-v2" style={rootStyle}>
    <Bar logo={brandLogo(design)} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode}>
      <a className="bl-link bl-back" href={publicRoot}>{chrome.t("backToSite")}</a>
    </Bar>
    <main className="bl-wrap bl-handoff-grid">
      <div className="bl-panel bl-handoff-panel">
        <h1>{localized(booking.title, locale)}</h1>
        {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
        {bookingPath && label ? <a className="bl-btn" href={bookingPath}>{label}</a> : null}
      </div>
      <div className="bl-handoff-side">
        {image ? <img src={image.src} alt={image.alt} /> : null}
        {records(services.items).length ? <PriceBoard items={records(services.items)} locale={locale} chrome={chrome} linkRows={false} /> : null}
      </div>
    </main>
  </div>;
}
