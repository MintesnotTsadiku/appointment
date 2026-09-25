import type { CompiledDesign, DesignTokenValue, PublicUIConfig } from "./types";

export const TENA_CLINIC_RECIPE_KEY = "tena-clinic";
export const TENA_CLINIC_RECIPE_VERSION = 1;

const requiredSections = [
  "hero",
  "services",
  "providers",
  "process",
  "benefits",
  "testimonials",
  "proof",
  "locations",
  "about",
  "faq",
  "contact",
  "booking_cta",
  "footer",
];

const light: Record<string, string> = {
  canvas: "#fbf7f1",
  surface: "#fffdf9",
  surfaceMuted: "#f1e9df",
  surfaceStrong: "#eadccd",
  text: "#332821",
  textMuted: "#6c5b4f",
  border: "#d9c9b8",
  primary: "#713b2e",
  onPrimary: "#fffaf3",
  accent: "#aa6a43",
  link: "#713b2e",
  focus: "#1f527e",
  available: "#2e6f57",
  selected: "#713b2e",
  today: "#1f527e",
  limitedCapacity: "#8b5a1d",
  waitlist: "#655189",
  unavailable: "#766e67",
  danger: "#9f3f36",
  error: "#9f3f36",
  success: "#2e6f57",
  notice: "#76581e",
  authentication: "#655189",
  disabled: "#aaa198",
};

const dark: Record<string, string> = {
  canvas: "#211b18",
  surface: "#2a231f",
  surfaceMuted: "#352b25",
  surfaceStrong: "#49382f",
  text: "#fff7ed",
  textMuted: "#d7c5b5",
  border: "#5a483b",
  primary: "#e4a27e",
  onPrimary: "#2b1d18",
  accent: "#e4b083",
  link: "#f2ba9a",
  focus: "#4aa8d4",
  available: "#77c59e",
  selected: "#e4a27e",
  today: "#4aa8d4",
  limitedCapacity: "#e8b65f",
  waitlist: "#c5b6ef",
  unavailable: "#bdb0a4",
  danger: "#f49a8f",
  error: "#f49a8f",
  success: "#77c59e",
  notice: "#f1c77a",
  authentication: "#c5b6ef",
  disabled: "#75665d",
};

