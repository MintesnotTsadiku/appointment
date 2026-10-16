import type { BookingSkin } from "../booking-skin";
export const skin: BookingSkin = {
  key: "meseret-advisory@3",
  name: "meseret-v3",
  frame: "square",
  servicePhotoRoles: ["scene1.meseret", "scene2.meseret", "portrait.meseret"],
  formatPhotoRoles: { in_person: "scene1.meseret", online: "scene2.meseret" },
  backdropRole: "hero.meseret",
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "3px",
    "--bk-action-shadow": "none",
  }),
};
