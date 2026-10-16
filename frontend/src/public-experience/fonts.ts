import type { PublicUIConfig } from "./types";

// FontFaceSet defaults to a Latin space; use the page script to load Ethiopic faces before paint.
const sample = (config: PublicUIConfig) => config.locale === "am" ? "ሰላም" : "BESbswy";

const faces = (config: PublicUIConfig) => Object.values(config.compiledDesign.typography.roles)
  .map((role) => `${role.weight} 16px ${JSON.stringify(role.family)}`);

/** True when the faces of every typography role have loaded, so the page can paint in its own type at once. */
export function designFontsReady(config: PublicUIConfig): boolean {
  if (typeof document === "undefined" || !document.fonts?.check) return false;
  try {
    return faces(config).every((face) => document.fonts.check(face, sample(config)));
  } catch {
    return false;
  }
}

/** Ask for the faces of every typography role; resolves when they have loaded or failed. */
export function loadDesignFonts(config: PublicUIConfig): Promise<unknown> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return Promise.allSettled(faces(config).map((face) => document.fonts.load(face, sample(config))));
}
