import type { CSSProperties } from "react";

import "./moment.css";

/**
 * Tena's booking-success moment, "a check along the route": a dashed route line draws across the
 * confirmation header from both sides, four stops light up in turn, and a signal-yellow plate settles
 * behind the check. Decoration only (aria-hidden). With reduced motion the finished route shows at once.
 */
const ROUTES = ["M0 132C70 132 96 64 176 64h56", "M600 132C530 132 504 64 424 64h-56"];
const STOPS: Array<[number, number]> = [[176, 64], [424, 64], [70, 117], [530, 117]];

export default function TenaMoment() {
  return <div className="t3-moment" aria-hidden="true" data-qa="booking-moment" data-moment="route">
    <svg className="t3-moment-art" viewBox="0 0 600 160" preserveAspectRatio="xMidYMin meet">
      {ROUTES.map((route) => <path key={`b${route}`} className="t3-moment-base" d={route} />)}
      {ROUTES.map((route) => <path key={route} className="t3-moment-route" pathLength={1} d={route} />)}
      {STOPS.map(([x, y], index) => <rect key={`${x}-${y}`} className="t3-moment-stop" x={x - 7} y={y - 7} width="14" height="14" rx="4"
        style={{ "--d": `${500 - index * 120}ms` } as CSSProperties} />)}
      <rect className="t3-moment-plate" x="252" y="16" width="96" height="96" rx="26" />
    </svg>
  </div>;
}
