import { useRef, type CSSProperties, type ReactNode } from "react";

import type { BookingTemplateProps, TemplateProps } from "../types";
import type { ContentRecord } from "../content";
import { action, brandLogo, contentImage, designImage, durationMinutes, formatPrice, localized, records, section, sectionImage } from "../content";
import { usePublicChrome, type PublicChrome } from "../chrome";
import { useReveal, useScrollState } from "../motion";
import "./abugida.css";

/*
 * Abugida Language v2: an Ethiopic manuscript page. Black ink, one red rubric,
 * Alegreya with Abyssinica SIL. Lessons read like a contents page.
 * Radius system: 2px everywhere. Red marks rules, numerals and actions; text stays ink.
 */

const GEEZ_DIGITS = ["", "፩", "፪", "፫", "፬", "፭", "፮", "፯", "፰", "፱", "፲", "፲፩", "፲፪"];

function Contents({ items, locale, chrome, linkRows }: { items: ContentRecord[]; locale: string; chrome: PublicChrome; linkRows: boolean }) {
  return <ol className="ab-contents" data-reveal>
    {items.map((item, index) => {
      const minutes = durationMinutes(item.durationMinutes);
      const price = formatPrice(item.price, item.currency, locale);
      const choose = linkRows ? action(item.action, locale) : null;
      const name = localized(item.name, locale);
      return <li key={String(item.id || index)} style={{ "--i": index } as CSSProperties}>
        <div className="ab-contents-line">
          <h3>{choose ? <a href={choose.href}>{name}</a> : name}</h3>
          <span className="ab-leader" aria-hidden="true" />
          <p className="ab-contents-facts">
            {minutes ? <span><span className="ab-sr">{chrome.t("duration")} </span>{chrome.t("minutes", { count: minutes })}</span> : null}
            {price ? <span><span className="ab-sr">{chrome.t("price")} </span>{price}</span> : null}
          </p>
        </div>
        {linkRows && localized(item.summary, locale) ? <p className="ab-muted">{localized(item.summary, locale)}</p> : null}
      </li>;
    })}
  </ol>;
}

function Bar({ logo, name, root, chrome, mode, toggleMode, children }: { logo?: string; name: string; root: string; chrome: PublicChrome; mode: TemplateProps["mode"]; toggleMode: () => void; children?: ReactNode }) {
  const scroll = useScrollState();
  return <header className="ab-bar" data-scrolled={scroll.scrolled}>
    <div className="ab-wrap ab-bar-inner">
      <a className="ab-brand" href={root}>{logo ? <img src={logo} alt="" /> : null}<span>{name}</span></a>
      {children}
      <button type="button" className="ab-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}>{chrome.modeName(mode)}</button>
    </div>
  </header>;
}

