import type { CSSProperties } from "react";

/*
 * Bloom v3 line drawings. They use `currentColor`, so palettes and dark mode recolour them.
 * Decoration only: every drawing is aria-hidden.
 */
const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function Comb({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M8 18h32a2 2 0 0 1 2 2v4H6v-4a2 2 0 0 1 2-2Z" />
    {Array.from({ length: 9 }, (_, index) => <path key={index} d={`M${9 + index * 3.75} 24v14`} />)}
  </svg>;
}

export function Mirror({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M12 40V20a12 12 0 0 1 24 0v20Z" />
    <path d="M17 40V21a7 7 0 0 1 14 0v19" opacity=".55" />
    {[[12, 22], [14, 14], [19, 9], [24, 7.5], [29, 9], [34, 14], [36, 22]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" fill="currentColor" stroke="none" />)}
  </svg>;
}

export function Leaf({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M10 38C10 20 22 9 40 8c0 18-11 30-30 30Z" />
    <path d="M10 38 30 18" />
    <path d="M18 30h8M22 26v-7" opacity=".6" />
  </svg>;
}

export function Scissors({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <circle cx="13" cy="34" r="5" /><circle cx="13" cy="14" r="5" />
    <path d="M17 31 40 12M17 17l23 19" />
  </svg>;
}

export const BENEFIT_ART = [Comb, Mirror, Leaf, Scissors];

/** A large typographic quotation mark. */
export function Quote({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 48" aria-hidden="true"><path fill="currentColor" d="M0 48V28C0 12 8 3 24 0l2 6C17 9 13 15 13 22h11v26Zm38 0V28c0-16 8-25 24-28l2 6c-9 3-13 9-13 16h11v26Z" /></svg>;
}

/** One petal; the success moment scatters copies of it. */
export function Petal({ className, style }: { className?: string; style?: CSSProperties }) {
  return <svg className={className} style={style} viewBox="0 0 24 32" aria-hidden="true"><path fill="currentColor" d="M12 0C4 8 0 15 2 22c2 6 6 10 10 10s8-4 10-10c2-7-2-14-10-22Z" /><path d="M12 6v22" stroke="rgba(255,255,255,.35)" strokeWidth="1" fill="none" /></svg>;
}

/** The drawn curl that links the visit steps; drawn on scroll (`data-scroll`, `pathLength=1`). */
export function Curl({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 120 900" preserveAspectRatio="none" aria-hidden="true">
    <path data-scroll="" pathLength={1} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      d="M60 0C110 90 10 150 60 240s50 160 0 230-60 150 0 220 30 140 0 210" />
  </svg>;
}
