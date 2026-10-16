import type { BookingSkin } from "../booking-skin";
export const skin: BookingSkin = {
  key: "enkua-photography@3",
  name: "enkua-v3",
  frame: "square",
  servicePhotoRoles: ["scene1.enkua", "scene2.enkua", "portrait.enkua"],
  formatPhotoRoles: { in_person: "scene1.enkua", online: "scene2.enkua" },
  backdropRole: "hero.enkua",
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "3px",
    "--bk-action-shadow": "none",
  }),
};
