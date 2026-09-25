import type { CompiledDesign, PublicUIConfig } from "./types";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedMode = "light" | "dark";

export const ALLOWED_COMPILED_DESIGN_CONTRACTS = ["appointment-compiled-design.v1"];

export function resolveMode(preference: ThemePreference, systemPrefersDark: boolean): ResolvedMode {
  if (preference === "dark") return "dark";
  if (preference === "light") return "light";
  return systemPrefersDark ? "dark" : "light";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapVariables(design: CompiledDesign, mode: ResolvedMode): Record<string, string> {
  const variables: Record<string, string> = {};
  const tokens = design.tokens[mode] || design.tokens.light;
  for (const [role, value] of Object.entries(tokens)) {
    variables["--pe-color-" + role.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase())] = String(value);
  }
  for (const [role, definition] of Object.entries(design.typography.roles || {})) {
    variables["--pe-font-" + role] = "'" + definition.family + "', " + (design.typography.fallbacks[role] || ["sans-serif"]).join(", ");
    variables["--pe-leading-" + role] = String(definition.lineHeight);
    variables["--pe-weight-" + role] = String(definition.weight);
    variables["--pe-tracking-" + role] = definition.letterSpacing;
  }
  variables["--pe-page-width"] = String((design.layout.responsive?.maxContentWidth as number | undefined) || 1180) + "px";
  variables["--pe-card-radius"] = String((design.surface.shape as Record<string, unknown>)?.cardRadius || "22px");
  variables["--pe-control-radius"] = String((design.surface.shape as Record<string, unknown>)?.controlRadius || "999px");
  variables["--pe-card-shadow"] = String(((design.surface.elevation || {}) as Record<string, unknown>).card || "none");
  variables["--pe-motion-duration"] = String(((design.surface.motion || {}) as Record<string, unknown>).duration || "180ms");
  variables["--pe-density"] = String(design.density.presentation || "comfortable");
  return variables;
}

export interface ThemeAttributes {
  mode: ResolvedMode;
  variables: Record<string, string>;
  reducedMotion: boolean;
}

export function buildThemeAttributes(
  config: PublicUIConfig,
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ThemeAttributes {
  const mode = resolveMode(preference, systemPrefersDark);
  const variables = mapVariables(config.compiledDesign, mode);
  const reducedMotion = config.compiledDesign.motion === "calm" || mode === "light";
  return { mode, variables, reducedMotion };
}

function isCompiledDesign(value: unknown): value is CompiledDesign {
  if (!isPlainObject(value)) return false;
  if (value.contract !== "appointment-compiled-design.v1") return false;
  if (!isPlainObject(value.tokens) || !isPlainObject(value.typography) || !isPlainObject(value.layout)) return false;
  if (!isPlainObject(value.identity) || typeof value.contentHash !== "string") return false;
  return true;
}

export function mergeConfig(raw: unknown, fallback: PublicUIConfig): PublicUIConfig {
  const source = isPlainObject(raw) ? raw : {};
  const design = source.compiledDesign;
  if (!isCompiledDesign(design)) return fallback;
  const identity = isPlainObject(source.identity) ? source.identity : design.identity;
  return {
    contract: source.contract === "appointment-public-ui.v2" ? source.contract : fallback.contract,
    experienceContract: source.experienceContract === "appointment-public-experience.v2" ? source.experienceContract : fallback.experienceContract,
    source: typeof source.source === "string" ? source.source : "experience-release",
    releaseHash: typeof source.releaseHash === "string" ? source.releaseHash : null,
    locale: typeof source.locale === "string" ? source.locale : fallback.locale,
    supportedLocales: Array.isArray(source.supportedLocales) ? source.supportedLocales.map(String) : fallback.supportedLocales,
    recipeKey: typeof source.recipeKey === "string" ? source.recipeKey : design.recipeKey,
    recipeVersion: typeof source.recipeVersion === "number" ? source.recipeVersion : design.recipeVersion,
    compiledDesign: design,
    identity: {
      applicationName: typeof identity.applicationName === "string" ? identity.applicationName : design.identity.applicationName,
      shortName: typeof identity.shortName === "string" ? identity.shortName : design.identity.shortName,
    },
    booking: isPlainObject(source.booking) ? source.booking as Record<string, unknown> : {},
    cache: isPlainObject(source.cache) ? source.cache as Record<string, unknown> : {},
    limitations: Array.isArray(source.limitations) ? source.limitations.map(String) : [],
  };
}
