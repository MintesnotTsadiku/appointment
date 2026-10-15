/**
 * The details step's frame, shared by the organization and the independent schedulers.
 * Wide (900 px container, as the time picker): the page fits the window; the summary column stays,
 * only the form scrolls (thin scrollbar, a fade while there is more) and the Confirm bar is always in view.
 * Narrow: the page scrolls, a compact summary on top, the Confirm bar fixed to the bottom of the screen.
 * Layout: docs/growth/BOOKING_LAYOUT.md, "The details step". Styles: details.css.
 */

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { WIDE_AT, useContainerWide } from "../DateTimeSelector";
import { useFitProbe } from "../DateTimeSelector/fitProbe";
import "./details.css";

/** Parts the QA fit probe (`?qa-fit=1`) checks on the details step. */
const FIT_PARTS: Array<[string, string]> = [
  ["summary", '[data-qa="booking-details-summary"]'],
  ["bar", '[data-qa="booking-confirm-bar"]'],
  ["go", '[data-qa="booking-confirm"], [data-qa="independent-booking-submit"]'],
  ["footer", '[data-qa="booking-details-footer"]'],
  ["powered", '[data-qa="booking-details-footer"] [data-powered-by]'],
];

export interface DetailsLayoutProps {
  /** The summary: the full card when wide, a compact card when narrow. */
  summary: (wide: boolean) => ReactNode;
  /** The form card's title block (stays in view on wide layouts). */
  head?: ReactNode;
  /** The form: fields, payment, errors. */
  children: ReactNode;
  /** The Confirm bar's content: the price (or the time) and the submit button. */
  bar: ReactNode;
  /** Quiet links (Powered by, My bookings): the summary column's footer, or above the bar on phones. */
  foot?: ReactNode;
  /** Fit the window on wide layouts (pages with the fixed booking header). */
  fit?: boolean;
  /** Label of the summary column. */
  summaryLabel: string;
}

/** Marks the scroll body `data-end` (no more below) and the scroller `data-scrolling` (for its scrollbar). */
function useScrollState(scroller: RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    const element = scroller.current;
    const body = element?.parentElement;
    if (!active || !element || !body) return;
    let timer = 0;
    const measure = () => {
      body.dataset.end = element.scrollTop + element.clientHeight >= element.scrollHeight - 4 ? "true" : "false";
    };
    const onScroll = () => {
      measure();
      element.dataset.scrolling = "true";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { element.dataset.scrolling = "false"; }, 900);
    };
    measure();
    element.addEventListener("scroll", onScroll, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    if (element.firstElementChild) observer?.observe(element.firstElementChild);
    return () => {
      element.removeEventListener("scroll", onScroll);
      observer?.disconnect();
      window.clearTimeout(timer);
    };
  }, [scroller, active]);
}

/**
 * Phones: a focused field stays above the fixed Confirm bar and the on-screen keyboard.
 * Browsers scroll a focused field into view, but not always past a fixed bar, and the keyboard opens later.
 */
function useFocusAboveBar(root: RefObject<HTMLDivElement | null>, active: boolean) {
  useEffect(() => {
    const element = root.current;
    if (!active || !element) return;
    const timers: number[] = [];
    const keep = (target: HTMLElement) => {
      if (document.activeElement !== target) return;
      const bar = element.querySelector<HTMLElement>(".bk-details-bar");
      const viewport = window.visualViewport;
      const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      const limit = Math.min(visibleBottom, bar ? bar.getBoundingClientRect().top : visibleBottom) - 12;
      const box = target.getBoundingClientRect();
      if (box.bottom > limit) window.scrollBy({ top: box.bottom - limit, behavior: "auto" });
    };
    const onFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !target.matches("input, textarea, select, [contenteditable='true']")) return;
      // Now, and again after the keyboard has opened.
      timers.push(window.setTimeout(() => keep(target), 60), window.setTimeout(() => keep(target), 380));
    };
    element.addEventListener("focusin", onFocus);
    return () => {
      element.removeEventListener("focusin", onFocus);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [root, active]);
}

/** Scrolls a field into view (inside the form on wide layouts, the page on phones) and focuses it. */
export function focusField(id: string) {
  const field = document.getElementById(id);
  if (!field) return;
  const smooth = typeof window.matchMedia === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  field.scrollIntoView({ block: "center", behavior: smooth ? "smooth" : "auto" });
  field.focus({ preventScroll: true });
}

export function DetailsLayout({ summary, head, children, bar, foot, fit = true, summaryLabel }: DetailsLayoutProps) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const wide = useContainerWide(root, WIDE_AT, true);
  useFitProbe(root, FIT_PARTS);
  useScrollState(scroller, wide && fit);
  useFocusAboveBar(root, !wide);
  const footer = foot ? <div className="bk-details-foot" data-qa="booking-details-footer">{foot}</div> : null;

  // One tree for both layouts, so the form never remounts (and keeps focus) when the width changes.
  return (
    <div ref={root} className="bk-details" data-qa="booking-details-layout" data-wide={wide ? "true" : "false"} data-fit={fit ? "true" : "false"}>
      <div className="bk-details-grid">
        <aside className="bk-details-aside" aria-label={summaryLabel}>
          {summary(wide)}
          {wide && footer}
        </aside>
        <section className="bk-details-main bk-card">
          {head && <div className="bk-details-head">{head}</div>}
          <div className="bk-details-body" data-end="true">
            <div ref={scroller} className="bk-details-scroll" data-qa="booking-details-scroll">
              <div className="bk-details-content">{children}</div>
            </div>
            <div className="bk-details-fade" aria-hidden="true" />
          </div>
          <div className="bk-details-bar" data-qa="booking-confirm-bar">{bar}</div>
        </section>
        {!wide && footer}
      </div>
    </div>
  );
}

/** The left side of the Confirm bar: the price with its label, or the chosen time when there is no price (`compact`: smaller, two lines). */
export function BarAmount({ label, value, detail, compact = false }: { label?: string; value: ReactNode; detail?: ReactNode; compact?: boolean }) {
  return (
    <p className="bk-details-price" data-qa="booking-confirm-amount" data-compact={compact ? "true" : "false"}>
      {label && <small>{label}</small>}
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </p>
  );
}
