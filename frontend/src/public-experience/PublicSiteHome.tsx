import type { CSSProperties } from "react";

import { siteName } from "@/lib/local-names";
import { usePublicExperience } from "./PublicExperienceProvider";
import { publicRootFromPath, withBookingLanguage } from "./routes";
import { useTemplatePackage } from "./templates/registry";
import type { PublishedSnapshot } from "./types";
import "./platform.css";
import { PublicContentPage } from "./PublicContentPage";
import { PublicLoading, PublicUnavailable } from "./PublicStates";

const localizedRoot = (root: string, locale: string) => (locale && locale !== "en" && root !== "/" ? `${root}/${locale}` : root);

export const PublicSiteHome = ({ snapshot: published, forceLoading = false }: { snapshot: PublishedSnapshot; forceLoading?: boolean }) => {
  // Links into the scheduler keep the page's language.
  const snapshot = withBookingLanguage(published);
  const { config, theme, setPreference, refresh, isLoading, error } = usePublicExperience();
  const locale = snapshot.locale || config.locale;
  const design = snapshot.compiledDesign;
  // The website name in the page language (the published Amharic title on Amharic pages).
  const applicationName = siteName(design.identity.applicationName || config.identity.applicationName, snapshot.localTitle?.am, locale);
  const { template, status, retry } = useTemplatePackage(design.layout.rendererKey, design.layout.rendererVersion);
  const rootStyle = {
    ...(theme.variables as CSSProperties),
    "--pe-surface-focus-ring": String((design.surface.shape as Record<string, unknown>)?.focusRing || "3px"),
  } as CSSProperties;
  const toggleMode = () => setPreference(theme.mode === "dark" ? "light" : "dark");

  if (isLoading || forceLoading || status === "loading") {
    const Loading = template?.Loading;
    return Loading ? <div style={rootStyle}><Loading mode={theme.mode} locale={snapshot.locale} /></div> : <PublicLoading config={config} mode={theme.mode} />;
  }
  if (error) return <PublicUnavailable kind="error" config={config} mode={theme.mode} onRetry={refresh} />;
  if (status === "error") return <PublicUnavailable kind="error" config={config} mode={theme.mode} onRetry={retry} />;
  if (!template) return <PublicUnavailable kind="unsupported" config={config} mode={theme.mode} />;
  if (snapshot.routeKind.startsWith("blog_") || snapshot.routeKind.startsWith("gallery_")) return <PublicContentPage snapshot={snapshot} />;
  const Template = template.Site;
  return <Template
    snapshot={snapshot}
    locale={locale}
    applicationName={applicationName}
    publicRoot={localizedRoot(publicRootFromPath(typeof window === "undefined" ? "/" : window.location.pathname), locale)}
    rootStyle={rootStyle}
    mode={theme.mode}
    toggleMode={toggleMode}
  />;
};

export default PublicSiteHome;
