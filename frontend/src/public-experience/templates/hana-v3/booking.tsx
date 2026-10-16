import type { BookingSkin } from "../booking-skin";
export const skin: BookingSkin = {
  key: "hana-conversations@3",
  name: "hana-v3",
  frame: "square",
  servicePhotoRoles: ["scene1.hana", "scene2.hana", "portrait.hana"],
  formatPhotoRoles: { in_person: "scene1.hana", online: "scene2.hana" },
  backdropRole: "hero.hana",
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "3px",
    "--bk-action-shadow": "none",
  }),
};
