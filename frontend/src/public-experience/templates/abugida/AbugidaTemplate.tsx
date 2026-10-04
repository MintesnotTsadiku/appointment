import type { BookingTemplateProps, TemplateProps } from "../types";
import { action, brandLogo, contentImage, designImage, durationMinutes, formatPrice, localized, records, section } from "../content";
import { usePublicChrome } from "../chrome";
import "./abugida.css";
import { AbugidaNewsletter } from "./AbugidaNewsletter";

export function AbugidaSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
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
  const quote = records(testimonials.items)[0];
  const brand = <>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : null}<span>{applicationName}</span></>;

  return <div data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="abugida-site" data-template="abugida-language-v1" style={rootStyle}>
    <header className="abugida-nav">
      <a href={publicRoot}>{brand}</a>
      <nav aria-label={chrome.t("navLabel")}><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a><a href="#practice">{chrome.t("services")}</a><a href="#coaches">{chrome.t("team")}</a><a href="#contact">{chrome.t("visit")}</a></nav>
      <button type="button" className="abugida-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}><span aria-hidden="true">{mode === "dark" ? "☀" : "◐"}</span>{chrome.modeName(mode)}</button>
      {primary ? <a href={primary.href}>{primary.label}</a> : null}
    </header>
    <main>
      <section className="abugida-hero">
        <div className="abugida-number" aria-hidden="true"></div>
        <div>
          {localized(hero.eyebrow, locale) ? <p className="abugida-label">{localized(hero.eyebrow, locale)}</p> : null}
          <h1>{localized(hero.title, locale)}</h1>
          <p>{localized(hero.subtitle || hero.body, locale)}</p>
          {primary ? <a className="abugida-button" href={primary.href}>{primary.label}</a> : null}
        </div>
        <figure>{heroImage ? <img src={heroImage.src} alt={heroImage.alt} /> : null}</figure>
      </section>
      <section className="abugida-practice" id="practice">
        <header><h2>{localized(services.title, locale)}</h2><p>{localized(services.intro, locale)}</p></header>
        <div>{records(services.items).map((item, index) => {
          const minutes = durationMinutes(item.durationMinutes);
          return <article key={index}><span aria-hidden="true"></span><h3>{localized(item.name, locale)}</h3><p>{localized(item.summary, locale)}</p><footer>{minutes ? <b>{chrome.t("minutes", { count: minutes })}</b> : null}<b>{formatPrice(item.price, item.currency, locale)}</b></footer></article>;
        })}</div>
      </section>
      <section className="abugida-method">
        <figure>{detailImage ? <img src={detailImage.src} alt={detailImage.alt} /> : null}</figure>
        <div><h2>{localized(benefits.title, locale)}</h2>{records(benefits.items).map((item, index) => <article key={index}><b aria-hidden="true">✓</b><div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div></article>)}</div>
      </section>
      <section className="abugida-coaches" id="coaches">
        <div><h2>{localized(providers.title, locale)}</h2></div>
        <div>{records(providers.items).map((item, index) => {
          const photo = contentImage(item, locale);
          return <article key={index}>{photo ? <img src={photo.src} alt={photo.alt || localized(item.name, locale)} /> : null}<span><b>{localized(item.name, locale)}</b>{localized(item.role, locale)}</span></article>;
        })}</div>
      </section>
      <section className="abugida-process"><h2>{localized(process.title, locale)}</h2><div>{records(process.items).map((item, index) => <article key={index}><b>{String(item.step || index + 1).padStart(2, "0")}</b><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></article>)}</div></section>
      {quote ? <section className="abugida-quote"><blockquote>“{localized(quote.quote, locale)}”<cite>{localized(quote.attribution, locale)}</cite></blockquote>{detailImage ? <img src={detailImage.src} alt="" /> : null}</section> : null}
      <section className="abugida-questions" id="faq"><div><h2>{localized(faq.title, locale)}</h2></div><div>{records(faq.items).map((item, index) => <details key={index}><summary>{localized(item.question, locale)}<span aria-hidden="true">+</span></summary><p>{localized(item.answer, locale)}</p></details>)}</div></section>
      <section className="abugida-rooms" id="contact">{locationImage ? <img src={locationImage.src} alt={locationImage.alt} /> : null}<div><h2>{localized(locations.title, locale)}</h2>{location ? <address>{localized(location.address, locale)}<br />{localized(location.hours, locale)}<br />{String(location.phone || "")}</address> : null}{finalAction ? <a className="abugida-button" href={finalAction.href}>{finalAction.label}</a> : null}</div></section>
    <AbugidaNewsletter snapshot={snapshot} applicationName={applicationName} locale={locale} publicRoot={publicRoot} /></main>
    <footer className="abugida-footer"><a href={publicRoot}>{brand}</a>{localized(footer.body, locale) ? <p>{localized(footer.body, locale)}</p> : null}<small>© {new Date().getFullYear()} {applicationName}</small></footer>
  </div>;
}

export function AbugidaBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const booking = section(snapshot.sections, "booking_cta");
  const cta = action(booking.action, locale);
  const image = designImage(design, "hero.primary");
  const logo = brandLogo(design);
  return <main data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="abugida-site abugida-booking" style={rootStyle}>
    <header className="abugida-nav"><a href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : null}<span>{applicationName}</span></a><button type="button" className="abugida-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}><span aria-hidden="true">{mode === "dark" ? "☀" : "◐"}</span>{chrome.modeName(mode)}</button><a href={publicRoot}>{chrome.t("backToSite")}</a></header>
    <section><div><h1>{localized(booking.title, locale)}</h1><p>{localized(booking.body, locale)}</p>{bookingPath && cta ? <a className="abugida-button" href={bookingPath}>{cta.label}</a> : null}</div>{image ? <img src={image.src} alt={image.alt} /> : null}</section>
  </main>;
}
