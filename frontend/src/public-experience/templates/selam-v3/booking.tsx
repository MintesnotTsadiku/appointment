import type { BookingSkin, StepMarkProps } from "../booking-skin";
import { limeInk } from "./ink";
import "./booking.css";

/*
 * Selam v3 on the booking pages ("Tempo", continued). Speed and clarity first: no parallax, marquee,
 * count-up or big moving image. The pages keep the studio's look: the deep moss bar with the lime tempo
 * line, a faint echo of the booking-band photo (the night photo in dark mode), tall pill photo frames,
 * Figtree Black headings (Menbere Bold in Amharic) and the lime booking action with its dark "go" beat.
 * Rules live in booking.css under [data-bk-skin="selam-v3"]. Visual parts of this package only.
 */

/** A small beat for each step: a pill with the number, lime for the current step, a tick once done. */
function BeatMark({ index, state }: StepMarkProps) {
  return <svg className="s3k-mark" viewBox="0 0 30 18" width="30" height="18" aria-hidden="true" data-state={state}>
    <rect className="s3k-mark-pill" x="1" y="1" width="28" height="16" rx="8" />
    {state === "done"
      ? <path className="s3k-mark-tick" d="M10 9.2l3.2 3 6.2-6.4" />
      : <text className="s3k-mark-num" x="15" y="9.6" textAnchor="middle" dominantBaseline="middle">{index}</text>}
  </svg>;
}

const text = (value: unknown) => (typeof value === "string" ? value : undefined);

export const selamBookingSkin: BookingSkin = {
  key: "selam-movement@3",
  name: "selam-v3",
  // Tall pills come from booking.css; the shared frame keeps rounded corners for the avatars.
  frame: "rounded",
  servicePhotoRoles: ["session1.selam", "session2.selam"],
  // The handoff shows the booking-band studio, so the visitor has just seen it.
  backdropRole: "band.selam",
  tokens: (brand, mode) => {
    // Lime fills the booking action; the label keeps AA on the published accent.
    const ink = limeInk(text(brand["--accent-secondary"]), [
      text(brand["--pe-color-on-primary"]), text(brand["--text-primary"]), text(brand["--bg-primary"]), "#ffffff",
    ]);
    return {
      "--bk-action-bg": "var(--accent-secondary)",
      "--bk-action-ink": ink,
      "--bk-action-radius": "999px",
      "--bk-action-shadow": mode === "dark"
        ? "0 0 0 1px rgba(255, 255, 255, .1), 0 10px 30px -8px color-mix(in srgb, var(--accent-secondary) 55%, transparent)"
        : "inset 0 0 0 1.5px rgba(29, 36, 24, .16), 0 14px 30px -18px rgba(59, 90, 28, .7)",
    };
  },
  StepMark: BeatMark,
};
