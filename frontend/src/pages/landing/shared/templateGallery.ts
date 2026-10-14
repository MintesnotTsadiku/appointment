/**
 * Template gallery data for the landing page. The server lists every certified
 * template (`appointment.public_experience.api.get_public_template_gallery`);
 * this module only validates that answer and builds links. No imports, so
 * `tests/landing-world.test.mjs` can load it directly.
 */

export type Viewport = "desktop" | "mobile";
export type Mode = "light" | "dark";

export interface GalleryTemplate {
  key: string;
  label: string;
  audience: string;
  industry: string;
  locales: string[];
  themes: Mode[];
  accent: string | null;
  hero: string | null;
  previews: Partial<Record<Viewport, string>>;
  /** The live showcase site, only while it is published. */
  showcase: { path: string; title: string } | null;
}

export const GALLERY_ENDPOINT = "/api/method/appointment.public_experience.api.get_public_template_gallery";
export const GALLERY_SOURCE = "template_gallery";

const KEY = /^[a-z][a-z0-9-]{1,60}$/;
const SLUG_PATH = /^\/[a-z0-9][a-z0-9-]{0,80}$/;
const ASSET = /^\/(assets|files)\/[\w./-]+$/;
const COLOR = /^#[0-9a-f]{3,8}$/i;

/** Keeps only well-formed templates; anything unexpected is dropped, never rendered. */
export function parseGallery(raw: unknown): GalleryTemplate[] {
  const rows = isObject(raw) && Array.isArray(raw.templates) ? raw.templates : [];
  const seen = new Set<string>();
  const result: GalleryTemplate[] = [];
  for (const row of rows) {
    if (!isObject(row) || typeof row.key !== "string" || !KEY.test(row.key) || seen.has(row.key)) continue;
    if (typeof row.label !== "string" || !row.label.trim()) continue;
    seen.add(row.key);
    const previews = isObject(row.previews) ? row.previews : {};
    const showcase = isObject(row.showcase) ? row.showcase : null;
    result.push({
      key: row.key,
      label: row.label.trim(),
      audience: text(row.audience),
      industry: text(row.industry),
      locales: strings(row.locales).filter((locale) => locale === "en" || locale === "am"),
      themes: strings(row.themes).filter((mode): mode is Mode => mode === "light" || mode === "dark"),
      accent: typeof row.accent === "string" && COLOR.test(row.accent) ? row.accent : null,
      hero: asset(row.hero),
      previews: { desktop: asset(previews.desktop) ?? undefined, mobile: asset(previews.mobile) ?? undefined },
      showcase:
        showcase && typeof showcase.path === "string" && SLUG_PATH.test(showcase.path)
          ? { path: showcase.path, title: text(showcase.title) }
          : null,
    });
  }
  return result;
}

/** The live showcase in the visitor's language and the chosen mode (`?display=` is never saved). */
export function previewSrc(path: string, language: string, mode: Mode): string {
  return path + (language === "am" ? "/am" : "") + "?display=" + mode;
}

/** "Use this template": the account entry with the gallery attribution and the chosen template. */
export function templateStartHref(start: string, key: string): string {
  const params = new URLSearchParams({ source: GALLERY_SOURCE, template: key });
  return start + (start.includes("?") ? "&" : "?") + params.toString();
}

/** Scale that fits a `width` x `height` page into a stage, never enlarging it. */
export function fitScale(stageWidth: number, stageHeight: number, width: number, height: number): number {
  if (stageWidth <= 0 || stageHeight <= 0) return 1;
  return Math.min(1, stageWidth / width, stageHeight / height);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asset(value: unknown): string | null {
  return typeof value === "string" && ASSET.test(value) && !value.includes("..") ? value : null;
}
