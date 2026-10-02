/**
 * The landing page is one day in a city. Each world is an hour of that day and
 * owns a sky palette in `landing.css`. Scrolling through a world moves the
 * clock towards the next world's hour.
 */
export type WorldId =
  | "dawn"
  | "solo"
  | "team"
  | "care"
  | "desk"
  | "moves"
  | "insights"
  | "grow"
  | "night";

export interface World {
  id: WorldId;
  hour: number;
}

export const WORLDS: World[] = [
  { id: "dawn", hour: 5.5 },
  { id: "solo", hour: 7 },
  { id: "team", hour: 9.5 },
  { id: "care", hour: 11.5 },
  { id: "desk", hour: 14 },
  { id: "moves", hour: 16.75 },
  { id: "insights", hour: 19 },
  { id: "grow", hour: 21.5 },
  { id: "night", hour: 23.75 },
];

export const CHAPTERS = WORLDS.filter((world) => world.id !== "dawn" && world.id !== "night");

/** Hour of day for a position `fraction` (0..1) through world `index`. */
export function hourAt(index: number, fraction: number): number {
  const world = WORLDS[Math.max(0, Math.min(index, WORLDS.length - 1))];
  const next = WORLDS[Math.min(index + 1, WORLDS.length - 1)];
  const clamped = Math.max(0, Math.min(1, fraction));
  return world.hour + (next.hour - world.hour) * clamped;
}

/** "07:05" style clock text, rounded down to five minutes. */
export function clockLabel(hour: number): string {
  const totalMinutes = Math.floor((hour * 60) / 5) * 5;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return pad(hours) + ":" + pad(minutes);
}

/**
 * Position of the sun or moon on a shallow arc. `x` and `y` are percentages of
 * the viewport. The sun travels 06:00–18:30; the moon rises after.
 */
export function celestialPosition(hour: number): { body: "sun" | "moon"; x: number; y: number } {
  const isDay = hour >= 6 && hour < 18.5;
  const start = isDay ? 6 : hour >= 18.5 ? 18.5 : 0;
  const span = isDay ? 12.5 : 11.5;
  const t = Math.max(0, Math.min(1, (hour - start) / span));
  return { body: isDay ? "sun" : "moon", x: 8 + t * 84, y: 62 - Math.sin(t * Math.PI) * 50 };
}

function pad(value: number): string {
  return value < 10 ? "0" + value : String(value);
}
