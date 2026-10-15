import type { CSSProperties } from "react";

import "./moment.css";

/**
 * Selam's booking-success moment, the "tempo burst": three lime rings beat out from the centre of the
 * confirmation like a pulse, and twelve short tempo ticks spring out around them. Decoration only
 * (aria-hidden). With reduced motion the rings rest, faint and still.
 */
const TICKS = Array.from({ length: 12 }, (_, index) => ({ angle: index * 30, delay: 120 + (index % 3) * 60, long: index % 3 === 0 }));

export default function SelamMoment() {
  return <div className="s3-moment" aria-hidden="true" data-qa="booking-moment" data-moment="tempo-burst">
    <div className="s3-burst">
      {[0, 1, 2].map((ring) => <i key={ring} className="s3-burst-ring" style={{ "--r": ring } as CSSProperties} />)}
      {TICKS.map((tick, index) => <b key={index} className="s3-burst-tick" data-long={tick.long}
        style={{ "--a": `${tick.angle}deg`, "--d": `${tick.delay}ms` } as CSSProperties} />)}
    </div>
  </div>;
}
