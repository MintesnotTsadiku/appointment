/*
 * Tena v3 line drawings: wayfinding pictograms, the signage arrow, the area map and the plates.
 * They use `currentColor` and the package's custom properties, so palettes and dark mode recolour them.
 * Decoration only: every drawing is aria-hidden.
 */
const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** The oversized wayfinding arrow of the hero: it draws from the headline down to the booking action. */
export function SignArrow({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 132 96" aria-hidden="true">
    <path className="t3-arrow-line" pathLength={1} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
      d="M10 6v34a24 24 0 0 0 24 24h80" />
    <path className="t3-arrow-head" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" d="M98 46l18 18-18 18" />
  </svg>;
}

/** A booked time: a clock on a plate. */
export function ClockSign({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <rect x="4" y="4" width="40" height="40" rx="10" />
    <circle cx="24" cy="24" r="11" />
    <path d="M24 17v7l5 3" />
  </svg>;
}

/** Plain-language next steps: two speech plates. */
export function TalkSign({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <rect x="4" y="4" width="40" height="40" rx="10" />
    <path d="M12 14h16a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-9l-5 4v-4h-2a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z" />
    <path d="M31 21h5a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-1v3l-4-3h-6a3 3 0 0 1-3-3" opacity=".7" />
  </svg>;
}

/** Respectful boundaries: an open hand under a shield line. */
export function CareSign({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <rect x="4" y="4" width="40" height="40" rx="10" />
    <path d="M24 11c4 3 8 3 10 3v8c0 7-5 11-10 13-5-2-10-6-10-13v-8c2 0 6 0 10-3Z" />
    <path d="M19 23l4 4 7-7" />
  </svg>;
}

/** Arrival: a door with a floor line. */
export function DoorSign({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 48 48" aria-hidden="true" {...STROKE}>
    <rect x="4" y="4" width="40" height="40" rx="10" />
    <path d="M16 36V13h16v23" /><path d="M12 36h24" /><circle cx="28" cy="25" r="1.4" fill="currentColor" stroke="none" />
  </svg>;
}

export const BENEFIT_SIGNS = [ClockSign, TalkSign, CareSign, DoorSign];

/** A signage plate with a quotation mark, for reviews. */
export function Plate({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 56 40" aria-hidden="true">
    <rect x="1" y="1" width="54" height="38" rx="9" fill="currentColor" />
    <path fill="var(--t3-plate-ink, #1d1a0e)" d="M14 29v-7c0-6 3-9 9-10l1 3c-3 1-5 3-5 6h4v8Zm15 0v-7c0-6 3-9 9-10l1 3c-3 1-5 3-5 6h4v8Z" />
  </svg>;
}

/** A small check plate (the confirmation and the "done" steps). */
export function CheckPlate({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
    <rect x="1" y="1" width="30" height="30" rx="8" fill="currentColor" />
    <path d="M9 16.5l4.5 4.5L23 11.5" fill="none" stroke="var(--t3-plate-ink, #1d1a0e)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

/**
 * A drawn map of the streets around the clinic: blocks, a ring road, a park and the clinic pin.
 * No words in the drawing; the page writes the place name and the address next to it.
 */
export function AreaMap({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 360 240" aria-hidden="true">
    <rect width="360" height="240" rx="18" className="t3-map-ground" />
    <path className="t3-map-park" d="M226 150c18-12 52-14 70 0 14 11 12 34-6 44-20 11-56 10-70-4-12-12-8-30 6-40Z" />
    <g className="t3-map-block">
      <rect x="24" y="24" width="70" height="46" rx="6" /><rect x="108" y="24" width="88" height="46" rx="6" /><rect x="212" y="24" width="56" height="46" rx="6" />
      <rect x="282" y="24" width="54" height="80" rx="6" /><rect x="24" y="86" width="70" height="60" rx="6" /><rect x="24" y="162" width="70" height="54" rx="6" />
      <rect x="108" y="162" width="92" height="54" rx="6" />
    </g>
    <g className="t3-map-road" fill="none" strokeLinecap="round">
      <path d="M0 78h360M101 0v240M204 0v150M0 154h214" />
      <path d="M204 150c20 36 60 70 156 82" />
    </g>
    <path className="t3-map-route" pathLength={1} fill="none" strokeLinecap="round" strokeLinejoin="round" d="M101 236V154h50v-34h28" />
    <g transform="translate(176 92)">
      <rect className="t3-map-pin" x="-4" y="-4" width="40" height="40" rx="10" />
      <path d="M16 6v20M6 16h20" stroke="var(--t3-on-primary, #fff)" strokeWidth="4" strokeLinecap="round" />
    </g>
  </svg>;
}
