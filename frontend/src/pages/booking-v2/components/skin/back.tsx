/**
 * The Back button at the start of the booking header, and where it goes.
 *
 * - Details → the time picker (the page's own step; the chosen time stays selected).
 * - Time picker → the service chooser, or the provider page. When that page is the previous page in the
 *   browser's history, Back is the browser's Back; otherwise the chooser replaces the picker, so the history
 *   does not grow a loop.
 * - Service chooser (and the provider page) → the in-app page before the booking pages (the website's `/book`
 *   page, for example), else the business website.
 *
 * The browser's own Back keeps working: the steps inside one address are page state.
 */
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/lib/i18n";
import { historyIndex, trailPath } from "@/lib/history-trail";

/** The booking pages: the organization scheduler, the provider page and the provider and independent schedulers. */
export function isBookingFlowPath(path: string): boolean {
  const pathname = path.split(/[?#]/)[0].replace(/\/+$/, "");
  return /^\/schedule\/(org|p)\/[^/]+(\/[^/]+)?$/.test(pathname) || /^\/schedule\/individual\/[^/]+$/.test(pathname);
}

const pathnameOf = (path: string) => path.split(/[?#]/)[0].replace(/\/+$/, "");

/** The history index of the in-app page before the booking pages, or null when the visit started here. */
export function bookingReferrerIndex(): number | null {
  const idx = historyIndex();
  if (idx === null) return null;
  for (let index = idx - 1; index >= 0; index -= 1) {
    const path = trailPath(index);
    if (path === null) return null;
    if (!isBookingFlowPath(path)) return index;
  }
  return null;
}

/** Ways back for a booking page. */
export function useBookingBack() {
  const navigate = useNavigate();
  return {
    /** Back to a step with its own address (the service chooser, the provider page). */
    toPath(path: string) {
      const idx = historyIndex();
      const previous = idx === null ? null : trailPath(idx - 1);
      if (previous && pathnameOf(previous) === pathnameOf(path)) navigate(-1);
      else navigate(path, { replace: true });
    },
    /** Out of the booking pages: the in-app page before them, else `site` (the business website). */
    leave(site?: string) {
      const idx = historyIndex();
      const referrer = bookingReferrerIndex();
      if (referrer !== null && idx !== null) navigate(referrer - idx);
      else if (site) navigate(site);
    },
  };
}

export type BookingBackTarget = "time" | "service" | "site" | "previous";

/**
 * The header's Back button: a chevron and "Back" ("ተመለስ"); the name says where it goes ("Back to Time").
 * Small phones show the chevron only (skin.css).
 */
export function BookingBack({ label, target, onBack }: { label: string; target: BookingBackTarget; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" className="bk-back" onClick={onBack} aria-label={label} title={label} data-qa="booking-back" data-target={target}>
      <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t("schedulerPage.back")}</span>
    </button>
  );
}
