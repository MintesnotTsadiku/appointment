import type { BookingSkin, StepMarkProps } from "../booking-skin";

/*
 * Ergata v2 on the booking pages ("a calm room to talk", continued). Speed and clarity first: no
 * parallax, marquee or moving image. The pages keep the room's look: a linen header with a thin sage
 * line, a faint echo of the dawn window (the evening window in dark mode), arched photo frames, the
 * soft serif for headings, a deep-sage pill for the booking action, arched days and pill times, and
 * a small arched window for each step. The session photo follows how it meets: the office door for
 * an office session, the quiet desk for a video session. Rules live in booking.css under
 * [data-bk-skin="ergata-v2"]. Visual parts of this package only.
 */

/** A small arched window for each step; a tick inside once the step is done. */
function WindowMark({ index, state }: StepMarkProps) {
  return <svg className="eg2k-mark" viewBox="0 0 22 26" width="22" height="26" aria-hidden="true" data-state={state}>
    <path className="eg2k-mark-frame" d="M2.5 24.5V11a8.5 8.5 0 0 1 17 0v13.5z" />
    {state === "done"
      ? <path className="eg2k-mark-tick" d="M6.5 15.5l3 3 6-6.5" />
      : <text className="eg2k-mark-num" x="11" y="16.5" textAnchor="middle" dominantBaseline="middle">{index}</text>}
  </svg>;
}

export const ergataBookingSkin: BookingSkin = {
  key: "ergata-therapy@2",
  name: "ergata-v2",
  frame: "arch",
  // The stylesheet loads only on this template's booking pages (kit, "Booking skins").
  style: () => import("./booking.css"),
  // A group practice on the organization flow: the counselling room for every session.
  servicePhotoRoles: ["detail.ergata"],
  // An independent practitioner: the photo of the place where the session meets.
  formatPhotoRoles: { in_person: "office.ergata", online: "online.ergata" },
  // The dawn window is the picture of the /book handoff, so the visitor has just seen it.
  backdropRole: "band.ergata",
  tokens: (_brand, mode) => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary, #fffcf6)",
    "--bk-action-radius": "999px",
    "--bk-action-shadow": mode === "dark"
      ? "0 0 0 1px rgba(226, 169, 72, .28), 0 10px 30px -10px rgba(226, 169, 72, .45)"
      : "0 1px 0 rgba(255, 255, 255, .2) inset, 0 12px 26px -14px rgba(59, 90, 75, .75)",
  }),
  StepMark: WindowMark,
};
