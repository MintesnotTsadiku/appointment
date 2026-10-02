import { useEffect, useState, type RefObject } from "react";

/**
 * Headless motion behavior shared by template packages. It only sets data
 * attributes; each template owns how revealed or scrolled states look.
 *
 * `useReveal` marks the root `data-motion-ready` once observing starts, then
 * marks each `[data-reveal]` child `data-revealed` when it enters the viewport.
 * Templates scope their hidden start state under `[data-motion-ready]`, so the
 * page is complete without JavaScript and under reduced motion.
 */
export function useReveal(root: RefObject<HTMLElement | null>, key: unknown = null): void {
  useEffect(() => {
    const node = root.current;
    if (!node) return undefined;
    const items = Array.from(node.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      items.forEach((item) => { item.dataset.revealed = "true"; });
      return undefined;
    }
    const reveal = (item: Element) => {
      (item as HTMLElement).dataset.revealed = "true";
      observer.unobserve(item);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
    items.forEach((item) => observer.observe(item));
    // A fast jump (an anchor link, a long fling) can carry an item past the viewport
    // without it ever intersecting. Anything already above the fold's bottom is shown.
    let frame = 0;
    const sweep = () => {
      frame = 0;
      for (const item of items) {
        if (!item.dataset.revealed && item.getBoundingClientRect().top < window.innerHeight) reveal(item);
      }
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(sweep); };
    window.addEventListener("scroll", onScroll, { passive: true });
    node.dataset.motionReady = "true";
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [root, key]);
}

export interface ScrollState {
  scrolled: boolean;
  direction: "up" | "down";
}

/** One passive, frame-throttled scroll reading for header behavior. */
export function useScrollState(threshold = 24): ScrollState {
  const [state, setState] = useState<ScrollState>({ scrolled: false, direction: "up" });
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const direction = y > last + 4 ? "down" : y < last - 4 ? "up" : null;
      last = y;
      setState((current) => {
        const next = { scrolled: y > threshold, direction: direction || current.direction };
        return next.scrolled === current.scrolled && next.direction === current.direction ? current : next;
      });
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(read); };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold]);
  return state;
}
