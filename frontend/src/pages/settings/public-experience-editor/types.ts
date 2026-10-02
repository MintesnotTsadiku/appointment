/** Shapes returned by appointment.public_experience.api. */

export interface Recipe {
  key: string;
  version: number;
  label: string;
  description: string;
  audience: string;
  mood: string;
  supportedLocales: string[];
  requiredSections: string[];
  adjustments: Record<string, { type: string; choices?: string[]; optional?: boolean }>;
  accessibility: Record<string, unknown>;
  /** Platform showcase for the gallery; `path` is set only when that example site is live. */
  showcase?: { heroAsset: string; logoAsset: string; title: string | null; path: string | null } | null;
}

export interface Profile {
  name: string;
  profile_name: string;
  application_name: string;
  short_name?: string;
  owner_type: string;
  organization?: string;
  provider?: string;
  recipe_key: string;
  recipe_version: number;
  brand_inputs_json?: string;
  lifecycle: string;
  active_revision?: string;
  draft_version: number;
}

export interface Site {
  name: string;
  site_title: string;
  slug: string;
  status: string;
  brand_profile?: string;
  recipe_key: string;
  recipe_version: number;
  current_release?: string;
  draft_version: number;
}

export interface CompileResult {
  contentHash: string;
  compiledDesign: { identity?: { applicationName?: string }; layout?: { rendererKey?: string }; validation?: { ok?: boolean } };
  valid: boolean;
}

export function parseInputs(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, string> : {};
  } catch {
    return {};
  }
}

/** "editorial-beauty" -> "Editorial beauty"; "hero.bloom-salon" -> "Bloom salon". */
export function humanize(value: string | undefined | null): string {
  if (!value) return "";
  const text = value.replace(/^(hero|detail)\./, "").replace(/[-_.]+/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
