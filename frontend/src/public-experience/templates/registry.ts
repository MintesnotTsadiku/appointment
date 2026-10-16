import { useEffect, useState } from "react";

import type { PublicTemplatePackage } from "./types";

type PackageParts = Omit<PublicTemplatePackage, "key">;
type PackageLoader = () => Promise<PublicTemplatePackage>;

/**
 * One certified package, loaded on first use. A page downloads only the code and the stylesheet of
 * its own template (docs/operations/PUBLIC_PERFORMANCE.md). A failed download can be tried again.
 */
function lazyPackage<T, C>(key: string, template: () => Promise<T>, content: () => Promise<C>,
  parts: (template: T, content: C) => PackageParts): PackageLoader {
  let pending: Promise<PublicTemplatePackage> | null = null;
  return () => {
    pending ||= Promise.all([template(), content()])
      .then(([templateModule, contentModule]) => ({ key, ...parts(templateModule, contentModule) }))
      .catch((error: unknown) => {
        pending = null;
        throw error;
      });
    return pending;
  };
}

/**
 * Certified packages by renderer key and renderer version. A release pins the
 * version it was published with, so a redesign never changes a live site until
 * the owner republishes on the new recipe version. Unknown pairs fail closed.
 */
const TEMPLATE_PACKAGES: Record<string, PackageLoader> = {
  "enkua-photography@3": lazyPackage("enkua-photography", () => import("./enkua-v3/Template"), () => import("./enkua-v3/Content"),
    (t,c) => ({ Site:t.Site, Booking:t.Booking, Content:c.Content, Loading: t.SiteLoading })),
  "selam-movement@1": lazyPackage("selam-movement", () => import("./selam/SelamTemplate"), () => import("./selam/SelamContent"),
    (t, c) => ({ Site: t.SelamSite, Booking: t.SelamBooking, Content: c.SelamContent })),
  "selam-movement@2": lazyPackage("selam-movement", () => import("./selam-v2/SelamTemplate"), () => import("./selam/SelamContent"),
    (t, c) => ({ Site: t.SelamSite, Booking: t.SelamBooking, Content: c.SelamContent })),
  "selam-movement@3": lazyPackage("selam-movement", () => import("./selam-v3/SelamTemplate"), () => import("./selam/SelamContent"),
    (t, c) => ({ Site: t.SelamSite, Booking: t.SelamBooking, Content: c.SelamContent, Loading: t.SelamLoading })),
  "bloom-hair@1": lazyPackage("bloom-hair", () => import("./bloom/BloomTemplate"), () => import("./bloom/BloomContent"),
    (t, c) => ({ Site: t.BloomSite, Booking: t.BloomBooking, Content: c.BloomContent })),
  "bloom-hair@2": lazyPackage("bloom-hair", () => import("./bloom-v2/BloomTemplate"), () => import("./bloom/BloomContent"),
    (t, c) => ({ Site: t.BloomSite, Booking: t.BloomBooking, Content: c.BloomContent })),
  "bloom-hair@3": lazyPackage("bloom-hair", () => import("./bloom-v3/BloomTemplate"), () => import("./bloom/BloomContent"),
    (t, c) => ({ Site: t.BloomSite, Booking: t.BloomBooking, Content: c.BloomContent, Loading: t.BloomLoading })),
  "meron-atelier@1": lazyPackage("meron-atelier", () => import("./meron/MeronTemplate"), () => import("./meron/MeronContent"),
    (t, c) => ({ Site: t.MeronSite, Booking: t.MeronBooking, Content: c.MeronContent })),
  "meron-atelier@2": lazyPackage("meron-atelier", () => import("./meron-v2/MeronTemplate"), () => import("./meron/MeronContent"),
    (t, c) => ({ Site: t.MeronSite, Booking: t.MeronBooking, Content: c.MeronContent })),
  "meron-atelier@3": lazyPackage("meron-atelier", () => import("./meron-v3/MeronTemplate"), () => import("./meron/MeronContent"),
    (t, c) => ({ Site: t.MeronSite, Booking: t.MeronBooking, Content: c.MeronContent, Loading: t.MeronLoading })),
  "abugida-language@1": lazyPackage("abugida-language", () => import("./abugida/AbugidaTemplate"), () => import("./abugida/AbugidaContent"),
    (t, c) => ({ Site: t.AbugidaSite, Booking: t.AbugidaBooking, Content: c.AbugidaContent })),
  "abugida-language@2": lazyPackage("abugida-language", () => import("./abugida-v2/AbugidaTemplate"), () => import("./abugida/AbugidaContent"),
    (t, c) => ({ Site: t.AbugidaSite, Booking: t.AbugidaBooking, Content: c.AbugidaContent })),
  "abugida-language@3": lazyPackage("abugida-language", () => import("./abugida-v3/AbugidaTemplate"), () => import("./abugida/AbugidaContent"),
    (t, c) => ({ Site: t.AbugidaSite, Booking: t.AbugidaBooking, Content: c.AbugidaContent, Loading: t.AbugidaLoading })),
  "tena-clinic@1": lazyPackage("tena-clinic", () => import("./tena/TenaTemplate"), () => import("./tena/TenaContent"),
    (t, c) => ({ Site: t.TenaSite, Booking: t.TenaBooking, Content: c.TenaContent })),
  "tena-clinic@2": lazyPackage("tena-clinic", () => import("./tena-v2/TenaTemplate"), () => import("./tena/TenaContent"),
    (t, c) => ({ Site: t.TenaSite, Booking: t.TenaBooking, Content: c.TenaContent })),
  "tena-clinic@3": lazyPackage("tena-clinic", () => import("./tena-v3/TenaTemplate"), () => import("./tena/TenaContent"),
    (t, c) => ({ Site: t.TenaSite, Booking: t.TenaBooking, Content: c.TenaContent, Loading: t.TenaLoading })),
  "ergata-therapy@1": lazyPackage("ergata-therapy", () => import("./ergata/ErgataTemplate"), () => import("./ergata/ErgataContent"),
    (t, c) => ({ Site: t.ErgataSite, Booking: t.ErgataBooking, Content: c.ErgataContent })),
  "ergata-therapy@2": lazyPackage("ergata-therapy", () => import("./ergata-v2/ErgataTemplate"), () => import("./ergata/ErgataContent"),
    (t, c) => ({ Site: t.ErgataSite, Booking: t.ErgataBooking, Content: c.ErgataContent, Loading: t.ErgataLoading })),
};

