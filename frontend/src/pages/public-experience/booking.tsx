import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";

import { fetchPublishedSnapshot } from "@/public-experience/api";
import { PublicExperienceProvider, usePublicExperience } from "@/public-experience/PublicExperienceProvider";
import { publicRootForSlug } from "@/public-experience/routes";
import { localized } from "@/public-experience/sections";
import type { PublishedSnapshot } from "@/public-experience/types";
import "@/public-experience/quiet-trust.css";

function BookingHandoff({ snapshot, slug }: { snapshot: PublishedSnapshot; slug?: string }) {
  const { config, theme } = usePublicExperience();
  const hero = snapshot.sections.find((section) => section.type === "hero");
  const title = localized(hero?.content.title, snapshot.locale) || config.identity.applicationName;
  const subtitle = localized(hero?.content.subtitle, snapshot.locale);
  const asset = snapshot.compiledDesign.assets["hero.primary"];
  const rootStyle = theme.variables as CSSProperties;
  const publicRoot = publicRootForSlug(slug);

  return (
    <main
      className="pe-page pe-booking-page"
      data-pe-booking
      data-pe-recipe={snapshot.recipeKey}
      data-pe-mode={theme.mode}
      style={rootStyle}
    >
      <div className="pe-topline">
        <header className="pe-nav pe-container">
          <a className="pe-brand" href={publicRoot} aria-label={`Back to ${config.identity.applicationName}`}>
            <span className="pe-brand-mark" aria-hidden="true">✦</span>
            <span>{config.identity.applicationName}</span>
          </a>
          <div className="pe-nav-meta"><span>{snapshot.locale}</span><a href={publicRoot}>Back to site</a></div>
        </header>
      </div>
      <section className="pe-container pe-booking-bridge">
        <div className="pe-booking-copy">
          <p className="pe-kicker">Choose your appointment</p>
          <h1>{title}</h1>
          {subtitle ? <p className="pe-booking-lead">{subtitle}</p> : null}
          <p className="pe-booking-note">Next, choose the service, provider and time that work for you.</p>
          {snapshot.bookingPath ? (
            <a data-cta="primary" href={snapshot.bookingPath} className="pe-button pe-button-primary">
              Continue to booking ↗
            </a>
          ) : (
            <p className="pe-booking-error">Booking is not available for this release.</p>
          )}
        </div>
        {asset ? (
          <div className="pe-booking-media">
            <img
              src={asset.src}
              alt={asset.alt}
              style={{ objectPosition: asset.focalPoint ? `${asset.focalPoint.x * 100}% ${asset.focalPoint.y * 100}%` : undefined }}
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}

const PublicBookingPage = () => {
  const { slug, locale } = useParams<{ slug: string; locale?: string }>();
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let active = true;
    fetchPublishedSnapshot(locale).then((next) => {
      if (active) { setSnapshot(next); setResolved(true); }
    });
    return () => { active = false; };
  }, [locale]);

  if (!resolved) return <div data-pe-loading className="p-8 text-sm">Loading public experience…</div>;
  if (!snapshot) {
    return (
      <main data-pe-unavailable className="mx-auto max-w-2xl p-8">
        <h1 className="text-2xl font-semibold">Booking unavailable</h1>
        <p className="mt-2 text-sm">This address does not have an active published release.</p>
      </main>
    );
  }
  return (
    <PublicExperienceProvider locale={snapshot.locale}>
      <BookingHandoff snapshot={snapshot} slug={slug} />
    </PublicExperienceProvider>
  );
};

export default PublicBookingPage;