export function AbugidaSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const providers = section(snapshot.sections, "providers");
  const about = section(snapshot.sections, "about");
  const benefits = section(snapshot.sections, "benefits");
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
  const lessons = records(services.items);
  const coaches = records(providers.items);
  const notes = records(benefits.items);
  const steps = records(process.items);
  const review = records(testimonials.items)[0];
  const questions = records(faq.items);
  const rooms = records(locations.items);
  const roomImage = rooms[0] ? sectionImage(rooms[0], locale, design) : null;
  const phone = typeof contact.phone === "string" ? contact.phone : "";
  const email = typeof contact.email === "string" ? contact.email : "";

  return <div ref={root} data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} data-motion={design.motion} className="ab" data-template="abugida-language-v2" style={rootStyle}>
    <a className="ab-skip" href="#ab-main">{chrome.t("skip")}</a>
    <Bar logo={logo} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode}>
      <nav aria-label={chrome.t("navLabel")} className="ab-nav"><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a>
        {lessons.length ? <a href="#services">{chrome.t("services")}</a> : null}
        {coaches.length ? <a href="#team">{chrome.t("team")}</a> : null}
        {rooms.length ? <a href="#contact">{chrome.t("visit")}</a> : null}
        {questions.length ? <a href="#faq">{chrome.t("questions")}</a> : null}
      </nav>
      {bookHref && bookLabel ? <a className="ab-btn ab-bar-book" href={bookHref}>{bookLabel}</a> : null}
    </Bar>

    <main id="ab-main">
      <section className="ab-hero">
        {heroImage ? <figure className="ab-hero-photo"><img src={heroImage.src} alt={heroImage.alt} /></figure> : null}
        <div className="ab-hero-copy">
          <h1>{localized(hero.title, locale)}</h1>
          {localized(hero.subtitle || hero.body, locale) ? <p className="ab-lede">{localized(hero.subtitle || hero.body, locale)}</p> : null}
          <div className="ab-actions">
            {bookHref && bookLabel ? <a className="ab-btn" href={bookHref}>{bookLabel}</a> : null}
            {secondary ? <a className="ab-link" href={secondary.href}>{secondary.label}</a> : null}
          </div>
        </div>
      </section>

      {lessons.length ? <section className="ab-section" id="services" aria-labelledby="ab-lessons-title">
        <div className="ab-wrap ab-narrow">
          <header className="ab-head" data-reveal><h2 id="ab-lessons-title">{localized(services.title, locale)}</h2>{localized(services.intro, locale) ? <p className="ab-muted">{localized(services.intro, locale)}</p> : null}</header>
          <Contents items={lessons} locale={locale} chrome={chrome} linkRows />
        </div>
      </section> : null}

      {coaches.length ? <section className="ab-section ab-coaches" id="team" aria-labelledby="ab-team-title">
        <div className="ab-wrap">
          <header className="ab-head" data-reveal><h2 id="ab-team-title">{localized(providers.title, locale)}</h2>{localized(providers.intro, locale) ? <p className="ab-muted">{localized(providers.intro, locale)}</p> : null}</header>
          <ul className="ab-pair">{coaches.map((item, index) => {
            const photo = contentImage(item, locale);
            const name = localized(item.name, locale);
            const specialties = records(item.specialties).map((entry) => localized(entry, locale)).filter(Boolean);
            return <li key={String(item.id || index)} data-reveal style={{ "--i": index } as CSSProperties}>
              {photo ? <img src={photo.src} alt={photo.alt || name} /> : null}
              <div><h3>{name}</h3>{localized(item.role, locale) ? <p className="ab-role">{localized(item.role, locale)}</p> : null}{specialties.length ? <p className="ab-muted">{specialties.join(", ")}</p> : null}</div>
            </li>;
          })}</ul>
        </div>
      </section> : null}

      {localized(about.body, locale) ? <section className="ab-section" aria-labelledby="ab-story-title">
        <div className="ab-wrap">
          <h2 id="ab-story-title" className="ab-rubric" data-reveal>{localized(about.title, locale)}</h2>
          <p className="ab-columns">{localized(about.body, locale)}</p>
          {notes.length ? <ul className="ab-notes" aria-label={localized(benefits.title, locale) || undefined}>{notes.map((item, index) => <li key={index}><h3>{localized(item.title, locale)}</h3><p className="ab-muted">{localized(item.description, locale)}</p></li>)}</ul> : null}
        </div>
      </section> : null}

      {steps.length ? <section className="ab-section ab-steps" aria-labelledby="ab-steps-title">
        <div className="ab-wrap">
          <header className="ab-head" data-reveal><h2 id="ab-steps-title">{localized(process.title, locale)}</h2>{localized(process.intro, locale) ? <p className="ab-muted">{localized(process.intro, locale)}</p> : null}</header>
          <ol className="ab-step-list" data-reveal>{steps.map((item, index) => {
            const number = Number(item.step || index + 1);
            return <li key={index} style={{ "--i": index } as CSSProperties}>
              <span className="ab-numeral" aria-hidden="true">{GEEZ_DIGITS[number] || String(number)}</span>
              <h3><span className="ab-sr">{chrome.t("step", { count: String(number) })} </span>{localized(item.title, locale)}</h3>
              <p className="ab-muted">{localized(item.description, locale)}</p>
            </li>;
          })}</ol>
        </div>
      </section> : null}

      {review ? <section className="ab-section ab-review" aria-labelledby="ab-review-title">
        <div className="ab-wrap ab-narrow">
          <h2 id="ab-review-title" className="ab-sr">{localized(testimonials.title, locale)}</h2>
          <figure data-reveal><blockquote><p>{localized(review.quote, locale)}</p></blockquote><figcaption><strong>{localized(review.attribution, locale)}</strong>{localized(review.role, locale) ? <span>{localized(review.role, locale)}</span> : null}{localized(testimonials.intro, locale) ? <span>{localized(testimonials.intro, locale)}</span> : null}</figcaption></figure>
        </div>
      </section> : null}

      {questions.length ? <section className="ab-section" id="faq" aria-labelledby="ab-faq-title">
        <div className="ab-wrap">
          <h2 id="ab-faq-title" className="ab-rubric" data-reveal>{localized(faq.title, locale)}</h2>
          <dl className="ab-phrasebook">{questions.map((item, index) => <div key={index}><dt>{localized(item.question, locale)}</dt><dd>{localized(item.answer, locale)}</dd></div>)}</dl>
        </div>
      </section> : null}

      {rooms.length ? <section className="ab-section ab-visit" id="contact" aria-labelledby="ab-visit-title">
        <div className="ab-wrap ab-visit-grid">
          {roomImage ? <img src={roomImage.src} alt={roomImage.alt} /> : null}
          <div className="ab-visit-text">
            <h2 id="ab-visit-title">{localized(locations.title, locale)}</h2>
            {localized(locations.intro, locale) ? <p className="ab-muted">{localized(locations.intro, locale)}</p> : null}
            {rooms.map((item, index) => {
              const directions = action(item.directionsAction, locale);
              return <article key={String(item.id || index)} data-reveal style={{ "--i": index } as CSSProperties}>
                <h3>{localized(item.name, locale)}</h3>
                <p>{localized(item.address, locale)}</p>
                {index === 0 && localized(item.hours, locale) ? <p className="ab-muted">{localized(item.hours, locale)}</p> : null}
                {directions ? <a className="ab-inline" href={directions.href} rel="noopener noreferrer">{directions.label}</a> : null}
              </article>;
            })}
            <p className="ab-contact">
              {phone ? <a className="ab-inline" href={`tel:${phone.replace(/\s+/g, "")}`}><span className="ab-sr">{chrome.t("phone")} </span>{phone}</a> : null}
              {email ? <a className="ab-inline" href={`mailto:${email}`}><span className="ab-sr">{chrome.t("email")} </span>{email}</a> : null}
            </p>
          </div>
        </div>
      </section> : null}

      {bookHref && bookLabel ? <section className="ab-band" aria-labelledby="ab-band-title">
        <div className="ab-wrap ab-band-inner" data-reveal>
          <div><h2 id="ab-band-title">{localized(booking.title, locale)}</h2>{localized(booking.body, locale) ? <p className="ab-muted">{localized(booking.body, locale)}</p> : null}</div>
          <a className="ab-btn" href={bookingAction?.href || bookHref}>{bookLabel}</a>
        </div>
      </section> : null}
    </main>

    <footer className="ab-footer">
      <div className="ab-wrap ab-footer-inner">
        <p className="ab-footer-name">{applicationName}</p>
        {localized(footer.body, locale) ? <p className="ab-muted">{localized(footer.body, locale)}</p> : null}
        <small>© {new Date().getFullYear()} {applicationName}</small>
      </div>
    </footer>
  </div>;
}

