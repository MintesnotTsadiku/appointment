import { useEffect, useState, type RefObject } from "react";

import { allows, easeOut, resolveMotion, revealDelay, viewProgress, type MotionLevel } from "./core/motion";
import { countFrame, parseCountable } from "./core/numbers";

/*
 * Headless motion hooks for template packages. They only write data attributes and CSS custom
 * properties; each template owns how a state looks. The page is complete without JavaScript:
 * templates scope hidden start states under `[data-motion-ready]`, which only these hooks set.
 */

const REDUCED = "(prefers-reduced-motion: reduce)";

function prefersReduced(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(REDUCED).matches;
}

/** The page's motion level; follows the visitor's reduced-motion setting live. */
export function useMotionLevel(designMotion: unknown): MotionLevel {
  const [reduced, setReduced] = useState(prefersReduced);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia(REDUCED);
    const update = () => setReduced(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return resolveMotion(designMotion, reduced);
}

/**
 * Reveals `[data-reveal]` items (a template picks the look per item, for example
 * `data-reveal="mask"`) by setting `data-revealed`. Children of `[data-reveal-stagger]` get `--i`
 * and `--reveal-delay` so lists enter in sequence. With level "none" every item shows at once.
 */
export function useReveal(root: RefObject<HTMLElement | null>, level: MotionLevel, key: unknown = null): void {
  useEffect(() => {
    const node = root.current;
    if (!node) return undefined;
    node.querySelectorAll<HTMLElement>("[data-reveal-stagger]").forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        const item = child as HTMLElement;
        item.style.setProperty("--i", String(index));
        item.style.setProperty("--reveal-delay", `${revealDelay(index)}ms`);
      });
    });
    const items = Array.from(node.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (level === "none" || typeof IntersectionObserver === "undefined") {
      items.forEach((item) => { item.dataset.revealed = "true"; });
      delete node.dataset.motionReady;
      return undefined;
    }
    const reveal = (item: Element) => {
      (item as HTMLElement).dataset.revealed = "true";
      observer.unobserve(item);
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) reveal(entry.target);
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    items.forEach((item) => observer.observe(item));
    // A jump (an anchor link, a fling, a tall full-page capture) can pass an item without an intersection.
    let frame = 0;
    const sweep = () => {
      frame = 0;
      for (const item of items) if (!item.dataset.revealed && item.getBoundingClientRect().top < window.innerHeight) reveal(item);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(sweep); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    node.dataset.motionReady = "true";
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [root, level, key]);
}

/** True when the browser runs CSS scroll-driven animations (`animation-timeline: view()`). */
export function supportsScrollTimeline(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timeline: view()");
}

/**
 * Scroll progress for `[data-scroll]` items (parallax layers, drawn SVG paths, progress motifs).
 * Where CSS scroll-driven animations run, the root gets `data-scroll-css` and the template's CSS
 * does the work. Elsewhere one passive, frame-throttled listener writes `--p` (0 to 1) on each
 * item in view. Below `needed` (default "standard") nothing moves.
 */
export function useScrollProgress(root: RefObject<HTMLElement | null>, level: MotionLevel, needed: MotionLevel = "standard", key: unknown = null): void {
  useEffect(() => {
    const node = root.current;
    if (!node) return undefined;
    if (!allows(level, needed)) {
      node.dataset.scroll = "off";
      return undefined;
    }
    if (supportsScrollTimeline()) {
      node.dataset.scroll = "css";
      return () => { delete node.dataset.scroll; };
    }
    node.dataset.scroll = "js";
    const items = Array.from(node.querySelectorAll<HTMLElement | SVGElement>("[data-scroll]"));
    const visible = new Set<Element>();
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) visible.add(entry.target); else visible.delete(entry.target);
      onScroll();
    });
    items.forEach((item) => observer ? observer.observe(item) : visible.add(item));
    let frame = 0;
    const write = () => {
      frame = 0;
      const height = window.innerHeight;
      visible.forEach((item) => {
        const rect = item.getBoundingClientRect();
        (item as HTMLElement).style.setProperty("--p", viewProgress(rect.top, rect.height, height).toFixed(3));
      });
    };
    function onScroll() { if (!frame) frame = window.requestAnimationFrame(write); }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
      delete node.dataset.scroll;
    };
  }, [root, level, needed, key]);
}

/**
 * Counts `[data-count]` numbers up once when they enter the view. The final text is in the DOM from
 * the start (and returns at the end), so screen readers and reduced motion get the real value.
 * `data-count="geez"` counts in Ge'ez numerals.
 */
export function useCountUp(root: RefObject<HTMLElement | null>, level: MotionLevel, locale = "en", key: unknown = null): void {
  useEffect(() => {
    const node = root.current;
    if (!node || !allows(level, "standard") || typeof IntersectionObserver === "undefined") return undefined;
    const frames = new Set<number>();
    const finals = new Map<HTMLElement, string>();
    const run = (item: HTMLElement) => {
      const final = item.textContent || "";
      finals.set(item, final);
      const countable = parseCountable(final);
      if (!countable || countable.value <= 1) return;
      const geez = item.dataset.count === "geez";
      const started = performance.now();
      const duration = level === "expressive" ? 1400 : 1000;
      const step = (time: number) => {
        const progress = (time - started) / duration;
        if (progress >= 1) { item.textContent = final; return; }
        item.textContent = countFrame(countable, easeOut(progress), { geez, locale });
        frames.add(window.requestAnimationFrame(step));
      };
      frames.add(window.requestAnimationFrame(step));
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        run(entry.target as HTMLElement);
      }
    }, { threshold: 0.4 });
    node.querySelectorAll<HTMLElement>("[data-count]").forEach((item) => observer.observe(item));
    return () => {
      observer.disconnect();
      frames.forEach((frame) => window.cancelAnimationFrame(frame));
      finals.forEach((final, item) => { item.textContent = final; });
    };
  }, [root, level, locale, key]);
}
