import type { BookingTemplateProps, TemplateProps } from "../types";
import { action, brandLogo, contentImage, designImage, localized, records, section } from "../content";
import { usePublicChrome } from "../chrome";
import "./meron.css";

export function MeronSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
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
  const founder = records(providers.items)[0];
  const founderPhoto = founder ? contentImage(founder, locale) : null;
  const location = records(locations.items)[0];
  const locationImage = location ? contentImage(location, locale) : null;
  const logo = brandLogo(design);

  return <div data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="meron-site" data-template="meron-atelier-v1" style={rootStyle}>
    <header className="meron-nav">
      <a href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : null}{applicationName}</a>
      <nav aria-label={chrome.t("navLabel")}><a href="#services">{chrome.t("services")}</a><a href="#story">{chrome.t("team")}</a><a href="#contact">{chrome.t("visit")}</a></nav>
      <button type="button" className="meron-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}><span>{chrome.modeName(mode)}</span><i aria-hidden="true"></i></button>
      {primary ? <a className="meron-button" href={primary.href}>{primary.label}</a> : null}
    </header>
    <main>
      <section className="meron-hero">
        <div>
          {localized(hero.eyebrow, locale) ? <p className="meron-label">{localized(hero.eyebrow, locale)}</p> : null}
          <h1>{localized(hero.title, locale)}</h1>
          <p>{localized(hero.subtitle || hero.body, locale)}</p>
          {primary ? <a className="meron-button" href={primary.href}>{primary.label}</a> : null}
        </div>
        <figure>{heroImage ? <img src={heroImage.src} alt={heroImage.alt} /> : null}</figure>
      </section>
      <section className="meron-services" id="services"><div><h2>{localized(services.title, locale)}</h2><i></i><p>{localized(services.intro, locale)}</p></div>{records(services.items).map((item, index) => {
        const photo = contentImage(item, locale);
        return <article key={index}><h3>{localized(item.name, locale)}</h3><p>{localized(item.summary, locale)}</p>{photo ? <img src={photo.src} alt={photo.alt} /> : null}</article>;
      })}</section>
      <section className="meron-details"><div><h2>{localized(benefits.title, locale)}</h2><i></i>{localized(benefits.intro, locale) ? <p>{localized(benefits.intro, locale)}</p> : null}</div>{detailImage ? <img src={detailImage.src} alt={detailImage.alt} /> : null}<div>{records(benefits.items).map((item, index) => <article key={index}><div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div></article>)}</div></section>
      {founder ? <section className="meron-founder" id="story">{founderPhoto ? <img src={founderPhoto.src} alt={founderPhoto.alt || localized(founder.name, locale)} /> : null}<div><h2>{localized(providers.title, locale)}</h2><i></i><article><h3>{localized(founder.name, locale)}</h3><p>{localized(founder.role, locale)}</p><p>{localized(providers.intro, locale)}</p></article></div></section> : null}
      <section className="meron-process"><div><h2>{localized(process.title, locale)}</h2><i></i>{localized(process.intro, locale) ? <p>{localized(process.intro, locale)}</p> : null}</div>{records(process.items).map((item, index) => <article key={index}><b>{String(item.step || index + 1).padStart(2, "0")}</b><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></article>)}</section>
      {records(testimonials.items).length ? <section className="meron-story">{detailImage ? <img src={detailImage.src} alt="" /> : null}<div>{records(testimonials.items).slice(0, 1).map((item, index) => <blockquote key={index}>“{localized(item.quote, locale)}”<cite>{localized(item.attribution, locale)}</cite></blockquote>)}</div></section> : null}
      <section className="meron-faq" id="faq"><div><h2>{localized(faq.title, locale)}</h2><i></i></div><div>{records(faq.items).map((item, index) => <details key={index}><summary>{localized(item.question, locale)}<span aria-hidden="true">+</span></summary><p>{localized(item.answer, locale)}</p></details>)}</div></section>
      <section className="meron-location" id="contact">{locationImage ? <img src={locationImage.src} alt={locationImage.alt} /> : null}<div><h2>{localized(locations.title, locale)}</h2><i></i>{location ? <address>{localized(location.address, locale)}<br />{localized(location.hours, locale)}<br />{String(location.phone || "")}</address> : null}{finalAction ? <a className="meron-button" href={finalAction.href}>{finalAction.label}</a> : null}</div></section>
    </main>
    <footer className="meron-footer"><a href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : null}{applicationName}</a>{localized(footer.body, locale) ? <small>{localized(footer.body, locale)}</small> : null}</footer>
  </div>;
}

export function MeronBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const booking = section(snapshot.sections, "booking_cta");
  const cta = action(booking.action, locale);
  const image = designImage(design, "section.detail");
  const logo = brandLogo(design);
  return <main data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="meron-site meron-booking" style={rootStyle}>
    <header className="meron-nav"><a href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : null}{applicationName}</a><button type="button" className="meron-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}><span>{chrome.modeName(mode)}</span><i aria-hidden="true"></i></button><a href={publicRoot}>{chrome.t("backToSite")}</a></header>
    <section><div><h1>{localized(booking.title, locale)}</h1><p>{localized(booking.body, locale)}</p>{bookingPath && cta ? <a className="meron-button" href={bookingPath}>{cta.label}</a> : null}</div>{image ? <img src={image.src} alt={image.alt} /> : null}</section>
  </main>;
}
