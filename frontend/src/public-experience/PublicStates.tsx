import type { CSSProperties } from "react";
import { Bone, BookingState, BookingStatePage, SitePageSkeleton, type BookingStateAction } from "@/components/booking-states";
import { useTranslation } from "@/lib/i18n";
import { bookingBrandVariables } from "./bookingTheme";
import type { PublicUIConfig } from "./types";

/**
 * Loading and unavailable states of the public website and its booking handoff.
 * With a published design they use its colours and type; before it loads they use the app tokens.
 * The `data-pe-*` attributes are kept for older checks. See docs/growth/BOOKING_LAYOUT.md.
 */

type Kind = "unavailable" | "error" | "unsupported" | "booking-unavailable";

function brandStyle(config?: PublicUIConfig, mode?: "light" | "dark"): CSSProperties | undefined {
  return config && mode ? (bookingBrandVariables(config, mode) as CSSProperties) : undefined;
}

export function PublicLoading({ config, mode }: { config?: PublicUIConfig; mode?: "light" | "dark" }) {
  return <div style={brandStyle(config, mode)}><SitePageSkeleton attributes={{ "data-pe-loading": "" }} /></div>;
}

export function PublicUnavailable({ kind, config, mode, onRetry }: { kind: Kind; config?: PublicUIConfig; mode?: "light" | "dark"; onRetry?: () => void }) {
  const { t } = useTranslation();
  const copy = {
    unavailable: { title: t("bookingStates.siteUnavailableTitle"), body: t("bookingStates.siteUnavailableBody"), attr: "data-pe-unavailable", state: "not-found" as const },
    "booking-unavailable": { title: t("bookingStates.bookingUnavailableTitle"), body: t("bookingStates.siteUnavailableBody"), attr: "data-pe-unavailable", state: "unavailable" as const },
    error: { title: t("bookingStates.siteErrorTitle"), body: t("bookingStates.errorBody"), attr: "data-pe-unavailable", state: "error" as const },
    unsupported: { title: t("bookingStates.unsupportedTitle"), body: t("bookingStates.unsupportedBody"), attr: "data-pe-unsupported", state: "unavailable" as const },
  }[kind];
  const actions: BookingStateAction[] = [];
  if (onRetry) actions.push({ label: t("bookingStates.retry"), onClick: onRetry, qa: "booking-state-retry" });
  actions.push({ label: t("bookingStates.goHome"), href: "/", qa: "booking-state-home" });
  return (
    <BookingStatePage style={brandStyle(config, mode)} branded={Boolean(config && mode)} qa="public-state" mainAttributes={{ [copy.attr]: "" }}>
      <BookingState kind={copy.state} headingLevel={1} title={copy.title} description={copy.body} actions={actions} />
    </BookingStatePage>
  );
}

/** A journal or gallery page while its published content loads, drawn with the template's own tokens. */
export function PublicContentLoading() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" data-qa="public-content-loading" className="grid gap-6 py-6 sm:grid-cols-2 lg:grid-cols-3"
      style={{ "--text-primary": "var(--pe-color-text, #111827)", "--accent-primary": "var(--pe-color-primary, #6d28d9)" } as CSSProperties}>
      <span className="sr-only">{t("bookingStates.loadingSite")}</span>
      {[0, 1, 2].map((index) => (
        <div key={index} className="space-y-3" aria-hidden="true">
          <Bone className="aspect-4/3 w-full" accent={index === 0} />
          <Bone className="h-5 w-3/4" />
          <Bone className="h-3.5 w-full" />
          <Bone className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}
