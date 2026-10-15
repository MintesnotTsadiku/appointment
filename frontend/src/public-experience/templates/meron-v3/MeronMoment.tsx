import "./moment.css";

/**
 * Meron's booking-success moment, "a stitch": a needle runs a line of stitches across the confirmation
 * header and ties it off with a small knot and a tag. Decoration only (aria-hidden). With reduced motion
 * the stitched line and the tag rest in place, without movement.
 */
const SEAM = "M-10 34 C 110 14, 200 52, 300 30 S 470 12, 560 30";

export default function MeronMoment() {
  return <div className="m3-moment" aria-hidden="true" data-qa="booking-moment" data-moment="stitch">
    <svg className="m3-moment-art" viewBox="0 0 680 220" preserveAspectRatio="xMidYMin meet">
      <defs>
        <mask id="m3-moment-mask" maskUnits="userSpaceOnUse">
          <path className="m3-moment-reveal" d={SEAM} pathLength={1} fill="none" stroke="#fff" strokeWidth="12" />
        </mask>
      </defs>
      <path className="m3-moment-thread" d={SEAM} mask="url(#m3-moment-mask)" />
      <g className="m3-moment-needle">
        <path d="M-30 0c10-3.4 34-4.4 50-1.2l8 1.2-8 1.2C4 4.4-20 3.4-30 0Z" />
        <ellipse cx="12" cy="0" rx="4.5" ry="1.2" className="m3-moment-eye" />
      </g>
      <g className="m3-moment-tag" transform="translate(560 30)">
        <path d="M0 0v22" className="m3-moment-string" />
        <path d="M-14 30h28v30h-28z" className="m3-moment-card" />
        <path d="M-14 30l6-8h16l6 8" className="m3-moment-card" />
        <circle cx="0" cy="28" r="2.4" className="m3-moment-eye" />
      </g>
    </svg>
  </div>;
}
