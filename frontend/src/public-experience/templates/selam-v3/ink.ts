/*
 * Selam v3 keeps its own copy of the accent-ink rule (packages do not share code). The lime accent
 * fills the booking action and the tempo numerals on dark stages. A brand can publish any accent,
 * so the label colour is the design ink when it keeps WCAG AA (4.5:1) on that accent, else the
 * palette token with the best contrast.
 */
export const SELAM_DESIGN_INK = "#1d2418";
const AA_TEXT = 4.5;

function channels(color: string): [number, number, number] | null {
  const hex = color.trim().replace(/^#/, "");
  const full = hex.length === 3 ? hex.split("").map((part) => part + part).join("") : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16) / 255) as [number, number, number];
}

function luminance(color: string): number | null {
  const rgb = channels(color);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  if (a === null || b === null) return 0;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** The design ink when it passes AA on the accent, else the candidate with the best contrast. */
export function limeInk(accent: string | undefined, candidates: Array<string | undefined>): string {
  if (!accent || contrastRatio(accent, SELAM_DESIGN_INK) >= AA_TEXT) return SELAM_DESIGN_INK;
  let best = SELAM_DESIGN_INK;
  for (const candidate of candidates) {
    if (candidate && contrastRatio(accent, candidate) > contrastRatio(accent, best)) best = candidate;
  }
  return best;
}

/** Root style with `--s3-lime-ink` set for the published accent. */
export function withLimeInk<T extends object>(rootStyle: T): T {
  const vars = rootStyle as Record<string, unknown>;
  const read = (name: string) => (typeof vars[name] === "string" ? (vars[name] as string) : undefined);
  const ink = limeInk(read("--pe-color-accent"), [read("--pe-color-on-primary"), read("--pe-color-text"), read("--pe-color-canvas"), "#ffffff"]);
  return { ...rootStyle, "--s3-lime-ink": ink };
}
