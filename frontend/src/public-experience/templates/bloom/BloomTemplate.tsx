import type { BookingTemplateProps, TemplateProps } from "../types";
import { action, brandLogo, contentImage, designImage, formatPrice, localized, records, section } from "../content";
import { usePublicChrome } from "../chrome";
import "./bloom.css";

export function BloomSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const benefits = section(snapshot.sections, "benefits");
  const providers = section(snapshot.sections, "providers");
  const process = section(snapshot.sections, "process");
  const testimonials = section(snapshot.sections, "testimonials");
  const faq = section(snapshot.sections, "faq");
  const locations = section(snapshot.sections, "locations");
  const booking = section(snapshot.sections, "booking_cta");
  const footer = section(snapshot.sections, "footer");
  const primary = action(hero.primaryAction, locale);
  const finalAction = action(booking.action, locale);
  const heroImage = designImage(design, "hero.primary");
  const detailImage = designImage(design, "section.detail");
  const location = records(locations.items)[0];
  const locationImage = location ? contentImage(location, locale) : null;
  const logo = brandLogo(design);
  const quotes = records(testimonials.items);

  return <div data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="bloom-site" data-template="bloom-hair-v1" style={rootStyle}>
    <header className="bloom-nav">
      <a href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : null}{applicationName}</a>
      <nav aria-label={chrome.t("navLabel")}><a href="#services">{chrome.t("services")}</a><a href="#people">{chrome.t("team")}</a><a href="#contact">{chrome.t("visit")}</a></nav>
      <button type="button" className="bloom-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}>{chrome.modeName(mode)} <span aria-hidden="true">{mode === "dark" ? "○" : "●"}</span></button>
      {primary ? <a className="bloom-button" href={primary.href}>{primary.label}</a> : null}
    </header>
    <main>
      <section className="bloom-hero">
        <div>
          {localized(hero.eyebrow, locale) ? <p className="bloom-label">{localized(hero.eyebrow, locale)}</p> : null}
          <h1>{localized(hero.title, locale)}</h1>
          <p>{localized(hero.subtitle || hero.body, locale)}</p>
          {primary ? <a className="bloom-button" href={primary.href}>{primary.label}</a> : null}
        </div>
        <figure>{heroImage ? <img src={heroImage.src} alt={heroImage.alt} /> : null}</figure>
      </section>
      <section className="bloom-services" id="services">
        <div className="bloom-section-title"><h2>{localized(services.title, locale)}</h2></div>
        <div className="bloom-service-grid">{records(services.items).map((item, index) => {
          const photo = contentImage(item, locale);
          return <article key={index}><div><h3>{localized(item.name, locale)}</h3><span>{formatPrice(item.price, item.currency, locale)}</span><p>{localized(item.summary, locale)}</p></div>{photo ? <img src={photo.src} alt={photo.alt} /> : null}</article>;
        })}</div>
      </section>
      <section className="bloom-care"><h2>{localized(benefits.title, locale)}</h2><div>{records(benefits.items).map((item, index) => <article key={index}><b aria-hidden="true">{["≋", "♡", "♢"][index % 3]}</b><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></article>)}</div></section>
      <section className="bloom-people" id="people"><div><h2>{localized(providers.title, locale)}</h2><p>{localized(providers.intro, locale)}</p></div><div>{records(providers.items).map((item, index) => {
        const photo = contentImage(item, locale);
        return <article key={index}>{photo ? <img src={photo.src} alt={photo.alt || localized(item.name, locale)} /> : null}<h3>{localized(item.name, locale)}</h3><p>{localized(item.role, locale)}</p></article>;
      })}</div></section>
      <section className="bloom-process">{detailImage ? <img src={detailImage.src} alt={detailImage.alt} /> : null}<div><div className="bloom-process-head"><div><h2>{localized(process.title, locale)}</h2></div><p>{localized(process.intro, locale)}</p></div>{records(process.items).map((item, index) => <article key={index}><b>{String(item.step || index + 1)}</b><div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div></article>)}</div></section>
      {quotes.length ? <section className="bloom-testimonials"><div>{quotes.slice(0, 1).map((item, index) => <blockquote key={index}>“{localized(item.quote, locale)}”<cite>{localized(item.attribution, locale)}</cite></blockquote>)}</div><div>{quotes.slice(1).map((item, index) => <blockquote key={index}>“{localized(item.quote, locale)}”<cite>{localized(item.attribution, locale)}</cite></blockquote>)}</div></section> : null}
      <section className="bloom-faq" id="faq"><div><h2>{localized(faq.title, locale)}</h2></div><div>{records(faq.items).map((item, index) => <details key={index}><summary>{localized(item.question, locale)}</summary><p>{localized(item.answer, locale)}</p></details>)}</div></section>
      <section className="bloom-studio" id="contact">{locationImage ? <img src={locationImage.src} alt={locationImage.alt} /> : null}<div><h2>{localized(locations.title, locale)}</h2>{location ? <address>{localized(location.address, locale)}<br />{localized(location.hours, locale)}<br />{String(location.phone || "")}</address> : null}</div></section>
      <section className="bloom-final"><div><h2>{localized(booking.title, locale)}</h2></div>{finalAction ? <a href={finalAction.href}>{finalAction.label}</a> : null}</section>
    </main>
    <footer className="bloom-footer"><a href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : null}{applicationName}</a>{localized(footer.body, locale) ? <p>{localized(footer.body, locale)}</p> : null}<small>© {new Date().getFullYear()} {applicationName}</small></footer>
  </div>;
}

export function BloomBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const booking = section(snapshot.sections, "booking_cta");
  const cta = action(booking.action, locale);
  const image = designImage(design, "hero.primary");
  const logo = brandLogo(design);
  return <main data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="bloom-site bloom-booking" style={rootStyle}>
    <header className="bloom-nav"><a href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : null}{applicationName}</a><button type="button" className="bloom-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}>{chrome.modeName(mode)} <span aria-hidden="true">{mode === "dark" ? "○" : "●"}</span></button><a href={publicRoot}>{chrome.t("backToSite")}</a></header>
    <section><div><h1>{localized(booking.title, locale)}</h1><p>{localized(booking.body, locale)}</p>{bookingPath && cta ? <a className="bloom-button" href={bookingPath}>{cta.label}</a> : null}</div>{image ? <img src={image.src} alt={image.alt} /> : null}</section>
  </main>;
}
