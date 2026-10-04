import type { BookingTemplateProps, TemplateProps } from "../types";
import { action, brandLogo, contentImage, designImage, durationMinutes, formatPrice, localized, records, section, sectionImage } from "../content";
import { usePublicChrome } from "../chrome";
import "./selam.css";
import { SelamNewsletter } from "./SelamNewsletter";

const Mark = () => <span className="selam-mark" aria-hidden="true">✳</span>;

export function SelamSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const benefits = section(snapshot.sections, "benefits");
  const providers = section(snapshot.sections, "providers");
  const process = section(snapshot.sections, "process");
  const testimonials = section(snapshot.sections, "testimonials");
  const about = section(snapshot.sections, "about");
  const faq = section(snapshot.sections, "faq");
  const locations = section(snapshot.sections, "locations");
  const booking = section(snapshot.sections, "booking_cta");
  const footer = section(snapshot.sections, "footer");
  const primary = action(hero.primaryAction, locale);
  const secondary = action(hero.secondaryAction, locale);
  const finalAction = action(booking.action, locale);
  const heroImage = designImage(design, "hero.primary");
  const detailImage = designImage(design, "section.detail");
  const aboutImage = sectionImage(about, locale, design);
  const location = records(locations.items)[0];
  const locationImage = location ? contentImage(location, locale) : null;
  const logo = brandLogo(design);

  return <div data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="selam-site" data-template="selam-movement-v1" style={rootStyle}>
    <header className="selam-nav">
      <a className="selam-logo" href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : <Mark />} <strong>{applicationName}</strong></a>
      <nav aria-label={chrome.t("navLabel")}><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a><a href="#sessions">{chrome.t("services")}</a><a href="#people">{chrome.t("team")}</a><a href="#contact">{chrome.t("visit")}</a></nav>
      {primary ? <a className="selam-pill" href={primary.href}>{primary.label}</a> : null}
      <button type="button" className="selam-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}><span aria-hidden="true">{mode === "dark" ? "☀" : "☾"}</span><span>{chrome.modeName(mode)}</span></button>
    </header>
    <main>
      <section className="selam-hero">
        <div className="selam-hero-copy">
          {localized(hero.eyebrow, locale) ? <p className="selam-overline">{localized(hero.eyebrow, locale)}</p> : null}
          <h1>{localized(hero.title, locale)}</h1>
          <p>{localized(hero.subtitle || hero.body, locale)}</p>
          <div className="selam-actions">{primary ? <a className="selam-pill" href={primary.href}>{primary.label}</a> : null}{secondary ? <a className="selam-link" href={secondary.href}>{secondary.label}</a> : null}</div>
        </div>
        <div className="selam-hero-art">{heroImage ? <img src={heroImage.src} alt={heroImage.alt} /> : null}</div>
      </section>
      <section className="selam-schedule" id="sessions">
        <div className="selam-heading-row"><h2>{localized(services.title, locale)}</h2></div>
        {records(services.items).map((item, index) => {
          const minutes = durationMinutes(item.durationMinutes);
          const itemAction = action(item.action, locale) || primary;
          return <article key={index}>
            <div><h3>{localized(item.name, locale)}</h3><p>{localized(item.summary, locale)}</p></div>
            <span>{minutes ? chrome.t("minutes", { count: minutes }) : null}</span>
            <span>{formatPrice(item.price, item.currency, locale)}</span>
            {itemAction ? <a href={itemAction.href}>{itemAction.label}</a> : null}
          </article>;
        })}
      </section>
      <section className="selam-belong"><h2>{localized(benefits.title, locale)}</h2><div>{records(benefits.items).map((item, index) => <article key={index}><b aria-hidden="true">{["♧", "♡", "◇"][index % 3]}</b><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></article>)}</div></section>
      <section className="selam-people" id="people"><div><h2>{localized(providers.title, locale)}</h2><p>{localized(providers.intro, locale)}</p></div><div className="selam-team">{records(providers.items).map((item, index) => {
        const photo = contentImage(item, locale);
        return <article key={index}>{photo ? <img src={photo.src} alt={photo.alt || localized(item.name, locale)} /> : null}<h3>{localized(item.name, locale)}</h3><p>{localized(item.role, locale)}</p></article>;
      })}</div></section>
      <section className="selam-first">{detailImage ? <img src={detailImage.src} alt={detailImage.alt} /> : null}<div><h2>{localized(process.title, locale)}</h2>{records(process.items).map((item, index) => <article key={index}><b>{String(item.step || index + 1)}</b><div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div></article>)}</div></section>
      <section className="selam-quotes">{records(testimonials.items).slice(0, 2).map((item, index) => <blockquote key={index}>“{localized(item.quote, locale)}”<cite>{localized(item.attribution, locale)}</cite></blockquote>)}</section>
      <section className="selam-community">{aboutImage ? <img src={aboutImage.src} alt={aboutImage.alt} /> : null}<div><h2>{localized(about.title, locale)}</h2><p>{localized(about.body, locale)}</p></div><div className="selam-faq" id="faq"><h2>{localized(faq.title, locale)}</h2>{records(faq.items).map((item, index) => <details key={index}><summary>{localized(item.question, locale)}</summary><p>{localized(item.answer, locale)}</p></details>)}</div></section>
      <section className="selam-location" id="contact"><div><h2>{localized(locations.title, locale)}</h2>{location ? <address>{localized(location.address, locale)}<br />{localized(location.hours, locale)}<br />{String(location.phone || "")}</address> : null}</div>{locationImage ? <img src={locationImage.src} alt={locationImage.alt} /> : null}</section>
      <section className="selam-final"><h2>{localized(booking.title, locale)}</h2>{finalAction ? <a className="selam-pill" href={finalAction.href}>{finalAction.label}</a> : null}</section>
    <SelamNewsletter snapshot={snapshot} applicationName={applicationName} locale={locale} publicRoot={publicRoot} /></main>
    <footer className="selam-footer"><a className="selam-logo" href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : <Mark />} <strong>{applicationName}</strong></a>{localized(footer.body, locale) ? <span>{localized(footer.body, locale)}</span> : null}<small>© {new Date().getFullYear()} {applicationName}</small></footer>
  </div>;
}

export function SelamBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const booking = section(snapshot.sections, "booking_cta");
  const cta = action(booking.action, locale);
  const image = designImage(design, "hero.primary");
  const logo = brandLogo(design);
  return <main data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="selam-site selam-booking" style={rootStyle}>
    <header className="selam-nav"><a className="selam-logo" href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : <Mark />} <strong>{applicationName}</strong></a><button type="button" className="selam-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}><span aria-hidden="true">{mode === "dark" ? "☀" : "☾"}</span><span>{chrome.modeName(mode)}</span></button><a href={publicRoot}>{chrome.t("backToSite")}</a></header>
    <section><div><h1>{localized(booking.title, locale)}</h1><p>{localized(booking.body, locale)}</p>{bookingPath && cta ? <a className="selam-pill" href={bookingPath}>{cta.label}</a> : null}</div>{image ? <img src={image.src} alt={image.alt} /> : null}</section>
  </main>;
}
