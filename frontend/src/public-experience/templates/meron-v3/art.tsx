import { useId, type CSSProperties } from "react";

/*
 * Meron v3 line drawings: the stitch line, the atelier tools, the tibeb border and the courtyard map.
 * They use `currentColor` and the package's custom properties, so palettes and dark mode recolour them.
 * Decoration only: every drawing is aria-hidden. Visual parts of this package only.
 */
const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * A running stitch that draws itself. The visible line is dashed (the stitches); a solid mask path
 * with `pathLength=1` reveals it. `mode="load"` draws once on load, `mode="scroll"` follows `--p`
 * (kit `useScrollProgress`, `data-scroll`). Without JavaScript or with reduced motion it is complete.
 */
export function Stitch({ d, viewBox, className, mode = "scroll", preserve = "none", style }: {
  d: string; viewBox: string; className?: string; mode?: "load" | "scroll"; preserve?: string; style?: CSSProperties;
}) {
  const id = `m3-stitch-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return <svg className={`m3-stitch ${className || ""}`} viewBox={viewBox} preserveAspectRatio={preserve} aria-hidden="true" data-stitch={mode} data-scroll={mode === "scroll" ? "" : undefined} style={style}>
    <defs>
      <mask id={id} maskUnits="userSpaceOnUse">
        <path className="m3-stitch-reveal" d={d} pathLength={1} fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
      </mask>
    </defs>
    <path className="m3-stitch-line" d={d} mask={`url(#${id})`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg>;
}

/** A straight seam between sections, with a needle and a loose end of thread. */
export function SeamRule({ className }: { className?: string }) {
  return <div className={`m3-seam ${className || ""}`} aria-hidden="true">
    <Stitch d="M0 6 L1000 6" viewBox="0 0 1000 12" className="m3-seam-line" />
    <Needle className="m3-seam-needle" />
  </div>;
}

export function Needle({ className, style }: { className?: string; style?: CSSProperties }) {
  return <svg className={className} style={style} viewBox="0 0 64 16" aria-hidden="true">
    <path d="M2 8c10-3.4 34-4.4 54-1.2l6 1.2-6 1.2C36 12.4 12 11.4 2 8Z" fill="currentColor" />
    <ellipse cx="48" cy="8" rx="5" ry="1.3" fill="var(--m3-needle-eye, #fff)" opacity=".85" />
  </svg>;
}

export function Shears({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <ellipse cx="12" cy="34" rx="6" ry="5" /><ellipse cx="12" cy="15" rx="6" ry="5" />
    <path d="M17 31 43 13M17 18l26 17" /><path d="M29 24h2" opacity=".6" />
  </svg>;
}

export function Chalk({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M10 30 26 14l8 8-16 16H10Z" /><path d="M22 18l8 8" opacity=".6" />
    <path d="M6 42c8-4 16 2 24-2s10-6 14-4" strokeDasharray="3 3" />
  </svg>;
}

export function Thread({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M14 8h20M14 40h20" /><path d="M16 8v32M32 8v32" opacity=".5" />
    <path d="M16 14c6 2 10 2 16 0M16 20c6 2 10 2 16 0M16 26c6 2 10 2 16 0M16 32c6 2 10 2 16 0" />
    <path d="M32 30c6 2 9 6 8 12" strokeDasharray="2.5 3" />
  </svg>;
}

export function Tape({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <circle cx="20" cy="22" r="13" /><circle cx="20" cy="22" r="4" />
    <path d="M33 24h12v8H30" />
    {[35, 38, 41].map((x) => <path key={x} d={`M${x} 24v3`} />)}
  </svg>;
}

export function Button({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <circle cx="24" cy="24" r="15" /><circle cx="24" cy="24" r="11" opacity=".5" />
    {[[20, 20], [28, 20], [20, 28], [28, 28]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.6" />)}
    <path d="M20 20l8 8M28 20l-8 8" opacity=".7" />
  </svg>;
}

export const BENEFIT_ART = [Tape, Chalk, Shears, Thread, Button];

/** A large typographic quotation mark. */
export function Quote({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 48" aria-hidden="true"><path fill="currentColor" d="M0 48V30C0 13 9 3 26 0l2 5C18 9 14 15 14 22h12v26Zm36 0V30c0-17 9-27 26-30l2 5c-10 4-14 10-14 17h12v26Z" /></svg>;
}

/**
 * A woven tibeb strip: a row of diamonds and small crosses in gold, wine and navy, as on the border of
 * a habesha dress. It tiles along its width.
 */
export function Tibeb({ className }: { className?: string }) {
  const id = `m3-tibeb-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return <svg className={`m3-tibeb ${className || ""}`} aria-hidden="true" preserveAspectRatio="none">
    <defs>
      <pattern id={id} width="36" height="18" patternUnits="userSpaceOnUse">
        <rect width="36" height="18" fill="var(--m3-tibeb-ground, #1f2e4d)" />
        <path d="M0 9 9 0l9 9-9 9Z" fill="var(--m3-tibeb-a, #b48a3c)" />
        <path d="M4.5 9 9 4.5 13.5 9 9 13.5Z" fill="var(--m3-tibeb-b, #5b1f2b)" />
        <path d="M18 9 27 0l9 9-9 9Z" fill="var(--m3-tibeb-b, #5b1f2b)" />
        <path d="M27 5v8M23 9h8" stroke="var(--m3-tibeb-a, #b48a3c)" strokeWidth="1.4" />
        <rect y="0" width="36" height="1.2" fill="var(--m3-tibeb-a, #b48a3c)" />
        <rect y="16.8" width="36" height="1.2" fill="var(--m3-tibeb-a, #b48a3c)" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>;
}

/**
 * The courtyard atelier drawn as a small map: two streets, the courtyard gate, a jasmine tree,
 * the atelier block with its fitting room and a pin. The labels are translated chrome strings and
 * the place's own name from the content.
 */
export function CourtyardMap({ place, labels }: { place: string; labels: { street: string; gate: string; courtyard: string; fitting: string } }) {
  return <svg className="m3-map-art" viewBox="0 0 480 360" aria-hidden="true">
    <rect width="480" height="360" className="m3-map-ground" />
    <g className="m3-map-blocks">
      <rect x="24" y="24" width="150" height="110" /><rect x="24" y="214" width="150" height="122" />
      <rect x="306" y="24" width="150" height="76" /><rect x="306" y="252" width="150" height="84" />
    </g>
    <path className="m3-map-street" d="M0 174H480M240 0V360" />
    <path className="m3-map-street-edge" d="M0 158H222M258 158H480M0 190H222M258 190H480M222 0V158M258 0V158M222 190V360M258 190V360" />
    <g className="m3-map-yard">
      <rect x="290" y="120" width="170" height="114" />
      <rect x="352" y="128" width="100" height="98" className="m3-map-atelier" />
      <rect x="402" y="136" width="42" height="40" className="m3-map-room" />
      <circle cx="318" cy="150" r="14" className="m3-map-tree" />
      <circle cx="318" cy="150" r="6" className="m3-map-tree" />
      <path d="M290 196h-32" className="m3-map-gate" />
    </g>
    <path className="m3-map-route" d="M240 174h30v22h20 M290 196h40v-20h70" pathLength={1} />
    <g className="m3-map-pin" transform="translate(423 140)">
      <path d="M0 -26c-9 0-15 6-15 14 0 10 15 24 15 24s15-14 15-24c0-8-6-14-15-14Z" />
      <circle cx="0" cy="-12" r="5" className="m3-map-pin-dot" />
    </g>
    <g className="m3-map-labels">
      <text x="12" y="150">{labels.street}</text>
      <text x="274" y="214" textAnchor="end">{labels.gate}</text>
      <text x="298" y="114">{labels.courtyard}</text>
      <text x="388" y="208" textAnchor="middle" className="m3-map-on-navy">{labels.fitting}</text>
      <text x="24" y="206" className="m3-map-place">{place}</text>
    </g>
  </svg>;
}
