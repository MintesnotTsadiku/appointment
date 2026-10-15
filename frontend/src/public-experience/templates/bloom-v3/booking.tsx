import type { BookingSkin, StepMarkProps } from "../booking-skin";
import { accentInk } from "./ink";
import "./booking.css";

/*
 * Bloom v3 on the booking pages ("Golden Hour Salon", continued). Speed and clarity first: no
 * parallax, marquee, count-up or big moving image. The pages keep the salon's look: the deep plum
 * bar with a marigold line, a faint echo of the booking-band photo (the night photo in dark mode),
 * round-top mirror frames with a rose-gold line, oval stylist portraits, Anton headings, and a
 * marigold booking action with the offset shadow. Rules live in booking.css under
 * [data-bk-skin="bloom-v3"]. Visual parts of this package only.
 */

/** A small round-top mirror for each step; a tick inside once the step is done. */
function MirrorMark({ index, state }: StepMarkProps) {
  return <svg className="b3k-mark" viewBox="0 0 22 26" width="22" height="26" aria-hidden="true" data-state={state}>
    <path className="b3k-mark-frame" d="M2 25V11a9 9 0 0 1 18 0v14z" />
    {state === "done"
      ? <path className="b3k-mark-tick" d="M6.5 15.5l3 3 6-6.5" />
      : <text className="b3k-mark-num" x="11" y="16.5" textAnchor="middle" dominantBaseline="middle">{index}</text>}
  </svg>;
}

const text = (value: unknown) => (typeof value === "string" ? value : undefined);

export const bloomBookingSkin: BookingSkin = {
  key: "bloom-hair@3",
  name: "bloom-v3",
  frame: "mirror",
  servicePhotoRoles: ["menu1.bloom", "menu2.bloom", "menu3.bloom"],
  // The booking band is the stage of the /book handoff, so the visitor has just seen it.
  backdropRole: "band.bloom",
  tokens: (brand, mode) => {
    // Marigold fills booking actions only. The label colour keeps AA on the published accent.
    const ink = accentInk(text(brand["--accent-secondary"]), [
      text(brand["--pe-color-on-primary"]), text(brand["--text-primary"]), text(brand["--bg-primary"]), "#ffffff",
    ]);
    return {
      "--bk-action-bg": "var(--accent-secondary)",
      "--bk-action-ink": ink,
      "--bk-action-radius": "999px",
      "--bk-action-shadow": mode === "dark"
        ? "0 0 0 1px rgba(255, 255, 255, .12), 0 10px 30px -8px color-mix(in srgb, var(--accent-secondary) 55%, transparent)"
        : "5px 5px 0 0 color-mix(in srgb, #e7a1a8 75%, var(--accent-primary))",
    };
  },
  StepMark: MirrorMark,
};
