import type { BookingSkin, StepMarkProps } from "../booking-skin";
import "./booking.css";

/*
 * Meron v3 on the booking pages ("The Fitting Room", continued). Speed and clarity first: no parallax,
 * marquee, count-up or big moving image. The pages keep the atelier's look: a navy bar with a gold
 * stitch line, a faint echo of the fitting-room photo (the night photo in dark mode), garment-tag
 * frames with cut corners and a punched hole, square corners everywhere, Garamond headings, a navy
 * booking action with a stitched inner line, and wine marks. Rules live in booking.css under
 * [data-bk-skin="meron-v3"]. Visual parts of this package only.
 */

/** A small garment tag for each step; a cross-stitch inside once the step is done. */
function TagMark({ index, state }: StepMarkProps) {
  return <svg className="m3k-mark" viewBox="0 0 24 26" width="22" height="24" aria-hidden="true" data-state={state}>
    <path className="m3k-mark-tag" d="M7 1h10l6 6v18H1V7z" />
    <circle className="m3k-mark-hole" cx="12" cy="6" r="1.6" />
    {state === "done"
      ? <path className="m3k-mark-cross" d="M8 12l8 8M16 12l-8 8" />
      : <text className="m3k-mark-num" x="12" y="17.5" textAnchor="middle" dominantBaseline="middle">{index}</text>}
  </svg>;
}

export const meronBookingSkin: BookingSkin = {
  key: "meron-atelier@3",
  name: "meron-v3",
  frame: "square",
  // The same photos as the landing page's garment tags, by the service's place.
  servicePhotoRoles: ["loop1.meron", "story1.meron", "loop3.meron"],
  // The fitting room is the stage of the /book handoff, so the visitor has just seen it.
  backdropRole: "band.meron",
  tokens: (_brand, mode) => ({
    "--bk-action-bg": mode === "dark" ? "#e8edf6" : "#1f2e4d",
    "--bk-action-ink": mode === "dark" ? "#101a30" : "#ffffff",
    "--bk-action-radius": "0px",
    "--bk-action-shadow": mode === "dark"
      ? "inset 0 0 0 4px #e8edf6, inset 0 0 0 5px rgba(16, 26, 48, .4), 0 12px 30px -12px rgba(214, 178, 106, .45)"
      : "inset 0 0 0 4px #1f2e4d, inset 0 0 0 5px rgba(255, 255, 255, .45)",
  }),
  StepMark: TagMark,
};
