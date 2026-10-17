import type { BookingSkin } from "../booking-skin";
export const skin: BookingSkin = {
  key: "buna-experiences@3",
  name: "buna-v3",
  frame: "square",
  servicePhotoRoles: [
    "yirgacheffe.buna",
    "pour.buna",
    "espresso.buna",
    "people.buna",
  ],
  formatPhotoRoles: { in_person: "studio.buna", online: "people.buna" },
  backdropRole: "hero.buna",
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "2px",
    "--booking-font-display": "BunaField, sans-serif",
    "--booking-font-body": "BunaField, sans-serif",
    "--booking-radius": "2px",
    "--bk-action-shadow": "none",
  }),
};
