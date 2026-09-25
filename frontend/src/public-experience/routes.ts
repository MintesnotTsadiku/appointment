/**
 * Public-experience path detection.
 *
 * A public site path is a single non-reserved first segment, optionally
 * followed by `book` or a locale. Everything else (application, API, auth,
 * infrastructure) is not a public experience path.
 */
const RESERVED_FIRST_SEGMENTS = new Set([
  "api",
  "app",
  "apps",
  "assets",
  "files",
  "private",
  "login",
  "logout",
  "signup",
  "desk",
  "home",
  "calendar",
  "analytics",
  "settings",
  "admin",
  "reception",
  "schedule",
  "preview",
  "tasks",
  "assistants",
  "workspaces",
  "onboarding",
  "no-access",
  "assistant",
  "book",
  ".well-known",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
]);

const LOCALES = new Set(["en", "am"]);

export function isPublicExperiencePath(pathname: string): boolean {
  const segments = String(pathname || "/").split("/").filter(Boolean);
  if (segments.length === 0 || segments.length > 2) return false;
  const first = segments[0].toLowerCase();
  if (RESERVED_FIRST_SEGMENTS.has(first)) return false;
  if (segments.length === 2) {
    const second = segments[1].toLowerCase();
    return second === "book" || LOCALES.has(second);
  }
  return true;
}


export function publicRootFromPath(pathname: string): string {
  const segments = String(pathname || "/").split("/").filter(Boolean);
  if (!segments.length || RESERVED_FIRST_SEGMENTS.has(segments[0].toLowerCase())) return "/";
  return "/" + segments[0];
}

export function publicRootForSlug(slug?: string): string {
  if (!slug || RESERVED_FIRST_SEGMENTS.has(slug.toLowerCase())) return "/";
  return "/" + encodeURIComponent(slug);
}
