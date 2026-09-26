import { useState, type CSSProperties } from "react";

import type { ContentState } from "@/public-experience/contentContract";
import { buildThemeAttributes } from "@/public-experience/firstPaint";
import { getTemplatePackage } from "@/public-experience/templates/registry";
import { getFallbackPublicUIConfig } from "@/public-experience/tokens";
import type { PublishedSnapshot } from "@/public-experience/types";

const button = "rounded-lg border px-4 py-2";

export function WebsitePreview({ snapshot }: { snapshot: PublishedSnapshot }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [mobile, setMobile] = useState(false);
  const [surface, setSurface] = useState("landing");
  const template = getTemplatePackage(snapshot.compiledDesign.layout.rendererKey);
  const theme = buildThemeAttributes({ ...getFallbackPublicUIConfig("en"), compiledDesign: snapshot.compiledDesign }, mode, false);
  const kind = ["blog", "article"].includes(surface) ? "blog" : "gallery";
  const release = kind === "blog" ? snapshot.previewContent?.article : snapshot.previewContent?.gallery;
  const content: ContentState = { kind, detail: ["article", "collection"].includes(surface), loading: false,
    unavailable: false, release: release || null, entries: release ? [release] : [], page: 1, hasNext: false };
  const common = { snapshot, locale: "en", applicationName: snapshot.compiledDesign.identity.applicationName,
    publicRoot: "/website-preview", mode, toggleMode: () => setMode(mode === "light" ? "dark" : "light"),
    rootStyle: theme.variables as CSSProperties };

  return <section aria-label="Website live preview" className="space-y-4">
    <p>Private preview. Article and gallery examples show the layout and are never published. Booking and signup remain inactive here.</p>
    <div className="flex flex-wrap gap-3">
      <button className={button} onClick={() => setMode(mode === "light" ? "dark" : "light")}>Preview {mode === "light" ? "dark" : "light"} mode</button>
      <button className={button} onClick={() => setMobile(!mobile)}>Preview {mobile ? "desktop" : "mobile"}</button>
      <label>Surface<select className="block rounded-lg border p-3 dark:bg-slate-900" value={surface} onChange={(event) => setSurface(event.target.value)}>
        <option value="landing">Landing page</option><option value="booking">Booking handoff</option>
        <option value="blog">Blog index</option><option value="article">Article</option>
        <option value="gallery">Gallery index</option><option value="collection">Gallery collection</option>
      </select></label>
    </div>
    <div className="mx-auto overflow-auto border" style={{ maxWidth: mobile ? 390 : undefined, maxHeight: 750 }}
      onClickCapture={(event) => { if (event.target instanceof Element && event.target.closest("a")) event.preventDefault(); }}>
      {surface === "landing" ? <template.Site {...common} /> : surface === "booking" ? <template.Booking {...common} bookingPath={null} />
        : <template.Content {...common} content={content} contentRoot={`/website-preview/${kind}`} />}
    </div>
  </section>;
}
