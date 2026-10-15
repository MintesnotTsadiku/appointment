import { useEffect, type RefObject } from "react";
import { qaFitProbe } from "@/components/booking-states";

/**
 * Development only, for browser QA: with `?qa-fit=1` (kept for the tab's session) the picker writes `data-qa-fit` with the parts that are
 * fully inside the window (`summary`, `calendar`, `format`, `footer`, `bar`, `go`) and `no-page-scroll` when the
 * page itself does not scroll. Manifests assert `[data-qa-fit~="calendar"]`, because the runner has no
 * bounding-box assertion. Production builds ignore the parameter and never run the probe.
 */
const PARTS: Array<[string, string]> = [
  ["summary", '[data-qa="booking-summary"]'],
  ["calendar", '[data-qa="booking-calendar"]'],
  ["format", '[data-qa="booking-time-format"]'],
  ["zone", '[data-qa="booking-zone"]'],
  ["footer", '[data-qa="booking-picker-footer"]'],
  ["bar", '[data-qa="booking-bar"], [data-qa="booking-bar-empty"]'],
  ["go", '[data-qa="booking-continue"], [data-qa="manage-reschedule-confirm"]'],
  ["chosen", '[data-qa="booking-slot"][aria-pressed="true"]'],
];

function inside(element: Element | null, height: number, width: number) {
  if (!element) return false;
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0 && box.top >= -0.5 && box.left >= -0.5 && box.bottom <= height + 0.5 && box.right <= width + 0.5;
}

/** `parts` replaces the picker's list (the details step checks its summary, Confirm bar and footer). */
export function useFitProbe(root: RefObject<HTMLElement | null>, parts: Array<[string, string]> = PARTS) {
  useEffect(() => {
    if (!qaFitProbe()) return;
    const element = root.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const height = window.innerHeight;
      const width = document.documentElement.clientWidth;
      const fit = parts.filter(([, selector]) => inside(element.querySelector(selector) ?? document.querySelector(selector), height, width)).map(([name]) => name);
      if (document.documentElement.scrollHeight <= height + 1) fit.push("no-page-scroll");
      element.setAttribute("data-qa-fit", fit.join(" "));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new MutationObserver(schedule);
    observer.observe(element, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-pressed", "data-state"] });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    const timer = window.setInterval(schedule, 500);
    schedule();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.clearInterval(timer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [root, parts]);
}
