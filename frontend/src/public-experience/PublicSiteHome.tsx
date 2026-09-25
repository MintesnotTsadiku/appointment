import { Fragment, type CSSProperties } from "react";

import { usePublicExperience } from "./PublicExperienceProvider";
import { publicRootFromPath } from "./routes";
import { renderSection, safeHref } from "./sections";
import type { PublishedSnapshot } from "./types";
import "./quiet-trust.css";


export const PublicSiteHome = ({ snapshot }: { snapshot: PublishedSnapshot }) => {
  const { config, theme } = usePublicExperience();
  const locale = snapshot.locale || config.locale;
  const design = snapshot.compiledDesign;
  const applicationName = design.identity.applicationName || config.identity.applicationName;
  const hero = snapshot.sections.find((section) => section.type === "hero");
  const heroContent = hero?.content || {};
  const primaryAction = heroContent.primaryAction;
  const primaryHref = safeHref(
    primaryAction && typeof primaryAction === "object" ? (primaryAction as Record<string, unknown>).href : undefined,
  );
  const rootStyle = {
    ...(theme.variables as CSSProperties),
    "--pe-surface-focus-ring": String((design.surface.shape as Record<string, unknown>)?.focusRing || "3px"),
  } as CSSProperties;

  return (
    <div
      data-pe-root
      data-pe-recipe={design.recipeKey}
      data-pe-mode={theme.mode}
      data-pe-reduced-motion={theme.reducedMotion ? "true" : "false"}
      style={rootStyle}
      className="pe-page"
    >
      <div className="pe-topline">
        <header className="pe-nav pe-container">
          <a className="pe-brand" href={publicRootFromPath(typeof window === "undefined" ? "/" : window.location.pathname)} aria-label={applicationName}>
            <span className="pe-brand-mark" aria-hidden="true">✦</span>
            <span>{applicationName}</span>
          </a>
          <div className="pe-nav-meta">
            <span>{locale}</span>
            {primaryHref ? <a href={primaryHref}>Make an appointment ↗</a> : null}
          </div>
        </header>
      </div>

      <main data-pe-sections>
        {snapshot.sections
          .slice()
          .sort((left, right) => left.order - right.order)
          .map((section) => (
            <Fragment key={section.id}>
              {renderSection(section, locale, design, applicationName)}
            </Fragment>
          ))}
      </main>
    </div>
  );
};

export default PublicSiteHome;
