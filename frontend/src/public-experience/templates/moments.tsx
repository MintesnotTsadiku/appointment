import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Booking-success moments, by renderer key and version. Each moment is a visual component of its own
 * template package, loaded only when a booking succeeds on a page that wears that template.
 * A template without an entry has no moment; the confirmation stays as it is.
 */
const MOMENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  "enkua-photography@3": lazy(() => import("./enkua-v3/Moment")),
  "mizan-inspection@3": lazy(() => import("./mizan-v3/Moment")),
  "meseret-advisory@3": lazy(() => import("./meseret-v3/Moment")),
  "bloom-hair@3": lazy(() => import("./bloom-v3/BloomMoment")),
  "meron-atelier@3": lazy(() => import("./meron-v3/MeronMoment")),
  "abugida-language@3": lazy(() => import("./abugida-v3/AbugidaMoment")),
  "selam-movement@3": lazy(() => import("./selam-v3/SelamMoment")),
  "tena-clinic@3": lazy(() => import("./tena-v3/TenaMoment")),
  "ergata-therapy@2": lazy(() => import("./ergata-v2/ErgataMoment")),
};

export function hasMoment(rendererKey?: string | null, rendererVersion?: number | null): boolean {
  return Boolean(rendererKey && MOMENTS[`${rendererKey}@${rendererVersion || 1}`]);
}

/** The template's success moment, or nothing. */
export function TemplateMoment({ rendererKey, rendererVersion }: { rendererKey?: string | null; rendererVersion?: number | null }) {
  const Moment = rendererKey ? MOMENTS[`${rendererKey}@${rendererVersion || 1}`] : undefined;
  if (!Moment) return null;
  return <Suspense fallback={null}><Moment /></Suspense>;
}
