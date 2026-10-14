import { useCallback, useEffect, useState, type RefObject } from "react";

import { allows, type MotionLevel } from "./core/motion";

export type MarqueeState = "running" | "paused" | "static";

/**
 * A marquee controller with a pause button (WCAG 2.2.2). It sets `data-marquee` on the track to
 * "running", "paused" or "static"; the template's CSS moves the track only while it is "running".
 * It pauses while the pointer or the keyboard focus is inside, while the track is off screen and
 * while the tab is hidden. Below "standard" motion it is "static" (the template shows a grid).
 */
export function useMarquee(track: RefObject<HTMLElement | null>, level: MotionLevel): { state: MarqueeState; paused: boolean; userPaused: boolean; toggle: () => void } {
  const moving = allows(level, "standard");
  const [userPaused, setUserPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const state: MarqueeState = !moving ? "static" : userPaused || held ? "paused" : "running";

  useEffect(() => {
    const node = track.current;
    if (!node) return undefined;
    node.dataset.marquee = state;
    return undefined;
  }, [track, state]);

  useEffect(() => {
    const node = track.current;
    if (!node || !moving) return undefined;
    let hover = false;
    let focus = false;
    let offscreen = false;
    const update = () => setHeld(hover || focus || offscreen || document.hidden);
    const enter = () => { hover = true; update(); };
    const leave = () => { hover = false; update(); };
    const focusIn = () => { focus = true; update(); };
    const focusOut = (event: FocusEvent) => { if (!node.contains(event.relatedTarget as Node | null)) { focus = false; update(); } };
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => { offscreen = !entry.isIntersecting; update(); });
    observer?.observe(node);
    node.addEventListener("pointerenter", enter);
    node.addEventListener("pointerleave", leave);
    node.addEventListener("focusin", focusIn);
    node.addEventListener("focusout", focusOut);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer?.disconnect();
      node.removeEventListener("pointerenter", enter);
      node.removeEventListener("pointerleave", leave);
      node.removeEventListener("focusin", focusIn);
      node.removeEventListener("focusout", focusOut);
      document.removeEventListener("visibilitychange", update);
    };
  }, [track, moving]);

  const toggle = useCallback(() => setUserPaused((value) => !value), []);
  // `userPaused` drives the pause button (the visitor's choice); `paused` also covers hover, focus and off-screen holds.
  return { state, paused: state !== "running", userPaused, toggle };
}
