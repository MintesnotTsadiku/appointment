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

const button = "rounded-lg border px-4 py-2";

export function WebsitePreview({ snapshot, initialSurface = "landing", savedArticle = false, onEscape }: { snapshot: PublishedSnapshot; initialSurface?: string; savedArticle?: boolean; onEscape?: () => void }) {
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

  if (!template) return <section aria-label="Website live preview"><p>Preview unavailable for this template.</p></section>;

  return <section ref={previewRoot} aria-label="Website live preview" className={`space-y-4 website-preview${expanded ? " website-preview-expanded" : ""}`} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} onKeyDown={event => { if (expanded && event.key === "Escape" && !event.defaultPrevented) { event.preventDefault(); setExpanded(false); } }}>
    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{savedArticle ? "Private preview of your saved article. Other surfaces show layout examples. Booking and signup remain inactive here." : "Private preview. Article and gallery examples show the layout and are never published. Booking and signup remain inactive here."}</p>
    <div className="flex flex-wrap items-end gap-3"><button type="button" className={button} onClick={() => setExpanded(!expanded)}>{expanded ? "Close fullscreen preview" : "Fullscreen preview"}</button>
      <button className={button} onClick={() => setMode(mode === "light" ? "dark" : "light")}>Preview {mode === "light" ? "dark" : "light"} mode</button>
      <button className={button} onClick={() => { viewportChosen.current = true; setMobile(!mobile); }}>Preview {mobile ? "desktop" : "mobile"}</button>
      <label>Surface<AppearanceSelect aria-label="Surface" value={surface} onChange={(event) => setSurface(event.target.value)}>
        <option value="landing">Landing page</option><option value="booking">Booking handoff</option>
        <option value="blog">Blog index</option><option value="article">Article</option>
        <option value="gallery">Gallery index</option><option value="collection">Gallery collection</option>
      </AppearanceSelect></label>
    </div>
    <div className="mx-auto overflow-hidden rounded-xl border" style={{ maxWidth: mobile ? 390 : undefined }}
      onClickCapture={(event) => { if ((event.target as Element).closest?.("a")) event.preventDefault(); }}>
      <PreviewFrame key={surface} mobile={mobile} design={snapshot.compiledDesign} onEscape={expanded ? () => setExpanded(false) : onEscape}>{surface === "landing" ? <template.Site {...common} /> : surface === "booking" ? <template.Booking {...common} bookingPath={null} />
        : <template.Content {...common} content={content} contentRoot={`/website-preview/${kind}`} />}</PreviewFrame>
    </div>
  </section>;
}
