import type { BookingSkin, StepMarkProps } from "../booking-skin";
import "./booking.css";

/*
 * Tena v3 on the booking pages ("Clear Path", continued). Speed and clarity first: no parallax,
 * marquee, count-up or big moving image. The pages keep the clinic's signage: the teal header with a
 * dashed route line, a faint echo of the clinic front (the dusk photo in dark mode), signage-plate
 * photo frames with a yellow corner tab, open figures for times and prices, a teal booking action,
 * and yellow for "when" only: the chosen day and time are yellow plates. Each step is a stop on the
 * route. Rules live in booking.css under [data-bk-skin="tena-v3"]. Visual parts of this package only.
 */

/** A route stop for each step: a rounded plate with the step number, a tick once the step is done. */
function RouteStop({ index, state }: StepMarkProps) {
  return <svg className="t3k-mark" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" data-state={state}>
    <rect className="t3k-mark-plate" x="1.5" y="1.5" width="21" height="21" rx="6" />
    {state === "done"
      ? <path className="t3k-mark-tick" d="M7 12.5l3.2 3.2L17 9" />
      : <text className="t3k-mark-num" x="12" y="12.8" textAnchor="middle" dominantBaseline="middle">{index}</text>}
  </svg>;
}

const text = (value: unknown) => (typeof value === "string" ? value : "");

export const tenaBookingSkin: BookingSkin = {
  key: "tena-clinic@3",
  name: "tena-v3",
  // Signage plates: rounded frames, drawn as plates with a yellow tab in booking.css.
  frame: "rounded",
  servicePhotoRoles: ["care1.tena", "care2.tena", "care3.tena"],
  // The clinic front is the stage of the /book handoff, so the visitor has just seen it.
  backdropRole: "band.tena",
  tokens: (brand, mode) => ({
    // Open figures: the "Tena Figures" face draws the digits (no slashed zero); the brand face draws every other character.
    "--booking-font-body": `"Tena Figures", ${text(brand["--booking-font-body"]) || "sans-serif"}`,
    "--booking-font-display": `"Tena Figures", ${text(brand["--booking-font-display"]) || "sans-serif"}`,
    "--pe-font-ui": `"Tena Figures", ${text(brand["--pe-font-ui"]) || "sans-serif"}`,
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary, #ffffff)",
    "--bk-action-radius": "12px",
    "--bk-action-shadow": mode === "dark"
      ? "0 0 0 1px rgba(134, 211, 220, .35), 0 10px 28px -10px rgba(134, 211, 220, .55)"
      : "0 1px 0 rgba(255, 255, 255, .25) inset, 0 8px 20px -10px rgba(11, 85, 99, .7)",
  }),
  StepMark: RouteStop,
};
