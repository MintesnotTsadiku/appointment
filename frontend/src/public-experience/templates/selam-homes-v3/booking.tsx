import type { BookingSkin } from "../booking-skin";
export const skin: BookingSkin = {
  key: "selam-homes@3",
  name: "selam-homes-v3",
  frame: "square",
  servicePhotoRoles: [
    "scene1.selam-homes",
    "scene2.selam-homes",
    "portrait.selam-homes",
  ],
  formatPhotoRoles: {
    in_person: "scene1.selam-homes",
    online: "scene2.selam-homes",
  },
  backdropRole: "hero.selam-homes",
  style: () => import("./booking.css"),
  tokens: () => ({
    "--bk-action-bg": "var(--accent-primary)",
    "--bk-action-ink": "var(--pe-color-on-primary)",
    "--bk-action-radius": "3px",
    "--bk-action-shadow": "none",
  }),
};
