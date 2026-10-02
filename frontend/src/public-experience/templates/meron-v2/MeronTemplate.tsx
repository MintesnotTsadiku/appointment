import { useRef, type CSSProperties, type ReactNode } from "react";

import type { BookingTemplateProps, TemplateProps } from "../types";
import type { ContentImage, ContentRecord } from "../content";
import { action, brandLogo, contentImage, designImage, durationMinutes, formatPrice, localized, records, section, sectionImage } from "../content";
import { usePublicChrome, type PublicChrome } from "../chrome";
import { useReveal, useScrollState } from "../motion";
import "./meron.css";

/*
 * Meron Atelier v2: a garment label over three swatches. A centered Garamond
 * headline with a triptych of the work; services are fitting slips.
 * Radius system: 0 everywhere. Chalk blue fills the fitting slips only.
 */

function Slips({ items, locale, chrome, linkRows }: { items: ContentRecord[]; locale: string; chrome: PublicChrome; linkRows: boolean }) {
  return <div className="mr-slips">
    {items.map((item, index) => {
      const minutes = durationMinutes(item.durationMinutes);
      const price = formatPrice(item.price, item.currency, locale);
      const choose = linkRows ? action(item.action, locale) : null;
      const name = localized(item.name, locale);
      return <article key={String(item.id || index)} className="mr-slip" data-reveal style={{ "--i": index } as CSSProperties}>
        <h3>{choose ? <a href={choose.href}>{name}</a> : name}</h3>
        {localized(item.summary, locale) ? <p>{localized(item.summary, locale)}</p> : null}
        <dl>
          {minutes ? <div><dt>{chrome.t("duration")}</dt><dd>{chrome.t("minutes", { count: minutes })}</dd></div> : null}
          {price ? <div><dt>{chrome.t("price")}</dt><dd>{price}</dd></div> : null}
        </dl>
      </article>;
    })}
  </div>;
}

function Bar({ logo, name, root, chrome, mode, toggleMode, children }: { logo?: string; name: string; root: string; chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; children?: ReactNode }) {
  const scroll = useScrollState();
  return <header className="mr-bar" data-scrolled={scroll.scrolled}>
    <div className="mr-wrap mr-bar-inner">
      <a className="mr-brand" href={root}>{logo ? <img src={logo} alt="" /> : null}<span>{name}</span></a>
      {children}
      <button type="button" className="mr-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}>{chrome.modeName(mode)}</button>
    </div>
  </header>;
}

