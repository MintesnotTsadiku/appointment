import type { BookingSkin } from "../booking-skin";
export const skin: BookingSkin = {
  key: "hana-conversations@3",
  name: "hana-v3",
  frame: "square",
  servicePhotoRoles: [
    "hero.hana",
    "podcast.hana",
    "coffee.hana",
    "market.hana",
  ],
  formatPhotoRoles: { in_person: "coffee.hana", online: "podcast.hana" },
  backdropRole: "hero.hana",
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "3px",
    "--booking-font-display": "HanaPoster, sans-serif",
    "--bk-action-shadow": "none",
  }),
};
