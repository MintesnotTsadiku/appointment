export type DesignTokenValue = string | number;
/** Frontend shapes for the compiled-design/public-release contracts. */

export type LocalizedText = Record<string, string>;

export interface PublicAction {
  intent: string;
  label: LocalizedText;
  placement: "primary" | "secondary" | "inline" | "tertiary";
  href?: string;
}

export interface CompiledDesign {
  contract: "appointment-compiled-design.v1" | string;
  compilerPolicyVersion: string;
  recipeKey: string;
  recipeVersion: number;
  recipeHash: string;
  primitiveManifest: Record<string, unknown>;
  tokens: Record<"light" | "dark", Record<string, string>>;
  typography: {
    supportedScripts: string[];
    roles: Record<string, { family: string; assetKey: string; weight: number; lineHeight: number; letterSpacing: string }>;
    fontAssets: Array<{ key: string; family: string; src: string; weight: number; format: string; scripts: string[]; license: string }>;
    fallbacks: Record<string, string[]>;
  };
  layout: {
    rendererKey: string;
    rendererVersion: number;
    contentSchemaVersion: number;
    sections: string[];
    requiredSections: string[];
    responsive?: Record<string, unknown>;
  };
  surface: Record<string, unknown>;
  density: Record<string, unknown>;
  motion: string;
  assets: Record<string, {
    src: string;
    mobileSrc?: string;
    alt: string;
    focalPoint?: { x: number; y: number };
    fit?: "cover" | "contain";
    width?: number;
    height?: number;
    mime?: string;
    checksum?: string;
    provenance?: Record<string, unknown>;
    /** Optional art direction (appointment-imagery.v1): mobile crop size, night photos, AVIF and smaller widths. */
    mobileWidth?: number;
    mobileHeight?: number;
    darkSrc?: string;
    darkMobileSrc?: string;
    formats?: string[];
    widths?: number[];
  }>;
  actionIntents: string[];
  contentCapabilities: Record<string, unknown>;
  localeCapabilities: Record<string, unknown>;
  identity: { applicationName: string; shortName: string; logoPrimary?: string | null; logoCompact?: string | null; favicon?: string | null };
  validation: { ok: boolean; issues?: unknown[]; protectedStateRoles?: string[] };
  contentHash: string;
}

export interface PublicIdentity {
  applicationName: string;
  shortName: string;
  logoPrimary?: string | null;
  logoCompact?: string | null;
  favicon?: string | null;
}

export interface PublicUIConfig {
  contract: string;
  experienceContract: string;
  source: string;
  releaseHash: string | null;
  locale: string;
  supportedLocales: string[];
  recipeKey: string;
  recipeVersion: number;
  compiledDesign: CompiledDesign;
  identity: PublicIdentity;
  booking: Record<string, unknown>;
  cache: Record<string, unknown>;
  limitations: string[];
}

export interface PublicSection {
  id: string;
  type: string;
  order: number;
  schemaVersion: number;
  content: Record<string, unknown>;
}

/** The public session format of a session or place. */
export interface SessionFormat {
  locationType: "online" | "in_person";
  /** Platform label of an online place, for example "Google Meet"; empty in person. */
  platform?: string;
}

export interface PublishedSnapshot {
  previewContent?: { article: import("./contentContract").ContentDetail; gallery: import("./contentContract").ContentDetail };
  siteSlug?: string;
  features?: string[];
  contract: string;
  releaseHash: string | null;
  locale: string;
  availableLocales: string[];
  routeKind: string;
  canonicalUrl: string;
  recipeKey: string;
  recipeVersion: number;
  layoutRendererKey: string;
  layoutRendererVersion: number;
  compiledDesign: CompiledDesign;
  bookingPath?: string | null;
  /** Independent providers: each session's own scheduler path, by service id. */
  bookingPaths?: Record<string, string>;
  /**
   * How each session meets, by service id: from the location of its bookable offerings. A service offered both
   * online and in person has no entry. Public and never secret: no meeting link. See docs/growth/ONLINE_LOCATIONS.md.
   */
  sessionFormats?: Record<string, SessionFormat>;
  /** How each place meets, by location id (the `id` of a `locations` item). */
  placeFormats?: Record<string, SessionFormat>;
  /** Weekly opening hours by location id ("open now" and the Habesha clock). */
  placeHours?: Record<string, { timezone: string; days: Array<{ day: string; open: string; close: string }> }>;
  sections: PublicSection[];
  seo: Record<string, unknown>;
  booking: Record<string, unknown>;
}
