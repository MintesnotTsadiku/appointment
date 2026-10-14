/**
 * Motion levels and timing. Pure: no DOM, no React (tests load this file directly).
 *
 * The compiled design carries the owner's level ("calm", "standard" or "expressive").
 * `prefers-reduced-motion` always wins: the level becomes "none" and every reveal
 * shows its final state at once.
 */
export type MotionLevel = "none" | "calm" | "standard" | "expressive";

const ORDER: Record<MotionLevel, number> = { none: 0, calm: 1, standard: 2, expressive: 3 };

/** The level a page uses: the design's level, or "none" when the visitor asks for reduced motion. */
export function resolveMotion(designMotion: unknown, reduced: boolean): MotionLevel {
  if (reduced) return "none";
  return designMotion === "expressive" || designMotion === "standard" || designMotion === "calm" ? designMotion : "standard";
}

/** True when `level` is at least `needed` (for example parallax needs "standard"). */
export function allows(level: MotionLevel, needed: MotionLevel): boolean {
  return ORDER[level] >= ORDER[needed];
}

/** Stagger delay in milliseconds for the item at `index`, capped so long lists do not wait. */
export function revealDelay(index: number, step = 70, max = 420): number {
  return Math.min(Math.max(0, index) * step, max);
}

/** Delay and duration of a mask reveal (clip-path opening) for the item at `index`. */
export function maskTiming(index: number, level: MotionLevel): { delay: number; duration: number } {
  if (level === "none") return { delay: 0, duration: 0 };
  const duration = level === "expressive" ? 1100 : level === "standard" ? 800 : 520;
  return { delay: revealDelay(index, level === "expressive" ? 110 : 80, 480), duration };
}

/** Progress (0 to 1) of an element through the viewport: 0 when its top meets the bottom edge, 1 when its bottom leaves the top. */
export function viewProgress(top: number, height: number, viewport: number): number {
  const total = viewport + height;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, (viewport - top) / total));
}

/** Ease-out cubic, for count-ups and drawn lines. */
export function easeOut(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}
