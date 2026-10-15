import type { CSSProperties } from "react";

import "./moment.css";

/**
 * Ergata's booking-success moment, "a calm glow": a warm lamp light blooms slowly behind the
 * confirmation, an arched window draws itself around the check, and a few motes of light rise and
 * fade. Decoration only (aria-hidden). With reduced motion the glow and the window rest, still.
 */
const MOTES: Array<[number, number, number]> = [[38, 0, 5], [46, 420, 4], [54, 180, 6], [61, 640, 4], [42, 900, 3], [58, 1100, 5]];

export default function ErgataMoment() {
  return <div className="eg2-moment" aria-hidden="true" data-qa="booking-moment" data-moment="glow">
    <span className="eg2-moment-glow" />
    <svg className="eg2-moment-arch" viewBox="0 0 160 180" preserveAspectRatio="xMidYMin meet">
      <path pathLength={1} d="M30 172V80a50 50 0 0 1 100 0v92" />
      <path className="eg2-moment-sill" pathLength={1} d="M18 172h124" />
    </svg>
    {MOTES.map(([x, delay, size], index) => <i key={index} className="eg2-mote" style={{ "--x": `${x}%`, "--d": `${delay}ms`, "--s": `${size}px` } as CSSProperties} />)}
  </div>;
}
