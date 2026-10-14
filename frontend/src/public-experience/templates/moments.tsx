import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";

/**
 * Booking-success moments, by renderer key and version. Each moment is a visual component of its own
 * template package, loaded only when a booking succeeds on a page that wears that template.
 * A template without an entry has no moment; the confirmation stays as it is.
 */
const MOMENTS: Record<string, LazyExoticComponent<ComponentType>> = {
  "bloom-hair@3": lazy(() => import("./bloom-v3/BloomMoment")),
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
