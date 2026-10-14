/*
 * Bloom v3 (a copy of the v2 rule; packages do not share code) fills booking actions with the palette accent. A brand can publish any accent
 * (for example a deep red), so the label colour is picked from the palette tokens to keep
 * WCAG AA (4.5:1) on that accent in light and dark mode.
 */
export const BLOOM_DESIGN_INK = "#2a1430";
export const AA_TEXT = 4.5;

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

/** The design ink when it passes AA on the accent, else the palette token with the best contrast. */
export function accentInk(accent: string | undefined, candidates: Array<string | undefined>): string {
  if (!accent || contrastRatio(accent, BLOOM_DESIGN_INK) >= AA_TEXT) return BLOOM_DESIGN_INK;
  let best = BLOOM_DESIGN_INK;
  for (const candidate of candidates) {
    if (candidate && contrastRatio(accent, candidate) > contrastRatio(accent, best)) best = candidate;
  }
  return best;
}

/** Root style with `--b3-gold-ink` set for the published accent. */
export function withAccentInk<T extends object>(rootStyle: T): T {
  const vars = rootStyle as Record<string, unknown>;
  const read = (name: string) => (typeof vars[name] === "string" ? (vars[name] as string) : undefined);
  const ink = accentInk(read("--pe-color-accent"), [read("--pe-color-on-primary"), read("--pe-color-text"), read("--pe-color-canvas"), "#ffffff"]);
  return { ...rootStyle, "--b3-gold-ink": ink };
}
