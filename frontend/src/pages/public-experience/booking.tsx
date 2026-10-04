import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";

import { fetchPublishedSnapshot } from "@/public-experience/api";
import { PublicExperienceProvider, usePublicExperience } from "@/public-experience/PublicExperienceProvider";
import { publicRootForSlug } from "@/public-experience/routes";
import { getTemplatePackage } from "@/public-experience/templates/registry";
import type { PublishedSnapshot } from "@/public-experience/types";
import "@/public-experience/platform.css";

function BookingHandoff({ snapshot, slug }: { snapshot: PublishedSnapshot; slug?: string }) {
  const { config, theme, setPreference, isLoading, error } = usePublicExperience();
  const rootStyle = theme.variables as CSSProperties;
  const siteRoot = publicRootForSlug(slug);
  const publicRoot = snapshot.locale && snapshot.locale !== "en" ? `${siteRoot}/${snapshot.locale}` : siteRoot;
  const template = getTemplatePackage(snapshot.compiledDesign.layout.rendererKey, snapshot.compiledDesign.layout.rendererVersion);
  if (isLoading) return <div data-pe-loading role="status" className="p-8">Loading published design…</div>;
  if (error) return <main data-pe-unavailable className="p-8"><h1>Booking unavailable</h1><p>Please try again later.</p></main>;
  if (!template) return <main data-pe-unsupported className="p-8">Unsupported public template</main>;
  const BookingTemplate = template.Booking;
  return <BookingTemplate
    snapshot={snapshot}
    locale={snapshot.locale}
    applicationName={config.identity.applicationName}
    publicRoot={publicRoot}
    rootStyle={rootStyle}
    bookingPath={snapshot.bookingPath}
    mode={theme.mode}
    toggleMode={() => setPreference(theme.mode === "dark" ? "light" : "dark")}
  />;
}

const PublicBookingPage = () => {
  const { slug, locale: pathLocale } = useParams<{ slug: string; locale?: string }>();
  // The handoff keeps the landing page's language; see localeHref in the template content contract.
  const locale = pathLocale || new URLSearchParams(window.location.search).get("locale") || undefined;
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
