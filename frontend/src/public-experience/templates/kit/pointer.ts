import { useEffect, type RefObject } from "react";

import { allows, type MotionLevel } from "./core/motion";
import { glowPosition, magneticOffset, tiltAngles } from "./core/pointer";

const FINE = "(hover: hover) and (pointer: fine)";
const PROPERTIES = ["--mag-x", "--mag-y", "--glow-x", "--glow-y", "--tilt-x", "--tilt-y", "--pan-x", "--pan-y"];

function clear(item: HTMLElement): void {
  for (const name of PROPERTIES) item.style.removeProperty(name);
}

/**
 * Pointer effects for fine pointers only (never on touch), from "standard" motion:
 * - `[data-magnetic]` leans toward the pointer: `--mag-x`, `--mag-y` (px).
 * - `[data-glow]` gets the pointer position: `--glow-x`, `--glow-y` (%).
 * - `[data-tilt]` tilts toward the pointer: `--tilt-x`, `--tilt-y` (deg).
 * - `[data-pan]` (an image frame) gets `--pan-x`, `--pan-y` (-1 to 1) for hover zoom and pan.
 * One delegated listener on the root; values reset when the pointer leaves.
 */
export function usePointerEffects(root: RefObject<HTMLElement | null>, level: MotionLevel, key: unknown = null): void {
  useEffect(() => {
    const node = root.current;
    if (!node || !allows(level, "standard") || typeof window.matchMedia !== "function" || !window.matchMedia(FINE).matches) return undefined;
    const touched = new Set<HTMLElement>();
    let frame = 0;
    let last: PointerEvent | null = null;
    const set = (item: HTMLElement, name: string, value: string) => { item.style.setProperty(name, value); touched.add(item); };
    const apply = () => {
      frame = 0;
      const event = last;
      if (!event) return;
      const target = event.target instanceof Element ? event.target : null;
      const active = new Set<HTMLElement>();
      for (const [selector, write] of [
        ["[data-magnetic]", (item: HTMLElement, rect: DOMRect) => {
          const offset = magneticOffset(rect, event.clientX, event.clientY, Number(item.dataset.magnetic) || 6);
          set(item, "--mag-x", `${offset.x}px`); set(item, "--mag-y", `${offset.y}px`);
        }],
        ["[data-glow]", (item: HTMLElement, rect: DOMRect) => {
          const spot = glowPosition(rect, event.clientX, event.clientY);
          set(item, "--glow-x", `${spot.x}%`); set(item, "--glow-y", `${spot.y}%`);
        }],
        ["[data-tilt]", (item: HTMLElement, rect: DOMRect) => {
          const angle = tiltAngles(rect, event.clientX, event.clientY, Number(item.dataset.tilt) || 4);
          set(item, "--tilt-x", `${angle.x}deg`); set(item, "--tilt-y", `${angle.y}deg`);
        }],
        ["[data-pan]", (item: HTMLElement, rect: DOMRect) => {
          const spot = glowPosition(rect, event.clientX, event.clientY);
          set(item, "--pan-x", ((spot.x - 50) / 50).toFixed(2)); set(item, "--pan-y", ((spot.y - 50) / 50).toFixed(2));
        }],
      ] as const) {
        const item = target?.closest<HTMLElement>(selector);
        if (item && node.contains(item)) {
          write(item, item.getBoundingClientRect());
          active.add(item);
        }
      }
      touched.forEach((item) => {
        if (active.has(item)) return;
        clear(item);
        touched.delete(item);
      });
    };
    const onMove = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    const onLeave = () => { last = new PointerEvent("pointermove"); apply(); };
    node.addEventListener("pointermove", onMove, { passive: true });
    node.addEventListener("pointerleave", onLeave);
    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
      touched.forEach(clear);
    };
  }, [root, level, key]);
}
