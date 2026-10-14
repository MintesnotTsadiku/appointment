import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";

import { fetchPublishedSnapshot } from "@/public-experience/api";
import { PublicExperienceProvider, usePublicExperience } from "@/public-experience/PublicExperienceProvider";
import { publicRootForSlug } from "@/public-experience/routes";
import { getTemplatePackage } from "@/public-experience/templates/registry";
import type { PublishedSnapshot } from "@/public-experience/types";
import { PublicLoading, PublicUnavailable } from "@/public-experience/PublicStates";
import { previewState } from "@/components/booking-states";
import "@/public-experience/platform.css";

function BookingHandoff({ snapshot, slug }: { snapshot: PublishedSnapshot; slug?: string }) {
  const { config, theme, setPreference, refresh, isLoading, error } = usePublicExperience();
  const rootStyle = theme.variables as CSSProperties;
  const siteRoot = publicRootForSlug(slug);
  const publicRoot = snapshot.locale && snapshot.locale !== "en" ? `${siteRoot}/${snapshot.locale}` : siteRoot;
  const template = getTemplatePackage(snapshot.compiledDesign.layout.rendererKey, snapshot.compiledDesign.layout.rendererVersion);
  if (isLoading || previewState() === "loading") {
    const Loading = template?.Loading;
    return Loading ? <div style={rootStyle}><Loading mode={theme.mode} locale={snapshot.locale} /></div> : <PublicLoading config={config} mode={theme.mode} />;
  }
  if (error) return <PublicUnavailable kind="error" config={config} mode={theme.mode} onRetry={refresh} />;
  if (!template) return <PublicUnavailable kind="unsupported" config={config} mode={theme.mode} />;
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

  if (!resolved) return <PublicLoading />;
  if (!snapshot) return <PublicUnavailable kind="booking-unavailable" />;
  return (
    <PublicExperienceProvider locale={snapshot.locale}>
      <BookingHandoff snapshot={snapshot} slug={slug} />
    </PublicExperienceProvider>
  );
};

export default PublicBookingPage;
