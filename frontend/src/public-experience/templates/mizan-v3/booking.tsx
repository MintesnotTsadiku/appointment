import type { BookingSkin, StepMarkProps } from "../booking-skin";
function StepMark({ index, state }: StepMarkProps) {
  return (
    <span className="mizan3k-step" data-state={state} aria-hidden="true">
      {state === "done" ? "✓" : String(index).padStart(2, "0")}
    </span>
  );
}
export const skin: BookingSkin = {
  key: "mizan-inspection@3",
  name: "mizan-v3",
  frame: "square",
  StepMark,
  servicePhotoRoles: ["screen.mizan", "brake.mizan", "engine.mizan"],
  formatPhotoRoles: { in_person: "workshop.mizan", online: "lead.mizan" },
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "3px",
    "--bk-action-shadow": "none",
    "--booking-radius": "3px",
  }),
};
