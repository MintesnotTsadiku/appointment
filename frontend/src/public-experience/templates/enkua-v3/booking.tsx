import type { BookingSkin, StepMarkProps } from "../booking-skin";
function StepMark({ index, state }: StepMarkProps) {
  return <span className="enkua3-step" data-state={state} aria-hidden="true">{state === "done" ? "✓" : String(index).padStart(2, "0")}</span>;
}

export const skin: BookingSkin = {
  key: "enkua-photography@3",
  name: "enkua-v3",
  frame: "square",
  StepMark,
  servicePhotoRoles: ["hero.enkua", "founder.enkua", "products.enkua"],
  formatPhotoRoles: { in_person: "studio.enkua", online: "founder.enkua" },
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "0px",
    "--booking-radius": "0px",
    "--bk-action-shadow": "none",
  }),
};
