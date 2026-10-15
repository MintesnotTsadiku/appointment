import type { BookingSkin, StepMarkProps } from "../booking-skin";

/*
 * Abugida v3 on the booking pages ("Living Manuscript", continued). Speed and clarity first: no
 * parallax, marquee, count-up or moving image. The pages keep the manuscript's look: a parchment
 * header with a rubric double rule, a faint echo of the candle-lit desk (the night photo in dark
 * mode), manuscript-window frames with a gold line, Alegreya and Abyssinica SIL headings, and the
 * pressed-ink booking action. The step marks are Ge'ez numerals; they are decorative, and the flow
 * announces each step by name and number ("Step 2 of 4: Time"). Rules live in booking.css under
 * [data-bk-skin="abugida-v3"]. Visual parts of this package only.
 */

const GEEZ = ["", "፩", "፪", "፫", "፬"];

/** A small manuscript window with the step's Ge'ez numeral; a gold window once the step is done. */
function FolioMark({ index, state }: StepMarkProps) {
  return <svg className="a3k-mark" viewBox="0 0 24 28" width="24" height="28" aria-hidden="true" data-state={state}>
    <path className="a3k-mark-frame" d="M2 27V12a10 10 0 0 1 20 0v15z" />
    <text className="a3k-mark-num" x="12" y="19" textAnchor="middle" dominantBaseline="middle">{GEEZ[index] || index}</text>
  </svg>;
}

const text = (value: unknown) => (typeof value === "string" ? value : undefined);

export const abugidaBookingSkin: BookingSkin = {
  key: "abugida-language@3",
  name: "abugida-v3",
  frame: "arch",
  // The stylesheet loads only on this template's booking pages (kit, "Booking skins").
  style: () => import("./booking.css"),
  servicePhotoRoles: ["lesson1.abugida", "lesson2.abugida"],
  // The handoff stands on the candle-lit desk of the booking band, so the visitor has just seen it.
  backdropRole: "band.abugida",
  tokens: (brand, mode) => ({
    // Rubric red fills the booking action; the label is the palette's ink on the primary (AA in both modes).
    "--bk-action-bg": text(brand["--accent-primary"]) ? "var(--accent-primary)" : "#9e1c17",
    "--bk-action-ink": text(brand["--pe-color-on-primary"]) ? "var(--pe-color-on-primary)" : "#fff8ec",
    "--bk-action-radius": "3px",
    "--bk-action-shadow": mode === "dark"
      ? "0 0 0 1px rgba(255, 220, 200, .16), 0 8px 26px -8px color-mix(in srgb, var(--accent-primary) 60%, transparent)"
      : "0 1px 0 color-mix(in srgb, var(--accent-primary) 60%, #000), inset 0 0 0 1px rgba(255, 248, 236, .14)",
  }),
  StepMark: FolioMark,
};
