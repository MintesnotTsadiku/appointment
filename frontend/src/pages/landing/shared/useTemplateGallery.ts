import { useEffect, useState } from "react";
import { GALLERY_ENDPOINT, parseGallery, type GalleryTemplate } from "./templateGallery";

export interface TemplateGalleryState {
  templates: GalleryTemplate[];
  loaded: boolean;
}

/**
 * Every certified template, loaded once `enabled` (the section is near the
 * viewport). A failed request leaves the gallery empty and the page intact.
 */
export function useTemplateGallery(enabled: boolean): TemplateGalleryState {
  const [state, setState] = useState<TemplateGalleryState>({ templates: [], loaded: false });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetch(GALLERY_ENDPOINT, { credentials: "same-origin", headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => active && setState({ templates: parseGallery(body?.message), loaded: true }))
      .catch(() => active && setState({ templates: [], loaded: true }));
    return () => {
      active = false;
    };
  }, [enabled]);
  return state;
}