function uniqueImages(candidates: (ContentImage | null)[]): ContentImage[] {
  const seen = new Set<string>();
  return candidates.filter((item): item is ContentImage => {
    if (!item || seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  });
}

export function MeronSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
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
  const logo = brandLogo(design);
  const slips = records(services.items);
  const notes = records(benefits.items);
  const makers = records(providers.items);
  const steps = records(process.items);
  const review = records(testimonials.items)[0];
  const questions = records(faq.items);
  const place = records(locations.items)[0];
  const heroImage = designImage(design, "hero.primary");
  // The centre panel is the recipe hero; the sides show the owner's own work photos.
  const sides = uniqueImages([...slips.map((item) => contentImage(item, locale)), contentImage(about, locale)])
    .filter((item) => item.src !== heroImage?.src).slice(0, 2);
  const triptych = heroImage && sides.length === 2 ? [sides[0], heroImage, sides[1]] : heroImage ? [heroImage] : [];
  const placeImage = place ? sectionImage(place, locale, design) : null;
  const directions = place ? action(place.directionsAction, locale) : null;
  const phone = typeof contact.phone === "string" ? contact.phone : (typeof place?.phone === "string" ? place.phone : "");
  const email = typeof contact.email === "string" ? contact.email : "";

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} className="mr" data-template="meron-atelier-v2" style={rootStyle}>
    <a className="mr-skip" href="#mr-main">{chrome.t("skip")}</a>
    <Bar logo={logo} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode}>
      <nav aria-label={chrome.t("navLabel")} className="mr-nav">
        {slips.length ? <a href="#services">{chrome.t("services")}</a> : null}
        {makers.length ? <a href="#team">{chrome.t("team")}</a> : null}
        {place ? <a href="#contact">{chrome.t("visit")}</a> : null}
      </nav>
      {bookHref && bookLabel ? <a className="mr-btn mr-bar-book" href={bookHref}>{bookLabel}</a> : null}
    </Bar>

    <main id="mr-main">
      <section className="mr-hero">
        <div className="mr-wrap mr-hero-copy">
          <h1>{localized(hero.title, locale)}</h1>
          {localized(hero.subtitle || hero.body, locale) ? <p className="mr-lede">{localized(hero.subtitle || hero.body, locale)}</p> : null}
          <div className="mr-actions">
            {bookHref && bookLabel ? <a className="mr-btn" href={bookHref}>{bookLabel}</a> : null}
            {secondary ? <a className="mr-link" href={secondary.href}>{secondary.label}</a> : null}
          </div>
        </div>
        {triptych.length ? <div className={triptych.length === 3 ? "mr-wrap mr-triptych" : "mr-wrap mr-triptych mr-triptych-single"}>
          {triptych.map((image, index) => <img key={image.src} src={image.src} alt={index === 1 || triptych.length === 1 ? image.alt : ""} style={{ "--side": index - 1 } as CSSProperties} />)}
        </div> : null}
      </section>

      {slips.length ? <section className="mr-section" id="services" aria-labelledby="mr-services-title">
        <div className="mr-wrap">
          <header className="mr-head" data-reveal><h2 id="mr-services-title">{localized(services.title, locale)}</h2>{localized(services.intro, locale) ? <p>{localized(services.intro, locale)}</p> : null}</header>
          <Slips items={slips} locale={locale} chrome={chrome} linkRows />
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="mr-section mr-story" aria-labelledby="mr-story-title">
        <div className="mr-wrap mr-story-grid">
          <div className="mr-story-text" data-reveal><h2 id="mr-story-title">{localized(about.title, locale)}</h2><p>{localized(about.body, locale)}</p></div>
          {notes.length ? <ul className="mr-notes" aria-label={localized(benefits.title, locale) || undefined}>{notes.map((item, index) => <li key={index}><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></li>)}</ul> : null}
        </div>
      </section> : null}

      {makers.length ? <section className="mr-section" id="team" aria-labelledby="mr-team-title">
        <div className="mr-wrap">
          {makers.map((item, index) => {
            const photo = contentImage(item, locale);
            const name = localized(item.name, locale);
            const specialties = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
            return <article key={String(item.id || index)} className="mr-maker" data-reveal>
              {photo ? <img src={photo.src} alt={photo.alt || name} /> : null}
              <div>
                {index === 0 ? <h2 id="mr-team-title">{localized(providers.title, locale)}</h2> : null}
                <h3>{name}</h3>
                {localized(item.role, locale) ? <p className="mr-role">{localized(item.role, locale)}</p> : null}
                {localized(providers.intro, locale) && index === 0 ? <p>{localized(providers.intro, locale)}</p> : null}
                {specialties.length ? <p className="mr-muted">{specialties.join(", ")}</p> : null}
              </div>
            </article>;
          })}
        </div>
      </section> : null}

      {steps.length ? <section className="mr-section mr-process" aria-labelledby="mr-steps-title">
        <div className="mr-wrap">
          <header className="mr-head" data-reveal><h2 id="mr-steps-title">{localized(process.title, locale)}</h2>{localized(process.intro, locale) ? <p>{localized(process.intro, locale)}</p> : null}</header>
          <ol className="mr-tape" data-reveal>{steps.map((item, index) => <li key={index} style={{ "--i": index } as CSSProperties}>
            <span className="mr-tape-mark" aria-hidden="true">{String(item.step || index + 1)}</span>
            <h3><span className="mr-sr">{chrome.t("step", { count: String(item.step || index + 1) })} </span>{localized(item.title, locale)}</h3>
            <p>{localized(item.description, locale)}</p>
          </li>)}</ol>
        </div>
      </section> : null}

      {review ? <section className="mr-section mr-review" aria-labelledby="mr-review-title">
        <div className="mr-wrap">
          <h2 id="mr-review-title" className="mr-sr">{localized(testimonials.title, locale)}</h2>
          <figure data-reveal><blockquote><p>{localized(review.quote, locale)}</p></blockquote><figcaption><strong>{localized(review.attribution, locale)}</strong>{localized(review.role, locale) ? <span>{localized(review.role, locale)}</span> : null}{localized(testimonials.intro, locale) ? <span>{localized(testimonials.intro, locale)}</span> : null}</figcaption></figure>
        </div>
      </section> : null}

      {questions.length ? <section className="mr-section" id="faq" aria-labelledby="mr-faq-title">
        <div className="mr-wrap mr-faq" data-reveal>
          <h2 id="mr-faq-title">{localized(faq.title, locale)}</h2>
          {questions.map((item, index) => <details key={index}><summary>{localized(item.question, locale)}</summary><p>{localized(item.answer, locale)}</p></details>)}
        </div>
      </section> : null}

      {place ? <section className="mr-section mr-visit" id="contact" aria-labelledby="mr-visit-title">
        <div className="mr-wrap">
          <div className="mr-label" data-reveal>
            <h2 id="mr-visit-title">{localized(locations.title, locale)}</h2>
            <dl>
              <div><dt>{chrome.t("address")}</dt><dd>{localized(place.address, locale)}{directions ? <a href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}</dd></div>
              {localized(place.hours, locale) ? <div><dt>{chrome.t("hours")}</dt><dd>{localized(place.hours, locale)}</dd></div> : null}
              {phone ? <div><dt>{chrome.t("phone")}</dt><dd><a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a></dd></div> : null}
              {email ? <div><dt>{chrome.t("email")}</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div> : null}
            </dl>
          </div>
          {placeImage ? <img className="mr-visit-photo" src={placeImage.src} alt={placeImage.alt} /> : null}
        </div>
      </section> : null}

      {bookHref && bookLabel ? <section className="mr-band" aria-labelledby="mr-band-title">
        <div className="mr-wrap mr-band-inner" data-reveal>
          <h2 id="mr-band-title">{localized(booking.title, locale)}</h2>
          {localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}
          <a className="mr-btn" href={bookingAction?.href || bookHref}>{bookLabel}</a>
        </div>
      </section> : null}
    </main>

    <footer className="mr-footer">
      <div className="mr-wrap mr-footer-inner">
        <p className="mr-footer-name">{applicationName}</p>
        {localized(footer.body, locale) ? <p className="mr-muted">{localized(footer.body, locale)}</p> : null}
        <small>© {new Date().getFullYear()} {applicationName}</small>
      </div>
    </footer>
  </div>;
}

export function MeronBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, locale);
  return <div ref={root} data-motion={design.motion} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="mr mr-handoff" data-template="meron-atelier-v2" style={rootStyle}>
    <Bar logo={brandLogo(design)} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode}>
      <a className="mr-link mr-back" href={publicRoot}>{chrome.t("backToSite")}</a>
    </Bar>
    <main className="mr-wrap mr-handoff-main">
      <div className="mr-hero-copy">
        <h1>{localized(booking.title, locale)}</h1>
        {localized(booking.body, locale) ? <p className="mr-lede">{localized(booking.body, locale)}</p> : null}
        {bookingPath && label ? <div className="mr-actions"><a className="mr-btn" href={bookingPath}>{label}</a></div> : null}
      </div>
      {records(services.items).length ? <Slips items={records(services.items)} locale={locale} chrome={chrome} linkRows={false} /> : null}
    </main>
  </div>;
}
