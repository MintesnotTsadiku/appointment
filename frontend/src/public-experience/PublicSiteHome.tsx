import type { CSSProperties } from "react";

import { usePublicExperience } from "./PublicExperienceProvider";
import { publicRootFromPath } from "./routes";
import { getTemplatePackage } from "./templates/registry";
import type { PublishedSnapshot } from "./types";
import "./platform.css";
import { PublicContentPage } from "./PublicContentPage";

export const PublicSiteHome = ({ snapshot }: { snapshot: PublishedSnapshot }) => {
  const { config, theme, setPreference } = usePublicExperience();
  const locale = snapshot.locale || config.locale;
  const design = snapshot.compiledDesign;
  const applicationName = design.identity.applicationName || config.identity.applicationName;
  const template = getTemplatePackage(design.layout.rendererKey);
  const rootStyle = {
    ...(theme.variables as CSSProperties),
    "--pe-surface-focus-ring": String((design.surface.shape as Record<string, unknown>)?.focusRing || "3px"),
  } as CSSProperties;
  const toggleMode = () => setPreference(theme.mode === "dark" ? "light" : "dark");

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
    publicRoot={publicRootFromPath(typeof window === "undefined" ? "/" : window.location.pathname)}
    rootStyle={rootStyle}
    mode={theme.mode}
    toggleMode={toggleMode}
  />;
};

export default PublicSiteHome;
