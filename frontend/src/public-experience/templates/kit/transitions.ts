import { flushSync } from "react-dom";

import { allows, type MotionLevel } from "./core/motion";
import { coverRadius } from "./core/pointer";

/*
 * View Transitions helpers. Each falls back to an instant change when the browser has no View
 * Transitions API or the motion level is below "standard" (reduced motion is level "none").
 */

interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
}

type StartViewTransition = (update: () => void | Promise<void>) => ViewTransitionLike;

function starter(): StartViewTransition | null {
  const doc = typeof document === "undefined" ? null : (document as Document & { startViewTransition?: StartViewTransition });
  return doc?.startViewTransition ? doc.startViewTransition.bind(doc) : null;
}

const STYLE_ID = "kit-vt-style";

/** One small rule that turns off the default cross-fade while a circular reveal runs. */
function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = "html.kit-vt-circle::view-transition-old(root),html.kit-vt-circle::view-transition-new(root){animation:none;mix-blend-mode:normal}";
  document.head.appendChild(style);
}

/**
 * Switch light and dark with a circle that grows from the switch (or the pointer). `update` must
 * change the mode synchronously (a state setter); it runs inside `flushSync`.
 */
export function circularModeSwitch(origin: { clientX: number; clientY: number } | Element | null, update: () => void, level: MotionLevel): void {
  const start = starter();
  if (!start || !allows(level, "standard")) {
    update();
    return;
  }
  let x = window.innerWidth - 40;
  let y = 40;
  if (origin instanceof Element) {
    const rect = origin.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  } else if (origin && (origin.clientX || origin.clientY)) {
    x = origin.clientX;
    y = origin.clientY;
  }
  ensureStyle();
  const root = document.documentElement;
  root.classList.add("kit-vt-circle");
  const transition = start(() => { flushSync(update); });
  const radius = coverRadius(x, y, window.innerWidth, window.innerHeight);
  transition.ready.then(() => {
    root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: level === "expressive" ? 620 : 480, easing: "cubic-bezier(.2,.7,.2,1)", pseudoElement: "::view-transition-new(root)" });
  }).catch(() => undefined);
  transition.finished.finally(() => root.classList.remove("kit-vt-circle"));
}

function waitFor(selector: string, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    const started = performance.now();
    const check = () => {
      if (document.querySelector(selector) || performance.now() - started > timeout) resolve();
      else window.requestAnimationFrame(check);
    };
    check();
  });
}

/**
 * A booking action that morphs into the booking page's header. The clicked element and the target
 * (matched by `target`, for example `[data-vt-book]`) share `name` for the transition. Returns true
 * when it handled the click; otherwise the link navigates as usual.
 */
export function bookingTransition(
  event: { currentTarget: EventTarget | null; preventDefault: () => void; metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; button?: number },
  href: string,
  navigate: (to: string) => void,
  level: MotionLevel,
  options: { name?: string; target?: string; timeout?: number } = {},
): boolean {
  const start = starter();
  const element = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
  if (!start || !element || !allows(level, "standard") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.button ?? 0) !== 0 || !href.startsWith("/") || href.startsWith("//")) return false;
  event.preventDefault();
  const name = options.name || "pe-book";
  element.style.setProperty("view-transition-name", name);
  const transition = start(async () => {
    element.style.removeProperty("view-transition-name");
    flushSync(() => navigate(href));
    await waitFor(options.target || "[data-vt-book]", options.timeout || 1500);
  });
  transition.finished.catch(() => undefined);
  return true;
}
