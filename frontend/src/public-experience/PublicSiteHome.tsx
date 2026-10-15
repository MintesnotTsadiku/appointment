import type { CSSProperties } from "react";

import { usePublicExperience } from "./PublicExperienceProvider";
import { publicRootFromPath, withBookingLanguage } from "./routes";
import { getTemplatePackage } from "./templates/registry";
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
  const applicationName = design.identity.applicationName || config.identity.applicationName;
  const template = getTemplatePackage(design.layout.rendererKey, design.layout.rendererVersion);
  const rootStyle = {
    ...(theme.variables as CSSProperties),
    "--pe-surface-focus-ring": String((design.surface.shape as Record<string, unknown>)?.focusRing || "3px"),
  } as CSSProperties;
  const toggleMode = () => setPreference(theme.mode === "dark" ? "light" : "dark");

  if (isLoading || forceLoading) {
    const Loading = template?.Loading;
    return Loading ? <div style={rootStyle}><Loading mode={theme.mode} locale={snapshot.locale} /></div> : <PublicLoading config={config} mode={theme.mode} />;
  }
  if (error) return <PublicUnavailable kind="error" config={config} mode={theme.mode} onRetry={refresh} />;
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
