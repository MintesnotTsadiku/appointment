import type { CSSProperties } from "react";

import { usePublicExperience } from "./PublicExperienceProvider";
import { publicRootFromPath } from "./routes";
import { getTemplatePackage } from "./templates/registry";
import type { PublishedSnapshot } from "./types";
import "./platform.css";

export const PublicSiteHome = ({ snapshot }: { snapshot: PublishedSnapshot }) => {
  const { config, theme } = usePublicExperience();
  const locale = snapshot.locale || config.locale;
  const design = snapshot.compiledDesign;
  const applicationName = design.identity.applicationName || config.identity.applicationName;
  const template = getTemplatePackage(design.layout.rendererKey);
  const rootStyle = {
    ...(theme.variables as CSSProperties),
    "--pe-surface-focus-ring": String((design.surface.shape as Record<string, unknown>)?.focusRing || "3px"),
  } as CSSProperties;

  if (!template) {
    return (
      <main data-pe-unsupported className="mx-auto max-w-3xl p-8">
        <h1>Unsupported public template</h1>
        <p>This published release references an unavailable template package.</p>
      </main>
    );
  }
  const Template = template.Site;
  return <Template
    snapshot={snapshot}
    locale={locale}
    applicationName={applicationName}
    publicRoot={publicRootFromPath(typeof window === "undefined" ? "/" : window.location.pathname)}
    rootStyle={rootStyle}
  />;
};

export default PublicSiteHome;
