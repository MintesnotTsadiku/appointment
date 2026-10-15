import { useEffect, useState, type CSSProperties } from "react";
import { useParams } from "react-router-dom";

import { fetchPublishedSnapshot, inlinePublishedSnapshot } from "@/public-experience/api";
import { PublicExperienceProvider, usePublicExperience } from "@/public-experience/PublicExperienceProvider";
import { publicRootForSlug, withBookingLanguage } from "@/public-experience/routes";
import { useTemplatePackage } from "@/public-experience/templates/registry";
import type { PublishedSnapshot } from "@/public-experience/types";
import { PublicLoading, PublicUnavailable } from "@/public-experience/PublicStates";
import { previewState } from "@/components/booking-states";
import "@/public-experience/platform.css";
import { siteName } from "@/lib/local-names";

/**
 * The next page is the scheduler: when the browser is idle, fetch this template's booking stylesheet, so the
 * scheduler shows its skin at once (each skin's CSS is its own small file, loaded on demand).
 */
function usePrefetchBookingSkin(design: PublishedSnapshot["compiledDesign"]) {
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((callback: () => void) => window.setTimeout(callback, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => {
      void import("@/public-experience/templates/booking-skin").then((skins) => skins.loadBookingSkinStyle(skins.bookingSkin(design)));
    });
    return () => cancel(handle);
  }, [design]);
}

function BookingHandoff({ snapshot: published, slug }: { snapshot: PublishedSnapshot; slug?: string }) {
  // The scheduler opens in the website's language.
  const snapshot = withBookingLanguage(published);
  const { config, theme, setPreference, refresh, isLoading, error } = usePublicExperience();
  const rootStyle = theme.variables as CSSProperties;
  const siteRoot = publicRootForSlug(slug);
  const publicRoot = snapshot.locale && snapshot.locale !== "en" ? `${siteRoot}/${snapshot.locale}` : siteRoot;
  const { template, status, retry } = useTemplatePackage(snapshot.compiledDesign.layout.rendererKey, snapshot.compiledDesign.layout.rendererVersion);
  usePrefetchBookingSkin(snapshot.compiledDesign);
  if (isLoading || status === "loading" || previewState() === "loading") {
    const Loading = template?.Loading;
    return Loading ? <div style={rootStyle}><Loading mode={theme.mode} locale={snapshot.locale} /></div> : <PublicLoading config={config} mode={theme.mode} />;
  }
  if (error) return <PublicUnavailable kind="error" config={config} mode={theme.mode} onRetry={refresh} />;
  if (status === "error") return <PublicUnavailable kind="error" config={config} mode={theme.mode} onRetry={retry} />;
  if (!template) return <PublicUnavailable kind="unsupported" config={config} mode={theme.mode} />;
  const BookingTemplate = template.Booking;
  return <BookingTemplate
    snapshot={snapshot}
    locale={snapshot.locale}
    applicationName={siteName(config.identity.applicationName, snapshot.localTitle?.am || config.identity.applicationNameAm, snapshot.locale)}
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
  // The shell inlines the snapshot for the address it rendered (shell_boot.py).
  const [inline] = useState(() => ({ locale, snapshot: inlinePublishedSnapshot(locale) }));
  const [snapshot, setSnapshot] = useState<PublishedSnapshot | null>(inline.snapshot || null);
  const [resolved, setResolved] = useState(Boolean(inline.snapshot));

  useEffect(() => {
    if (inline.snapshot && inline.locale === locale) {
      setSnapshot(inline.snapshot);
      setResolved(true);
      return;
    }
    let active = true;
    fetchPublishedSnapshot(locale).then((next) => {
      if (active) { setSnapshot(next); setResolved(true); }
    });
    return () => { active = false; };
  }, [locale, inline]);

  if (!resolved) return <PublicLoading />;
  if (!snapshot) return <PublicUnavailable kind="booking-unavailable" />;
  return (
    <PublicExperienceProvider locale={snapshot.locale}>
      <BookingHandoff snapshot={snapshot} slug={slug} />
    </PublicExperienceProvider>
  );
};

export default PublicBookingPage;
