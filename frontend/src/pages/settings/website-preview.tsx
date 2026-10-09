import "@/public-experience/platform.css";
import "./appearance/appearance.css";
import { PreviewFrame } from "./appearance/PreviewFrame";
import { AppearanceSelect } from "./appearance/AppearanceSelect";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import type { ContentState } from "@/public-experience/contentContract";
import { buildThemeAttributes } from "@/public-experience/firstPaint";
import { getTemplatePackage } from "@/public-experience/templates/registry";
import { getFallbackPublicUIConfig } from "@/public-experience/tokens";
import type { PublishedSnapshot } from "@/public-experience/types";
import { useTranslation } from "@/lib/i18n";

const button = "rounded-lg border px-4 py-2";

export function WebsitePreview({ snapshot, initialSurface = "landing", savedArticle = false, onEscape }: { snapshot: PublishedSnapshot; initialSurface?: string; savedArticle?: boolean; onEscape?: () => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const previewRoot = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const background: { element: HTMLElement; inert: boolean }[] = [];
    let current = previewRoot.current;
    while (current?.parentElement && current !== document.body) {
      for (const sibling of Array.from(current.parentElement.children)) {
        if (sibling !== current && sibling instanceof HTMLElement) {
          background.push({ element: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      current = current.parentElement;
    }
    const dismiss = (event: KeyboardEvent) => { if (event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); setExpanded(false); } };
    document.addEventListener("keydown", dismiss);
    document.body.style.overflow = "hidden";
    previewRoot.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { document.removeEventListener("keydown", dismiss); background.forEach(({element, inert}) => { element.inert = inert; }); document.body.style.overflow = overflow; previous?.focus(); };
  }, [expanded]);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [mobile, setMobile] = useState(window.innerWidth < 800);
  const viewportChosen = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 800px)");
    const update = () => { if (!viewportChosen.current) setMobile(query.matches); };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const [surface, setSurface] = useState(initialSurface);
  const template = getTemplatePackage(snapshot.compiledDesign.layout.rendererKey, snapshot.compiledDesign.layout.rendererVersion);
  const theme = buildThemeAttributes({ ...getFallbackPublicUIConfig("en"), compiledDesign: snapshot.compiledDesign }, mode, false);
  const kind = ["blog", "article"].includes(surface) ? "blog" : "gallery";
  const release = kind === "blog" ? snapshot.previewContent?.article : snapshot.previewContent?.gallery;
  const content: ContentState = { kind, detail: ["article", "collection"].includes(surface), loading: false,
    unavailable: false, release: release || null, entries: release ? [release] : [], page: 1, hasNext: false };
  const common = { snapshot, locale: "en", applicationName: snapshot.compiledDesign.identity.applicationName,
    publicRoot: "/website-preview", mode, toggleMode: () => setMode(mode === "light" ? "dark" : "light"),
    rootStyle: theme.variables as CSSProperties };

  if (!template) return <section aria-label={t("staff.website.preview.liveLabel")}><p>{t("staff.website.preview.unavailable")}</p></section>;

  return <section ref={previewRoot} aria-label={t("staff.website.preview.liveLabel")} className={`space-y-4 website-preview${expanded ? " website-preview-expanded" : ""}`} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} onKeyDown={event => { if (expanded && event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); setExpanded(false); } }}>
    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{savedArticle ? t("staff.website.preview.savedArticleNote") : t("staff.website.preview.note")}</p>
    <div className="flex flex-wrap items-end gap-3"><button type="button" className={button} onClick={() => setExpanded(!expanded)}>{expanded ? t("staff.website.preview.closeFullscreen") : t("staff.website.preview.fullscreen")}</button>
      <button className={button} onClick={() => setMode(mode === "light" ? "dark" : "light")}>{mode === "light" ? t("staff.website.preview.darkMode") : t("staff.website.preview.lightMode")}</button>
      <button className={button} onClick={() => { viewportChosen.current = true; setMobile(!mobile); }}>{mobile ? t("staff.website.preview.desktop") : t("staff.website.preview.mobile")}</button>
      <label>{t("staff.website.preview.surface")}<AppearanceSelect aria-label={t("staff.website.preview.surface")} value={surface} onChange={(event) => setSurface(event.target.value)}>
        <option value="landing">{t("staff.website.preview.landing")}</option><option value="booking">{t("staff.website.preview.booking")}</option>
        <option value="blog">{t("staff.website.preview.blog")}</option><option value="article">{t("staff.website.preview.article")}</option>
        <option value="gallery">{t("staff.website.preview.gallery")}</option><option value="collection">{t("staff.website.preview.collection")}</option>
      </AppearanceSelect></label>
    </div>
    <div className="mx-auto overflow-hidden rounded-xl border" style={{ maxWidth: mobile ? 390 : undefined }}
      onClickCapture={(event) => { if ((event.target as Element).closest?.("a")) event.preventDefault(); }}>
      <PreviewFrame key={surface} mobile={mobile} design={snapshot.compiledDesign} onEscape={expanded ? () => setExpanded(false) : onEscape}>{surface === "landing" ? <template.Site {...common} /> : surface === "booking" ? <template.Booking {...common} bookingPath={null} />
        : <template.Content {...common} content={content} contentRoot={`/website-preview/${kind}`} />}</PreviewFrame>
    </div>
  </section>;
}