export function AbugidaBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const booking = section(snapshot.sections, "booking_cta");
  const label = action(hero.primaryAction, locale)?.label || action(booking.action, locale)?.label || "";
  const image = designImage(design, "hero.primary");
  const root = useRef<HTMLDivElement>(null);
  useReveal(root, locale);
  return <div ref={root} data-motion={design.motion} data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="ab ab-handoff" data-template="abugida-language-v2" style={rootStyle}>
    <Bar logo={brandLogo(design)} name={applicationName} root={publicRoot} chrome={chrome} mode={mode} toggleMode={toggleMode}>
      <a className="ab-link ab-back" href={publicRoot}>{chrome.t("backToSite")}</a>
    </Bar>
    <main className="ab-hero ab-handoff-hero">
      {image ? <figure className="ab-hero-photo"><img src={image.src} alt={image.alt} /></figure> : null}
      <div className="ab-hero-copy">
        <h1>{localized(booking.title, locale)}</h1>
        {localized(booking.body, locale) ? <p className="ab-lede">{localized(booking.body, locale)}</p> : null}
        {records(services.items).length ? <Contents items={records(services.items)} locale={locale} chrome={chrome} linkRows={false} /> : null}
        {bookingPath && label ? <div className="ab-actions"><a className="ab-btn" href={bookingPath}>{label}</a></div> : null}
      </div>
    </main>
  </div>;
}
