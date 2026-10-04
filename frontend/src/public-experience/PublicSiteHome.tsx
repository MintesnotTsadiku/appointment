import type { CSSProperties } from "react";

import { usePublicExperience } from "./PublicExperienceProvider";
import { publicRootFromPath } from "./routes";
import { getTemplatePackage } from "./templates/registry";
import type { PublishedSnapshot } from "./types";
import "./platform.css";
import { PublicContentPage } from "./PublicContentPage";

const localizedRoot = (root: string, locale: string) => (locale && locale !== "en" && root !== "/" ? `${root}/${locale}` : root);

export const PublicSiteHome = ({ snapshot }: { snapshot: PublishedSnapshot }) => {
  const { config, theme, setPreference, isLoading, error } = usePublicExperience();
  const locale = snapshot.locale || config.locale;
  const design = snapshot.compiledDesign;
  const applicationName = design.identity.applicationName || config.identity.applicationName;
  const template = getTemplatePackage(design.layout.rendererKey, design.layout.rendererVersion);
  const rootStyle = {
    ...(theme.variables as CSSProperties),
    "--pe-surface-focus-ring": String((design.surface.shape as Record<string, unknown>)?.focusRing || "3px"),
  } as CSSProperties;
  const toggleMode = () => setPreference(theme.mode === "dark" ? "light" : "dark");

  if (isLoading) return <div data-pe-loading role="status" className="p-8">Loading published design…</div>;
  if (error) return <main data-pe-unavailable className="p-8"><h1>Public experience unavailable</h1><p>Please try again later.</p></main>;

  if (!template) {
    return (
      <main data-pe-unsupported className="mx-auto max-w-3xl p-8">
        <h1>Unsupported public template</h1>
        <p>This published release references an unavailable template package.</p>
      </main>
    );
  }
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
