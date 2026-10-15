import type { CSSProperties } from "react";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { usePublicExperience } from "./PublicExperienceProvider";
import { usePublicContent } from "./usePublicContent";
import { publicRootFromPath } from "./routes";
import { useTemplatePackage } from "./templates/registry";
import type { PublishedSnapshot } from "./types";
import { PublicLoading, PublicUnavailable } from "./PublicStates";
import { siteName } from "@/lib/local-names";

export function PublicContentPage({ snapshot }: { snapshot: PublishedSnapshot }) {
  const { pathname, search } = useLocation();
  const { config, theme, setPreference } = usePublicExperience();
  const publicRoot = publicRootFromPath(pathname);
  const route = pathname.slice(publicRoot.length).replace(/\/$/, "");
  const rawPage = Number(new URLSearchParams(search).get("page") || 1);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const content = usePublicContent(decodeURIComponent(publicRoot.slice(1)), route, snapshot.locale, page);
  const { template, status, retry } = useTemplatePackage(snapshot.compiledDesign.layout.rendererKey, snapshot.compiledDesign.layout.rendererVersion);
  if (status === "loading") return <PublicLoading config={config} mode={theme.mode} />;
  if (status === "error") return <PublicUnavailable kind="error" config={config} mode={theme.mode} onRetry={retry} />;
  if (!template) return <PublicUnavailable kind="unsupported" config={config} mode={theme.mode} />;
  const Content = template.Content;
  const rootStyle = theme.variables as CSSProperties;
  const title = content.release?.seo.title || content.release?.projection.title;
  return <>
    <Helmet><title>{title || `${content.kind === "blog" ? "Journal" : "Gallery"} · ${snapshot.compiledDesign.identity.applicationName}`}</title>
      {content.release?.seo.description ? <meta name="description" content={content.release.seo.description} /> : null}
      <link rel="canonical" href={snapshot.canonicalUrl} />
      {content.unavailable ? <meta name="robots" content="noindex" /> : null}
    </Helmet>
    <Content snapshot={snapshot} locale={snapshot.locale} applicationName={siteName(snapshot.compiledDesign.identity.applicationName, snapshot.localTitle?.am, snapshot.locale)}
      publicRoot={publicRoot} rootStyle={rootStyle} mode={theme.mode} toggleMode={() => setPreference(theme.mode === "dark" ? "light" : "dark")}
      content={content} contentRoot={`${publicRoot}/${content.kind}`} />
  </>;
}
