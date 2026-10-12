import type { ReactNode } from "react";

/*
 * Ergata's own line icons: 24px grid, 1.5px round strokes, drawn for this package only.
 * They are decorative; every icon sits next to visible text, so all are aria-hidden.
 */

export type ErgataIconName =
  | "wave" | "cloud" | "flame" | "leaf" | "link" | "shield" | "path" | "heart"
  | "room" | "video" | "phone" | "intro" | "pin" | "clock" | "mail" | "lock"
  | "arrow" | "plus" | "check" | "lifebuoy" | "sun" | "moon" | "quote";

const PATHS: Record<ErgataIconName, ReactNode> = {
  wave: <path d="M3 9c2.5-2.5 4.5-2.5 6 0s3.5 2.5 6 0 4.5-2.5 6 0M3 15c2.5-2.5 4.5-2.5 6 0s3.5 2.5 6 0 4.5-2.5 6 0" />,
  cloud: <path d="M7.5 18h9a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 6.6 11.1 3.5 3.5 0 0 0 7.5 18Z" />,
  flame: <path d="M12 21a6 6 0 0 0 6-6c0-3.5-2.5-5.5-3.5-8-1.5 1.5-2 3-2 4.5C11 10 10 8.5 10 6.5 7.5 8.5 6 11.5 6 15a6 6 0 0 0 6 6Z" />,
  leaf: <><path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14Z" /><path d="M5 19 13 11" /></>,
  link: <><circle cx="8.5" cy="12" r="4.5" /><circle cx="15.5" cy="12" r="4.5" /></>,
  shield: <path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6l-7-2.5Z" />,
  path: <><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18h5a3 3 0 0 0 0-6h-2a3 3 0 0 1 0-6h5" /></>,
  heart: <path d="M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10Z" />,
  room: <><path d="M5 20V9a7 7 0 0 1 14 0v11" /><path d="M3 20h18M9.5 20v-5h5v5" /></>,
  video: <><rect x="3" y="6.5" width="12.5" height="11" rx="2.5" /><path d="m15.5 10.5 5-3v9l-5-3" /></>,
  phone: <path d="M7.2 4h2.6l1.3 3.6-1.8 1.2a10 10 0 0 0 5.9 5.9l1.2-1.8 3.6 1.3v2.6a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 5.2 6.2 2 2 0 0 1 7.2 4Z" />,
  intro: <><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 4v-4h0A2 2 0 0 1 4 14Z" /><path d="M8.5 9h7M8.5 12h4" /></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="m4.5 7 7.5 6 7.5-6" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  lifebuoy: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="3.5" /><path d="m6 6 3.5 3.5m5 5L18 18m0-12-3.5 3.5m-5 5L6 18" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2m0 15v2M4.6 4.6 6 6m12 12 1.4 1.4M2.5 12h2m15 0h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  moon: <path d="M19.5 14.5A7.5 7.5 0 0 1 9.5 4.5a7.5 7.5 0 1 0 10 10Z" />,
  quote: <path d="M9.5 7C6.5 8 5 10.5 5 13.5V17h4.5v-4.5H7c0-2 1-3.5 3-4.3L9.5 7Zm9 0c-3 1-4.5 3.5-4.5 6.5V17h4.5v-4.5H16c0-2 1-3.5 3-4.3L18.5 7Z" />,
};

const KNOWN = new Set(Object.keys(PATHS));

export function iconName(value: unknown, fallback: ErgataIconName): ErgataIconName {
  return typeof value === "string" && KNOWN.has(value) ? value as ErgataIconName : fallback;
}

export function Icon({ name, className = "eg-icon" }: { name: ErgataIconName; className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{PATHS[name]}</svg>;
}
