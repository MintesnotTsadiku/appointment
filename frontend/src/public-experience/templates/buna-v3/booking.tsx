import type { BookingSkin } from "../booking-skin";
export const skin: BookingSkin = {
  key: "buna-experiences@3",
  name: "buna-v3",
  frame: "square",
  servicePhotoRoles: ["scene1.buna", "scene2.buna", "portrait.buna"],
  formatPhotoRoles: { in_person: "scene1.buna", online: "scene2.buna" },
  backdropRole: "hero.buna",
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "3px",
    "--bk-action-shadow": "none",
  }),
};
