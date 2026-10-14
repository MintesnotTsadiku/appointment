import type { CSSProperties } from "react";

import { Petal } from "./art";
import "./moment.css";

/**
 * Bloom's booking-success moment: marigold and rose petals drift down over the confirmation.
 * Decoration only (aria-hidden). With reduced motion a few petals rest at the top, without movement.
 */
const PETALS = [
  { x: 6, delay: 0, size: 18, turn: 140, hue: "a" }, { x: 18, delay: 120, size: 14, turn: -90, hue: "b" },
  { x: 29, delay: 60, size: 20, turn: 200, hue: "a" }, { x: 41, delay: 220, size: 12, turn: -160, hue: "c" },
  { x: 52, delay: 30, size: 16, turn: 120, hue: "b" }, { x: 63, delay: 180, size: 22, turn: -220, hue: "a" },
  { x: 74, delay: 90, size: 13, turn: 160, hue: "c" }, { x: 85, delay: 260, size: 18, turn: -120, hue: "b" },
  { x: 93, delay: 40, size: 15, turn: 180, hue: "a" }, { x: 12, delay: 320, size: 12, turn: 90, hue: "c" },
  { x: 47, delay: 380, size: 14, turn: -140, hue: "a" }, { x: 79, delay: 440, size: 16, turn: 110, hue: "b" },
];

export default function BloomMoment() {
  return <div className="b3-moment" aria-hidden="true" data-qa="booking-moment" data-moment="petals">
    {PETALS.map((petal, index) => <Petal key={index} className={`b3-petal b3-petal-${petal.hue}`}
      style={{ "--x": `${petal.x}%`, "--d": `${petal.delay}ms`, "--s": `${petal.size}px`, "--r": `${petal.turn}deg` } as CSSProperties} />)}
  </div>;
}
