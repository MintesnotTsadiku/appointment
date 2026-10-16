import type { BookingSkin } from "../booking-skin";
export const skin: BookingSkin = {
  key: "mizan-inspection@3",
  name: "mizan-v3",
  frame: "square",
  servicePhotoRoles: ["scene1.mizan", "scene2.mizan", "portrait.mizan"],
  formatPhotoRoles: { in_person: "scene1.mizan", online: "scene2.mizan" },
  backdropRole: "hero.mizan",
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "3px",
    "--bk-action-shadow": "none",
  }),
};