const loaded = new Map<string, PublicTemplatePackage>();

const packageId = (rendererKey: string, rendererVersion?: number) => `${rendererKey}@${rendererVersion || 1}`;

/** The package after it has loaded, else null (unknown, or not loaded yet). */
export function getTemplatePackage(rendererKey: string, rendererVersion: number = 1): PublicTemplatePackage | null {
  return loaded.get(packageId(rendererKey, rendererVersion)) || null;
}

/** Load a package; null for an unknown renderer key and version (fail closed). */
export function loadTemplatePackage(rendererKey: string, rendererVersion: number = 1): Promise<PublicTemplatePackage | null> {
  const id = packageId(rendererKey, rendererVersion);
  const load = TEMPLATE_PACKAGES[id];
  if (!load) return Promise.resolve(null);
  return load().then((item) => {
    loaded.set(id, item);
    return item;
  });
}

export type TemplatePackageStatus = "ready" | "loading" | "unsupported" | "error";

/** The package for a design; it loads on first use and renders at once when it has loaded before. */
export function useTemplatePackage(rendererKey: string, rendererVersion: number = 1): { template: PublicTemplatePackage | null; status: TemplatePackageStatus; retry: () => void } {
  const id = packageId(rendererKey, rendererVersion);
  const known = id in TEMPLATE_PACKAGES;
  const [state, setState] = useState<{ id: string; status: TemplatePackageStatus; attempt: number }>({ id, status: "loading", attempt: 0 });
  const template = loaded.get(id) || null;
  const rendered = Boolean(template);
  useEffect(() => {
    // Also when the package arrived between the render and this effect (prefetch.ts loads it early):
    // the resolved promise then renders the package.
    if (!known || rendered) return;
    let active = true;
    loadTemplatePackage(rendererKey, rendererVersion)
      .then(() => { if (active) setState((previous) => ({ ...previous, id, status: "ready" })); })
      .catch(() => { if (active) setState((previous) => ({ ...previous, id, status: "error" })); });
    return () => { active = false; };
  }, [id, known, rendered, rendererKey, rendererVersion, state.attempt]);
  const retry = () => setState((previous) => ({ id, status: "loading", attempt: previous.attempt + 1 }));
  if (!known) return { template: null, status: "unsupported", retry };
  if (template) return { template, status: "ready", retry };
  return { template: null, status: state.id === id && state.status === "error" ? "error" : "loading", retry };
}

export function registeredTemplateKeys(): string[] {
  return [...new Set(Object.keys(TEMPLATE_PACKAGES).map((id) => id.split("@")[0]))];
}
