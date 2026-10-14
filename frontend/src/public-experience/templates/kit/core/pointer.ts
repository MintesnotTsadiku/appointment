/**
 * Pointer math for magnetic buttons, pointer glow and tilt. Pure (tests load this file directly).
 * Rect is the element's bounding box; x and y are the pointer's client coordinates.
 */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

function centre(rect: Box, x: number, y: number): { dx: number; dy: number } {
  const dx = rect.width ? (x - (rect.left + rect.width / 2)) / (rect.width / 2) : 0;
  const dy = rect.height ? (y - (rect.top + rect.height / 2)) / (rect.height / 2) : 0;
  return { dx: Math.max(-1, Math.min(1, dx)), dy: Math.max(-1, Math.min(1, dy)) };
}

/** How far (px) a magnetic element leans toward the pointer; at most `strength` on each axis. */
export function magneticOffset(rect: Box, x: number, y: number, strength = 6): { x: number; y: number } {
  const { dx, dy } = centre(rect, x, y);
  return { x: Math.round(dx * strength * 10) / 10, y: Math.round(dy * strength * 10) / 10 };
}

/** Tilt angles (degrees) toward the pointer; at most `max` degrees. Positive x tilts the top edge away. */
export function tiltAngles(rect: Box, x: number, y: number, max = 4): { x: number; y: number } {
  const { dx, dy } = centre(rect, x, y);
  return { x: Math.round(-dy * max * 10) / 10, y: Math.round(dx * max * 10) / 10 };
}

/** Pointer position inside the element, in percent, for a radial glow. */
export function glowPosition(rect: Box, x: number, y: number): { x: number; y: number } {
  const px = rect.width ? ((x - rect.left) / rect.width) * 100 : 50;
  const py = rect.height ? ((y - rect.top) / rect.height) * 100 : 50;
  return { x: Math.round(Math.max(0, Math.min(100, px))), y: Math.round(Math.max(0, Math.min(100, py))) };
}

/** The radius (px) that covers the whole viewport from a point, for a circular reveal. */
export function coverRadius(x: number, y: number, width: number, height: number): number {
  return Math.ceil(Math.hypot(Math.max(x, width - x), Math.max(y, height - y)));
}
