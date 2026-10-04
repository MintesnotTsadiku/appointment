import type { BookingTemplateProps, TemplateProps } from "../types";
import { action, brandLogo, contentImage, designImage, localized, records, section, sectionImage } from "../content";
import { usePublicChrome } from "../chrome";
import "./tena.css";
import { TenaNewsletter } from "./TenaNewsletter";

const Leaf = () => <span className="tena-leaf" aria-hidden="true">❧</span>;

export function TenaSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const benefits = section(snapshot.sections, "benefits");
  const providers = section(snapshot.sections, "providers");
  const process = section(snapshot.sections, "process");
  const testimonials = section(snapshot.sections, "testimonials");
  const proof = section(snapshot.sections, "proof");
  const faq = section(snapshot.sections, "faq");
  const locations = section(snapshot.sections, "locations");
  const booking = section(snapshot.sections, "booking_cta");
  const footer = section(snapshot.sections, "footer");
  const primary = action(hero.primaryAction, locale);
  const secondary = action(hero.secondaryAction, locale);
  const finalAction = action(booking.action, locale);
  const heroImage = designImage(design, "hero.primary");
  const detailImage = designImage(design, "section.detail");
  const logo = brandLogo(design);
  const location = records(locations.items)[0];
  const locationImage = location ? sectionImage(location, locale, design) : null;
  const story = records(testimonials.items)[0];

  return <div data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="tena-site" data-template="tena-clinic-v1" style={rootStyle}>
    <header className="tena-nav">
      <a href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : <Leaf />}<span>{applicationName}</span></a>
      <nav aria-label={chrome.t("navLabel")}><a href={`${publicRoot}/blog`}>{chrome.t("journal")}</a><a href={`${publicRoot}/gallery`}>{chrome.t("gallery")}</a><a href="#care">{chrome.t("services")}</a><a href="#team">{chrome.t("team")}</a><a href="#contact">{chrome.t("visit")}</a></nav>
      <button type="button" className="tena-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}><span aria-hidden="true">{mode === "dark" ? "☀" : "☾"}</span>{chrome.modeName(mode)}</button>
      {primary ? <a className="tena-button" href={primary.href}>{primary.label}</a> : null}
    </header>
    <main>
      <section className="tena-hero">
        <div>
          {localized(hero.eyebrow, locale) ? <p className="tena-label">{localized(hero.eyebrow, locale)}</p> : null}
          <h1>{localized(hero.title, locale)}</h1>
          <p>{localized(hero.subtitle || hero.body, locale)}</p>
          <div>{primary ? <a className="tena-button" href={primary.href}>{primary.label}</a> : null}{secondary ? <a href={secondary.href}>{secondary.label}</a> : null}</div>
        </div>
        {heroImage ? <img src={heroImage.src} alt={heroImage.alt} /> : null}
      </section>
      {records(proof.items).length ? <section className="tena-trust">{records(proof.items).slice(0, 3).map((item, index) => <span key={index}><Leaf />{localized(item.value, locale)} {localized(item.label, locale)}</span>)}</section> : null}
      <section className="tena-care" id="care">
        <header><h2>{localized(services.title, locale)}</h2></header>
        {localized(services.intro, locale) ? <p>{localized(services.intro, locale)}</p> : null}
        <div>{records(services.items).map((item, index) => <article key={index}><h3>{localized(item.name, locale)}</h3><p>{localized(item.summary, locale)}</p></article>)}</div>
      </section>
      <section className="tena-understand">
        {detailImage ? <img src={detailImage.src} alt={detailImage.alt} /> : null}
        <div><h2>{localized(benefits.title, locale)}</h2>{localized(benefits.intro, locale) ? <p>{localized(benefits.intro, locale)}</p> : null}{records(benefits.items).map((item, index) => <article key={index}><b aria-hidden="true">{["◌", "♧", "▤"][index % 3]}</b><div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div></article>)}</div>
      </section>
      <section className="tena-team" id="team">
        <header><h2>{localized(providers.title, locale)}</h2></header>
        <div>{records(providers.items).map((item, index) => {
          const photo = contentImage(item, locale);
          return <article key={index}>{photo ? <img src={photo.src} alt={photo.alt || localized(item.name, locale)} /> : null}<h3>{localized(item.name, locale)}</h3><p>{localized(item.role, locale)}</p></article>;
        })}</div>
      </section>
      <section className="tena-process"><h2>{localized(process.title, locale)}</h2><div>{records(process.items).map((item, index) => <article key={index}><b>{String(item.step || index + 1).padStart(2, "0")}</b><div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div></article>)}</div></section>
      {story ? <section className="tena-story">
        {detailImage ? <img src={detailImage.src} alt="" /> : null}
        <blockquote>{localized(testimonials.intro, locale) ? <p className="tena-label">{localized(testimonials.intro, locale)}</p> : null}“{localized(story.quote, locale)}”<cite>{localized(story.attribution, locale)}</cite></blockquote>
      </section> : null}
      <section className="tena-faq" id="faq"><div><h2>{localized(faq.title, locale)}</h2></div><div>{records(faq.items).map((item, index) => <details key={index}><summary><Leaf />{localized(item.question, locale)}<span aria-hidden="true">⌄</span></summary><p>{localized(item.answer, locale)}</p></details>)}</div></section>
      <section className="tena-visit" id="contact">
        <div><h2>{localized(locations.title, locale)}</h2>{localized(locations.intro, locale) ? <p>{localized(locations.intro, locale)}</p> : null}</div>
        {locationImage ? <img src={locationImage.src} alt={locationImage.alt} /> : null}
        {location ? <address><span>{localized(location.name, locale)}</span><b>{localized(location.address, locale)}</b>{localized(location.hours, locale)}{location.phone ? <a href={`tel:${String(location.phone)}`}>{String(location.phone)}</a> : null}</address> : null}
      </section>
      <section className="tena-final"><Leaf /><div><h2>{localized(booking.title, locale)}</h2>{localized(booking.body, locale) ? <p>{localized(booking.body, locale)}</p> : null}</div>{finalAction ? <a href={finalAction.href}>{finalAction.label}</a> : null}</section>
    <TenaNewsletter snapshot={snapshot} applicationName={applicationName} locale={locale} publicRoot={publicRoot} /></main>
    <footer className="tena-footer">
      <a href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : <Leaf />}<span>{applicationName}</span></a>
      {localized(footer.body, locale) ? <p>{localized(footer.body, locale)}</p> : null}
      <nav aria-label={chrome.t("navLabel")}><a href="#care">{chrome.t("services")}</a><a href="#contact">{chrome.t("visit")}</a><a href="#faq">{chrome.t("questions")}</a></nav>
      <small>© {new Date().getFullYear()} {applicationName}</small>
    </footer>
  </div>;
}

export function TenaBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const chrome = usePublicChrome(locale);
  const design = snapshot.compiledDesign;
  const booking = section(snapshot.sections, "booking_cta");
  const cta = action(booking.action, locale);
  const image = designImage(design, "section.detail");
  const logo = brandLogo(design);
  return <main data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="tena-site tena-booking" style={rootStyle}>
    <header className="tena-nav"><a href={publicRoot}>{logo ? <img className="pe-brand-logo" src={logo} alt="" /> : <Leaf />}<span>{applicationName}</span></a><button type="button" className="tena-mode" onClick={toggleMode} aria-label={chrome.modeSwitchLabel(mode)}><span aria-hidden="true">{mode === "dark" ? "☀" : "☾"}</span>{chrome.modeName(mode)}</button><a href={publicRoot}>{chrome.t("backToSite")}</a></header>
    <section><div><h1>{localized(booking.title, locale)}</h1><p>{localized(booking.body, locale)}</p>{bookingPath && cta ? <a className="tena-button" href={bookingPath}>{cta.label}</a> : null}</div>{image ? <img src={image.src} alt={image.alt} /> : null}</section>
  </main>;
}
