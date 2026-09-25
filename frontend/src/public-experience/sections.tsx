import type { ReactNode } from "react";

import type { CompiledDesign, LocalizedText, PublicAction, PublicSection } from "./types";

const LINK_RE = /^(https?:\/\/|mailto:|tel:|\/)[^\s<>"']*$/;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.map(record) : [];
}

export function localized(value: unknown, locale: string): string {
  const source = record(value) as LocalizedText;
  return source[locale] || source.en || Object.values(source)[0] || "";
}

export function safeHref(value: unknown): string | undefined {
  return typeof value === "string" && LINK_RE.test(value) ? value : undefined;
}

function action(value: unknown): PublicAction | null {
  const item = record(value);
  const href = safeHref(item.href);
  const label = record(item.label) as LocalizedText;
  if (!href || !item.intent || !item.placement || !Object.keys(label).length) return null;
  return {
    intent: String(item.intent),
    label,
    placement: item.placement as PublicAction["placement"],
    href,
  };
}

function ActionLink({
  value,
  locale,
  className = "pe-button pe-button-secondary",
}: {
  value: unknown;
  locale: string;
  className?: string;
}) {
  const item = action(value);
  if (!item) return null;
  return (
    <a className={className} href={item.href} data-action-intent={item.intent}>
      {localized(item.label, locale)}
    </a>
  );
}

function SectionHeading({ content, locale, eyebrow }: { content: Record<string, unknown>; locale: string; eyebrow?: string }) {
  return (
    <div className="pe-section-heading">
      {eyebrow ? <p className="pe-kicker">{eyebrow}</p> : null}
      <h2>{localized(content.title, locale)}</h2>
      {content.intro ? <p>{localized(content.intro, locale)}</p> : null}
      {content.body && !content.intro ? <p>{localized(content.body, locale)}</p> : null}
    </div>
  );
}

function AssetImage({
  design,
  role,
  className,
  priority = false,
}: {
  design: CompiledDesign;
  role: string;
  className?: string;
  priority?: boolean;
}) {
  const asset = design.assets[role] || design.assets["section.detail"] || design.assets["hero.primary"];
  if (!asset) return null;
  return (
    <img
      className={className}
      src={asset.src}
      alt={asset.alt}
      loading={priority ? "eager" : "lazy"}
      style={{ objectPosition: asset.focalPoint ? String(asset.focalPoint.x * 100) + "% " + String(asset.focalPoint.y * 100) + "%" : undefined }}
    />
  );
}

function Hero({ content, design, locale }: { content: Record<string, unknown>; design: CompiledDesign; locale: string }) {
  return (
    <section className="pe-hero pe-container" data-section="hero">
      <div className="pe-hero-copy">
        {content.eyebrow ? <p className="pe-kicker">{localized(content.eyebrow, locale)}</p> : null}
        <h1>{localized(content.title, locale)}</h1>
        {content.subtitle ? <p className="pe-hero-subtitle">{localized(content.subtitle, locale)}</p> : null}
        {content.body ? <p className="pe-hero-body">{localized(content.body, locale)}</p> : null}
        <div className="pe-actions">
          <ActionLink value={content.primaryAction} locale={locale} className="pe-button pe-button-primary" />
          <ActionLink value={content.secondaryAction} locale={locale} className="pe-button pe-button-secondary" />
        </div>
        <p className="pe-hero-note">A clear next step, with time to ask questions.</p>
      </div>
      <div className="pe-hero-media">
        <AssetImage design={design} role={typeof content.imageRole === "string" ? content.imageRole : "hero.primary"} priority />
        <div className="pe-image-caption">{String(design.assets["hero.primary"]?.provenance?.role || "A considered place to begin")}</div>
      </div>
    </section>
  );
}

function Services({ content, locale }: { content: Record<string, unknown>; locale: string }) {
  return (
    <section className="pe-section pe-container" data-section="services">
      <SectionHeading content={content} locale={locale} eyebrow="What we offer" />
      <div className="pe-service-grid">
        {list(content.items).map((item, index) => (
          <article className="pe-service-card" key={String(item.id || index)}>
            <span className="pe-card-index">{String(index + 1).padStart(2, "0")}</span>
            <h3>{localized(item.name, locale)}</h3>
            <p>{localized(item.summary, locale)}</p>
            <div className="pe-fact-row">
              {item.durationMinutes ? <span>{String(item.durationMinutes)} min</span> : null}
              {item.price !== undefined && item.price !== null ? <span>{String(item.currency || "ETB")} {String(item.price)}</span> : null}
            </div>
            <ActionLink value={item.action} locale={locale} className="pe-inline-action" />
          </article>
        ))}
      </div>
    </section>
  );
}

