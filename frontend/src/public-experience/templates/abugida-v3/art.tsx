import type { CSSProperties } from "react";

/*
 * Abugida v3 drawings: manuscript ornaments, the fidel window, drawn icons and the Arat Kilo map.
 * They use `currentColor` and the package's CSS variables, so palettes and dark mode recolour them.
 * Decoration only: every drawing is aria-hidden unless it carries a label (the map).
 * Paths that "ink in" have `pathLength={1}`; the CSS draws them with `stroke-dashoffset`.
 */
const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/**
 * The window of the hero photo: the silhouette of the fidel ሀ (an arch on two legs with a small
 * notch between the feet). Object-bounding-box units, so it fits any frame.
 */
export const HA_WINDOW = "M0 1V.4C0 .17.22 0 .5 0S1 .17 1 .4V1H.65V.9C.65 .865.62 .84.58 .84H.42C.38 .84.35 .865.35 .9V1Z";

/** The clip path of the fidel window; rendered once per page, referenced as `url(#a3-ha)`. */
export function HaClip() {
  return <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
    <clipPath id="a3-ha" clipPathUnits="objectBoundingBox"><path d={HA_WINDOW} /></clipPath>
  </svg>;
}

/** The ink outline of the fidel window. It draws like a pen stroke when the window opens. */
export function HaOutline({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 100 120" preserveAspectRatio="none" aria-hidden="true">
    <path pathLength={1} vectorEffect="non-scaling-stroke" fill="none" stroke="currentColor" strokeWidth="2.2"
      d="M0 120V48C0 20.4 22 0 50 0s50 20.4 50 48v72H65v-12c0-4.2-3.6-7.2-7-7.2H42c-3.4 0-7 3-7 7.2V120Z" />
  </svg>;
}

/** An illuminated corner: a small interlace knot with a gold dot, turned per corner by CSS. */
export function Corner({ className, style }: { className?: string; style?: CSSProperties }) {
  return <svg className={className} style={style} viewBox="0 0 40 40" aria-hidden="true">
    <g {...STROKE} strokeWidth={1.4}>
      <path pathLength={1} d="M2 38V14C2 7.4 7.4 2 14 2h24" />
      <path pathLength={1} d="M8 38V16a8 8 0 0 1 8-8h22" opacity=".55" />
      <path pathLength={1} d="M14 22c0-4.4 3.6-8 8-8 0 4.4-3.6 8-8 8Zm0 0c4.4 0 8 3.6 8 8-4.4 0-8-3.6-8-8Z" />
    </g>
    <circle cx="22" cy="22" r="2.2" className="a3-gold-fill" />
  </svg>;
}

/**
 * A manuscript rule: two hair lines with a rubric diamond and gold dots in the middle.
 * It draws from the centre outwards when its section enters (`data-reveal="rule"`).
 */
export function Rule({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 600 24" preserveAspectRatio="none" aria-hidden="true">
    <g fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke">
      <path pathLength={1} d="M282 9H0M282 15H0" />
      <path pathLength={1} d="M318 9h282M318 15h282" />
    </g>
    <path className="a3-rubric-fill" d="M300 2l10 10-10 10-10-10Z" />
    <circle cx="276" cy="12" r="2" className="a3-gold-fill" />
    <circle cx="324" cy="12" r="2" className="a3-gold-fill" />
  </svg>;
}

/** A woven tibeb strip: rubric diamonds and gold crosses on a band. A repeating pattern. */
export function Tibeb({ className, id }: { className?: string; id: string }) {
  return <svg className={className} viewBox="0 0 240 18" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <pattern id={id} width="24" height="18" patternUnits="userSpaceOnUse">
        <path d="M0 2h24M0 16h24" stroke="currentColor" strokeWidth="1" opacity=".55" />
        <path d="M12 4l5 5-5 5-5-5Z" className="a3-rubric-fill" />
        <path d="M0 9h3M21 9h3M12 7.5v3M10.5 9h3" stroke="var(--a3-gold)" strokeWidth="1.2" />
      </pattern>
    </defs>
    <rect width="240" height="18" fill={`url(#${id})`} />
  </svg>;
}

/** The pen line that points from a marginal note to the text it comments on. */
export function Pointer({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 160 80" aria-hidden="true">
    <path pathLength={1} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      d="M156 70C120 72 92 58 78 40S44 10 8 12" />
    <path pathLength={1} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M18 4 6 12l11 9" />
  </svg>;
}

export function Quill({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M40 6C26 8 15 18 11 33l-3 9" />
    <path d="M40 6c-2 10-9 19-21 24" />
    <path d="M19 22c4 0 8-1 12-3M15 28c3 0 6-.5 9-1.5" opacity=".6" />
    <path d="M6 44h14" />
  </svg>;
}

export function InkPot({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M14 22h20l4 8v10a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V30Z" />
    <path d="M18 22v-6h12v6M16 16h16" />
    <path d="M10 32h28" opacity=".55" />
    <path d="M30 10c3-4 7-5 10-4" />
  </svg>;
}

export function OpenBook({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M24 13C19 9 12 9 5 11v26c7-2 14-2 19 2 5-4 12-4 19-2V11c-7-2-14-2-19 2Z" />
    <path d="M24 13v26" />
    <path d="M10 18h8M10 23h9M30 18h8M29 23h9" opacity=".5" />
  </svg>;
}

export function Cups({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <path d="M7 24h14l-2 12a3 3 0 0 1-3 2.5h-4A3 3 0 0 1 9 36Z" />
    <path d="M27 24h14l-2 12a3 3 0 0 1-3 2.5h-4a3 3 0 0 1-3-2.5Z" />
    <path d="M12 18c0-3 3-3 3-6M32 18c0-3 3-3 3-6" opacity=".6" />
    <path d="M4 42h40" />
  </svg>;
}

export const BENEFIT_ART = [Quill, OpenBook, Cups, InkPot];

/**
 * A drawn map of the area around the rooms: the Arat Kilo roundabout with its column, the roads
 * toward Sidist Kilo, Piassa and Megenagna, the university campus and a pin on the rooms.
 * The label comes from the page (the place's name).
 */
export function AratKiloMap({ className, label }: { className?: string; label: string }) {
  return <svg className={className} viewBox="0 0 320 240" role="img" aria-label={label}>
    <rect width="320" height="240" className="a3-map-paper" />
    <g className="a3-map-campus"><path d="M176 18h120v78H176Z" /><path d="M186 28h100M186 40h100M186 52h100M186 64h100M186 76h100" opacity=".5" /></g>
    <g fill="none" stroke="currentColor" strokeLinecap="round" className="a3-map-roads">
      <path pathLength={1} strokeWidth="10" d="M-10 150C60 146 110 138 150 128" />
      <path pathLength={1} strokeWidth="10" d="M170 120C200 90 222 60 236 -10" />
      <path pathLength={1} strokeWidth="10" d="M174 132C220 150 270 168 330 176" />
      <path pathLength={1} strokeWidth="10" d="M156 136C150 176 140 210 132 250" />
      <path pathLength={1} strokeWidth="3" opacity=".5" d="M40 60c40 10 70 30 110 56M60 210c40-10 70-40 92-70" />
    </g>
    <circle cx="160" cy="128" r="22" className="a3-map-ring" />
    <path d="M160 108v-24" className="a3-map-column" />
    <circle cx="160" cy="82" r="3" className="a3-gold-fill" />
    {[[60, 100], [84, 112], [252, 120], [276, 132], [92, 196], [228, 200]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="7" className="a3-map-tree" />)}
    <g className="a3-map-pin" transform="translate(206 150)">
      <path d="M0 0c-9-13-14-20-14-28a14 14 0 0 1 28 0c0 8-5 15-14 28Z" />
      <circle cy="-28" r="5" className="a3-map-pin-dot" />
    </g>
  </svg>;
}

/** One calligraphic swash for the booking-success moment ("ink flourish"). */
export function Flourish({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 520 120" aria-hidden="true">
    <path className="a3m-stroke" pathLength={1} fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"
      d="M14 78C70 30 120 24 150 54s20 54-14 40 4-70 66-68 90 60 150 50 72-58 100-40-6 52-36 38 40-62 90-56" />
    <path className="a3m-stroke a3m-late" pathLength={1} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"
      d="M60 100c80 10 170 12 250 0s140-10 196-2" />
  </svg>;
}
