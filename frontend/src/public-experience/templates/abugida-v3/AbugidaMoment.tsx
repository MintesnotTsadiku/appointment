import { useState, type CSSProperties } from "react";

import { Flourish } from "./art";
import "./moment.css";

/**
 * Abugida's booking-success moment, the "ink flourish": a rubric pen stroke writes itself across the
 * confirmation, then gold section marks settle at its ends. Decoration only (aria-hidden). With reduced
 * motion the flourish is already drawn and nothing moves. `data-done` turns true when the ink is dry.
 */
const MARKS = [{ x: 5, y: 16, d: 1500 }, { x: 90, y: 34, d: 1650 }, { x: 8, y: 70, d: 1800 }];

function reduced() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function AbugidaMoment() {
  const [done, setDone] = useState(reduced);
  return <div className="a3m" aria-hidden="true" data-qa="booking-moment" data-moment="ink-flourish" data-done={done}>
    <Flourish className="a3m-flourish" />
    {MARKS.map((mark, index) => <span key={index} className="a3m-mark" onAnimationEnd={index === MARKS.length - 1 ? () => setDone(true) : undefined}
      style={{ "--x": `${mark.x}%`, "--y": `${mark.y}%`, "--d": `${mark.d}ms` } as CSSProperties}>፠</span>)}
  </div>;
}