function Providers({ content, design, locale }: { content: Record<string, unknown>; design: CompiledDesign; locale: string }) {
  return (
    <section className="pe-section pe-section-tint pe-container" data-section="providers">
      <SectionHeading content={content} locale={locale} eyebrow="The people beside you" />
      <div className="pe-provider-grid">
        {list(content.items).map((item, index) => (
          <article className="pe-provider-card" key={String(item.id || index)}>
            <div className="pe-provider-avatar">
              <AssetImage design={design} role={typeof item.imageRole === "string" ? item.imageRole : "section.detail"} />
            </div>
            <div>
              <h3>{localized(item.name, locale)}</h3>
              {item.role ? <p className="pe-muted">{localized(item.role, locale)}</p> : null}
              <div className="pe-chip-list">
                {Array.isArray(item.specialties) ? item.specialties.slice(0, 3).map((specialty, specialtyIndex) => (
                  <span className="pe-chip" key={specialtyIndex}>{localized(specialty, locale)}</span>
                )) : null}
              </div>
            </div>
            <ActionLink value={item.action} locale={locale} className="pe-inline-action" />
          </article>
        ))}
      </div>
    </section>
  );
}

function Process({ content, locale }: { content: Record<string, unknown>; locale: string }) {
  return (
    <section className="pe-section pe-container" data-section="process">
      <SectionHeading content={content} locale={locale} eyebrow="A gentler process" />
      <ol className="pe-process-list">
        {list(content.items).map((item, index) => (
          <li key={index}>
            <span className="pe-process-number">{String(item.step || index + 1).padStart(2, "0")}</span>
            <div><h3>{localized(item.title, locale)}</h3><p>{localized(item.description, locale)}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Benefits({ content, locale }: { content: Record<string, unknown>; locale: string }) {
  return (
    <section className="pe-section pe-section-dark pe-container" data-section="benefits">
      <SectionHeading content={content} locale={locale} eyebrow="Why it feels different" />
      <div className="pe-benefit-grid">
        {list(content.items).map((item, index) => (
          <article className="pe-benefit-card" key={index}>
            <span className="pe-benefit-icon" aria-hidden="true">{String(item.icon || "✦")}</span>
            <h3>{localized(item.title, locale)}</h3>
            <p>{localized(item.description, locale)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Testimonials({ content, locale }: { content: Record<string, unknown>; locale: string }) {
  return (
    <section className="pe-section pe-container" data-section="testimonials">
      <SectionHeading content={content} locale={locale} eyebrow="Words from clients" />
      <div className="pe-testimonial-grid">
        {list(content.items).map((item, index) => (
          <figure className="pe-testimonial" key={index}>
            <blockquote>“{localized(item.quote, locale)}”</blockquote>
            <figcaption>
              <strong>{localized(item.attribution, locale)}</strong>
              {item.role ? <span>{localized(item.role, locale)}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Proof({ content, locale }: { content: Record<string, unknown>; locale: string }) {
  return (
    <section className="pe-proof pe-container" data-section="proof">
      {list(content.items).map((item, index) => (
        <div className="pe-proof-item" key={index}>
          <span>{localized(item.label, locale)}</span>
          <strong>{localized(item.value, locale)}</strong>
          {item.detail ? <small>{localized(item.detail, locale)}</small> : null}
        </div>
      ))}
    </section>
  );
}

function Locations({ content, locale }: { content: Record<string, unknown>; locale: string }) {
  return (
    <section className="pe-section pe-container" data-section="locations">
      <SectionHeading content={content} locale={locale} eyebrow="Come as you are" />
      <div className="pe-location-grid">
        {list(content.items).map((item, index) => (
          <article className="pe-location-card" key={String(item.id || index)}>
            <p className="pe-card-index">{String(index + 1).padStart(2, "0")}</p>
            <h3>{localized(item.name, locale)}</h3>
            <p>{localized(item.address, locale)}</p>
            {item.hours ? <p className="pe-muted">{localized(item.hours, locale)}</p> : null}
            {item.phone ? <p className="pe-phone">{String(item.phone)}</p> : null}
            <ActionLink value={item.directionsAction} locale={locale} className="pe-inline-action" />
          </article>
        ))}
      </div>
    </section>
  );
}

function About({ content, design, locale }: { content: Record<string, unknown>; design: CompiledDesign; locale: string }) {
  const highlights = Array.isArray(content.highlights) ? content.highlights : [];
  return (
    <section className="pe-about pe-container" data-section="about">
      <div className="pe-about-media"><AssetImage design={design} role={typeof content.imageRole === "string" ? content.imageRole : "section.detail"} /></div>
      <div className="pe-about-copy">
        <SectionHeading content={content} locale={locale} eyebrow="A little more about us" />
        <div className="pe-highlight-list">
          {highlights.map((item, index) => <span key={index}>{localized(item, locale)}</span>)}
        </div>
      </div>
    </section>
  );
}

function FAQ({ content, locale }: { content: Record<string, unknown>; locale: string }) {
  return (
    <section className="pe-section pe-container" data-section="faq" id="faq">
      <SectionHeading content={content} locale={locale} eyebrow="Good to know" />
      <div className="pe-faq-list">
        {list(content.items).map((item, index) => (
          <details key={index} open={index === 0}>
            <summary>{localized(item.question, locale)}</summary>
            <p>{localized(item.answer, locale)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Contact({ content, locale }: { content: Record<string, unknown>; locale: string }) {
  return (
    <section className="pe-contact pe-container" data-section="contact" id="contact">
      <div><SectionHeading content={content} locale={locale} eyebrow="We are here" /></div>
      <div className="pe-contact-detail">
        {content.phone ? <a href={"tel:" + String(content.phone)}>{String(content.phone)}</a> : null}
        {content.email ? <a href={"mailto:" + String(content.email)}>{String(content.email)}</a> : null}
        <ActionLink value={content.action} locale={locale} className="pe-button pe-button-secondary" />
      </div>
    </section>
  );
}

function BookingCTA({ content, locale }: { content: Record<string, unknown>; locale: string }) {
  return (
    <section className="pe-booking-cta pe-container" data-section="booking_cta">
      <div><p className="pe-kicker">Make time for yourself</p><h2>{localized(content.title, locale)}</h2><p>{localized(content.body, locale)}</p></div>
      <ActionLink value={content.action} locale={locale} className="pe-button pe-button-primary" />
    </section>
  );
}

function Footer({ content, locale, applicationName }: { content: Record<string, unknown>; locale: string; applicationName: string }) {
  return (
    <footer className="pe-footer pe-container" data-section="footer">
      <div><p className="pe-footer-brand">{applicationName}</p>{content.body ? <p>{localized(content.body, locale)}</p> : null}</div>
      <div className="pe-footer-links">
        {list(content.items).map((item, index) => <ActionLink key={index} value={item.action} locale={locale} className="pe-footer-link" />)}
      </div>
    </footer>
  );
}

export function renderSection(section: PublicSection, locale: string, design: CompiledDesign, applicationName = ""): ReactNode {
  const content = record(section.content);
  switch (section.type) {
    case "hero": return <Hero content={content} design={design} locale={locale} />;
    case "services": return <Services content={content} locale={locale} />;
    case "providers": return <Providers content={content} design={design} locale={locale} />;
    case "process": return <Process content={content} locale={locale} />;
    case "benefits": return <Benefits content={content} locale={locale} />;
    case "testimonials": return <Testimonials content={content} locale={locale} />;
    case "proof": return <Proof content={content} locale={locale} />;
    case "locations": return <Locations content={content} locale={locale} />;
    case "about": return <About content={content} design={design} locale={locale} />;
    case "faq": return <FAQ content={content} locale={locale} />;
    case "contact": return <Contact content={content} locale={locale} />;
    case "booking_cta": return <BookingCTA content={content} locale={locale} />;
    case "footer": return <Footer content={content} locale={locale} applicationName={applicationName} />;
    default: return null;
  }
}
