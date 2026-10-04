import { useEffect, useState } from "react";
import { callGet } from "./api";
import type { ContentDetail, ContentEntry, ContentState } from "./contentContract";

export function usePublicContent(site: string, route: string, locale: string, page: number): ContentState {
  const kind = route.startsWith("/gallery") ? "gallery" : "blog";
  const detail = route.split("/").filter(Boolean).length === 2;
  const [state, setState] = useState<ContentState>({ kind, detail, loading: true, unavailable: false, entries: [], release: null, page, hasNext: false });
  useEffect(() => {
    let active = true;
    const initial = { kind, detail, loading: true, unavailable: false, entries: [], release: null, page, hasNext: false } as ContentState;
    setState(initial);
    const content = kind === "blog" ? "article" : "gallery";
    const method = `appointment.content.public_api.get_${content}_${detail ? "detail" : "index"}`;
    const params: Record<string, string | number> = detail ? { site, locale, route } : { site, locale, page, page_size: 12 };
    callGet<ContentDetail | { articles?: ContentEntry[]; galleries?: ContentEntry[] }>(method, params)
      .then((result) => {
        if (!active) return;
        if (detail) {
          const release = result as ContentDetail;
          if (release.templateCompatVersion !== "public-content.v1" || release.route !== route || release.locale !== locale) throw new Error("incompatible release");
          setState({ ...initial, loading: false, release });
        } else {
          const index = result as { articles?: ContentEntry[]; galleries?: ContentEntry[] };
          const rows = (kind === "blog" ? index.articles : index.galleries) || [];
          setState({ ...initial, loading: false, entries: rows.filter((row) => row.templateCompatVersion === "public-content.v1"), hasNext: rows.length === 12 });
        }
      }).catch(() => { if (active) setState({ ...initial, loading: false, unavailable: true }); });
    return () => { active = false; };
  }, [site, route, locale, page, kind, detail]);
  return state;
}
