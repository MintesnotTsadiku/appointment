import type { BookingSkin } from "../booking-skin";
export const skin: BookingSkin = {
  key: "dawit-specialist@3",
  name: "dawit-v3",
  frame: "square",
  servicePhotoRoles: ["scene1.dawit", "scene2.dawit", "portrait.dawit"],
  formatPhotoRoles: { in_person: "scene1.dawit", online: "scene2.dawit" },
  backdropRole: "hero.dawit",
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "3px",
    "--bk-action-shadow": "none",
  }),
};
