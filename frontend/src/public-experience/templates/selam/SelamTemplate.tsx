import type { BookingTemplateProps, TemplateProps } from "../types";
import { action, asset, localized, records, section, supportAsset } from "../content";
import "./selam.css";

const Mark = () => <span className="selam-mark" aria-hidden="true">✳</span>;

export function SelamSite({ snapshot, locale, applicationName, publicRoot, rootStyle, mode, toggleMode }: TemplateProps) {
  const hero = section(snapshot.sections, "hero");
  const services = section(snapshot.sections, "services");
  const benefits = section(snapshot.sections, "benefits");
  const providers = section(snapshot.sections, "providers");
  const process = section(snapshot.sections, "process");
  const testimonials = section(snapshot.sections, "testimonials");
  const faq = section(snapshot.sections, "faq");
  const locations = section(snapshot.sections, "locations");
  const booking = section(snapshot.sections, "booking_cta");
  const primary = action(hero.primaryAction, locale);
  const secondary = action(hero.secondaryAction, locale);
  const heroAsset = asset(snapshot.compiledDesign, "hero.primary");

  return <div data-pe-root data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="selam-site" data-template="selam-movement-v1" style={rootStyle}>
    <header className="selam-nav">
      <a className="selam-logo" href={publicRoot}><Mark /> <strong>{applicationName}</strong></a>
      <nav><a href="#sessions">Move</a><a href="#people">Learn</a><a href="#space">Our space</a></nav>
      {primary ? <a className="selam-pill" href={primary.href}>Book a session <span>→</span></a> : null}
      <button type="button" className="selam-mode" onClick={toggleMode} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}><span aria-hidden="true">{mode === "dark" ? "☀" : "☾"}</span><span>{mode === "dark" ? "Light" : "Dark"}</span></button>
    </header>
    <main>
      <section className="selam-hero">
        <div className="selam-hero-copy">
          <p className="selam-overline">A brighter, kinder you</p>
          <h1>{localized(hero.title, locale)}</h1>
          <p>{localized(hero.subtitle || hero.body, locale)}</p>
          <div className="selam-actions">{primary ? <a className="selam-pill" href={primary.href}>{primary.label} →</a> : null}{secondary ? <a className="selam-link" href={secondary.href}>{secondary.label} →</a> : null}</div>
          <small>Move together. Grow together.</small>
        </div>
        <div className="selam-hero-art">
          {heroAsset ? <img src={heroAsset.src} alt={heroAsset.alt} /> : null}
          <span className="selam-badge">All levels<br />welcome</span>
          <img className="selam-inset" src={supportAsset("selam", 3)} alt="A small wellness group sharing a calm moment" />
        </div>
      </section>
      <section className="selam-schedule" id="sessions">
        <div className="selam-heading-row"><h2>Make a little time for yourself.</h2>{primary ? <a href={primary.href}>View full timetable →</a> : null}</div>
        {records(services.items).map((item, index) => <article key={index}>
          <time><b>{index % 2 ? "TUE" : "MON"}</b><strong>{12 + index}</strong></time>
          <div><h3>{localized(item.name, locale)}</h3><p>{localized(item.summary, locale)}</p></div>
          <span>{index ? "12:30" : "09:00"} · {String(item.durationMinutes || 50)} min</span>
          <span className="selam-spots">● {6 - index * 2} spots left</span>
          {primary ? <a href={primary.href}>Book</a> : null}
        </article>)}
      </section>
      <section className="selam-offerings">
        <p className="selam-overline">Our offerings</p><h2>{localized(services.title, locale)}</h2>
        <div className="selam-photo-grid">{records(services.items).map((item, index) => <article key={index}>
          <div className="selam-photo"><img src={supportAsset("selam", (index % 3) + 1)} alt="" /><span>{["↗", "✿", "◉"][index % 3]}</span></div>
          <h3>{localized(item.name, locale)}</h3><p>{localized(item.summary, locale)}</p>{primary ? <a href={primary.href}>Explore →</a> : null}
        </article>)}</div>
      </section>
      <section className="selam-belong"><p className="selam-overline">Why {applicationName}</p><h2>{localized(benefits.title, locale)}</h2><div>{records(benefits.items).map((item, index) => <article key={index}><b>{["♧", "♡", "◇"][index % 3]}</b><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></article>)}</div></section>
      <section className="selam-people" id="people"><div><p className="selam-overline">Our team</p><h2>{localized(providers.title, locale)}</h2><p>{localized(providers.intro, locale)}</p></div><div className="selam-team">{records(providers.items).map((item, index) => <article key={index}><img src={supportAsset("selam", index === 0 ? 1 : 3)} alt="" /><h3>{localized(item.name, locale)}</h3><p>{localized(item.role, locale)}</p></article>)}</div></section>
      <section className="selam-first"><img src={supportAsset("selam", 2)} alt="The light-filled movement studio" /><div><p className="selam-overline">The {applicationName} experience</p><h2>{localized(process.title, locale)}</h2>{records(process.items).map((item, index) => <article key={index}><b>0{index + 1}</b><div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div></article>)}</div></section>
      <section className="selam-quotes">{records(testimonials.items).slice(0, 2).map((item, index) => <blockquote key={index}>“{localized(item.quote, locale)}”<cite>— {localized(item.attribution, locale)}</cite></blockquote>)}</section>
      <section className="selam-community"><img src={supportAsset("selam", 3)} alt="A welcoming studio community" /><div><p className="selam-overline">Our community</p><h2>Good things happen together.</h2><p>{localized(hero.body, locale)}</p></div><div className="selam-faq"><p className="selam-overline">Frequently asked questions</p>{records(faq.items).map((item, index) => <details key={index}><summary>{localized(item.question, locale)}</summary><p>{localized(item.answer, locale)}</p></details>)}</div></section>
      <section className="selam-location" id="space"><div><p className="selam-overline">Our location</p><h2>{localized(locations.title, locale)}</h2>{records(locations.items).slice(0, 1).map((item, index) => <address key={index}>{localized(item.address, locale)}<br />{localized(item.hours, locale)}<br />{String(item.phone || "")}</address>)}</div><img src={supportAsset("selam", 2)} alt="The Gerji studio" /></section>
      <section className="selam-final"><h2>{localized(booking.title, locale)}</h2>{action(booking.action, locale) ? <a className="selam-pill" href={action(booking.action, locale)?.href}>{action(booking.action, locale)?.label} →</a> : null}</section>
    </main>
    <footer className="selam-footer"><a className="selam-logo" href={publicRoot}><Mark /> <strong>{applicationName}</strong></a><span>Move. Learn. Belong.</span><small>© {new Date().getFullYear()} {applicationName}</small></footer>
  </div>;
}

export function SelamBooking({ snapshot, locale, applicationName, publicRoot, rootStyle, bookingPath, mode, toggleMode }: BookingTemplateProps) {
  const hero = section(snapshot.sections, "hero");
  return <main data-pe-booking data-pe-recipe={snapshot.recipeKey} data-pe-mode={mode} className="selam-site selam-booking" style={rootStyle}><header className="selam-nav"><a className="selam-logo" href={publicRoot}><Mark /> <strong>{applicationName}</strong></a><button type="button" className="selam-mode" onClick={toggleMode} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}><span aria-hidden="true">{mode === "dark" ? "☀" : "☾"}</span><span>{mode === "dark" ? "Light" : "Dark"}</span></button><a href={publicRoot}>Back to site</a></header><section><div><p className="selam-overline">Choose your appointment</p><h1>{localized(hero.title, locale)}</h1><p>{localized(hero.subtitle, locale)}</p>{bookingPath ? <a className="selam-pill" href={bookingPath}>Continue to booking →</a> : null}</div><img src={supportAsset("selam", 1)} alt="Movement session" /></section></main>;
}