export const PACKAGED_COMPILED_DESIGN: CompiledDesign = {
  contract: "appointment-compiled-design.v1",
  compilerPolicyVersion: "quiet-trust-policy.v1",
  recipeKey: TENA_CLINIC_RECIPE_KEY,
  recipeVersion: TENA_CLINIC_RECIPE_VERSION,
  recipeHash: "packaged-tena-clinic-recipe-v1",
  primitiveManifest: {},
  tokens: { light, dark },
  typography: {
    supportedScripts: ["latin", "ethiopic"],
    roles: {
      display: { family: "Quiet Trust Display", assetKey: "quiet-trust-display", weight: 400, lineHeight: 0.98, letterSpacing: "-0.025em" },
      body: { family: "Quiet Trust Body", assetKey: "quiet-trust-body", weight: 400, lineHeight: 1.62, letterSpacing: "0" },
      ui: { family: "Quiet Trust UI", assetKey: "quiet-trust-body", weight: 600, lineHeight: 1.25, letterSpacing: "0.01em" },
      numeric: { family: "Quiet Trust UI", assetKey: "quiet-trust-body", weight: 600, lineHeight: 1.2, letterSpacing: "0" },
    },
    fontAssets: [
      { key: "quiet-trust-display", family: "Quiet Trust Display", src: "/assets/appointment/quiet-trust/fonts/dejavu-serif.ttf", weight: 400, format: "truetype", scripts: ["latin"], license: "Bitstream Vera / DejaVu license" },
      { key: "quiet-trust-display-bold", family: "Quiet Trust Display", src: "/assets/appointment/quiet-trust/fonts/dejavu-serif-bold.ttf", weight: 700, format: "truetype", scripts: ["latin"], license: "Bitstream Vera / DejaVu license" },
      { key: "quiet-trust-body", family: "Quiet Trust Body", src: "/assets/appointment/quiet-trust/fonts/noto-sans-ethiopic.ttf", weight: 400, format: "truetype", scripts: ["latin", "ethiopic"], license: "SIL Open Font License 1.1" },
    ],
    fallbacks: {
      display: ["Georgia", "Times New Roman", "serif"],
      body: ["Arial", "DejaVu Sans", "sans-serif"],
      ui: ["Arial", "DejaVu Sans", "sans-serif"],
      numeric: ["Arial", "DejaVu Sans", "sans-serif"],
    },
  },
  layout: {
    rendererKey: TENA_CLINIC_RECIPE_KEY,
    rendererVersion: 1,
    contentSchemaVersion: 2,
    sections: requiredSections,
    requiredSections,
    responsive: { desktop: "split-hero-editorial", tablet: "stacked-hero-rail", mobile: "single-column-sections", maxContentWidth: 1180 },
  },
  surface: {
    shape: { cardRadius: "22px", controlRadius: "999px", borderWidth: "1px", focusRing: "3px" },
    elevation: { card: "0 18px 50px rgba(72, 44, 28, 0.10)", raised: "0 10px 28px rgba(72, 44, 28, 0.12)" },
    motion: { default: "calm", reduced: "none", duration: "180ms" },
    iconStyle: "line",
  },
  density: { content: "rich", presentation: "comfortable", spacing: "editorial", controlHeight: "comfortable", cardRhythm: "steady", typeLeading: "open" },
  motion: "calm",
  assets: {
    "hero.primary": {
      src: "/assets/appointment/quiet-trust/hero-addis.jpg",
      alt: "A calm Addis Ababa consultation room with a clinician preparing a warm, welcoming appointment space.",
      focalPoint: { x: 0.62, y: 0.44 },
      fit: "cover",
      width: 1536,
      height: 1024,
      mime: "image/jpeg",
    },
    "section.detail": {
      src: "/assets/appointment/quiet-trust/detail-addis.jpg",
      alt: "Natural light on a small Ethiopian wellness studio table with folded linen and a ceramic cup.",
      focalPoint: { x: 0.52, y: 0.5 },
      fit: "cover",
      width: 1024,
      height: 1024,
      mime: "image/jpeg",
    },
  },
  actionIntents: ["booking_start", "service_selection", "provider_selection", "call", "directions", "contact", "faq_jump", "back_to_site"],
  contentCapabilities: { sections: requiredSections, richness: "rich" },
  localeCapabilities: { supported: ["en", "am"], scripts: ["latin", "ethiopic"] },
  identity: { applicationName: "Appointment", shortName: "Appointment" },
  validation: { ok: true, issues: [], protectedStateRoles: ["available", "selected", "today", "limitedCapacity", "waitlist", "unavailable", "focus", "danger", "error", "success", "disabled"] },
  contentHash: "packaged-quiet-trust-design-v1",
};

export function toCssVariables(
  tokens: Record<string, DesignTokenValue>,
  prefix = "pe",
): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [address, value] of Object.entries(tokens)) {
    variables["--" + prefix + "-" + address.split(".").join("-")] = String(value);
  }
  return variables;
}

export function getFallbackPublicUIConfig(locale = "en"): PublicUIConfig {
  return {
    contract: "appointment-public-ui.v2",
    experienceContract: "appointment-public-experience.v2",
    source: "packaged-recipe",
    releaseHash: null,
    locale,
    supportedLocales: ["en", "am"],
    recipeKey: TENA_CLINIC_RECIPE_KEY,
    recipeVersion: TENA_CLINIC_RECIPE_VERSION,
    compiledDesign: PACKAGED_COMPILED_DESIGN,
    identity: PACKAGED_COMPILED_DESIGN.identity,
    booking: { locale, supportedLocales: ["en", "am"] },
    cache: { public: true, etag: PACKAGED_COMPILED_DESIGN.contentHash, revalidateSeconds: 300 },
    limitations: ["waiting-for-published-release"],
  };
}
