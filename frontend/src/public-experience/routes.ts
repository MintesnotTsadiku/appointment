/**
 * Public-experience path detection.
 *
 * A public site path is a single non-reserved first segment, optionally
 * followed by `book`, a locale, or `booking/<token>` (the manage-booking page). Everything else (application, API, auth,
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
  "forgot-password",
  "desk",
  "home",
  "calendar",
  "analytics",
  "settings",
  "admin",
  "reception",
  "customers",
  "grow",
  "schedule",
  "preview",
  "tasks",
  "assistants",
  "workspaces",
  "onboarding",
  "no-access",
  "assistant",
  "book",
  "blog",
  "blog-category",
  "newsletter",
  "team",
  "rss",
  "rss.xml",
  ".well-known",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
  "tools",
  "directory",
  "partners",
  // Template gallery of the platform landing page.
  "templates",
  // Amharic versions of server-rendered pages: /am/tools/..., /am/directory/...
  "am",
]);

const LOCALES = new Set(["en", "am"]);

export function isPublicExperiencePath(pathname: string): boolean {
  const segments = String(pathname || "/").split("/").filter(Boolean);
  if (segments[0] === "team") return segments.length === 3 && segments[1] === "invitation" && /^[A-Za-z0-9_-]{40,100}$/.test(segments[2]);
  if (segments[0] === "newsletter") return segments.length === 3 && ["confirm", "unsubscribe", "sender"].includes(segments[1]) && /^[A-Za-z0-9_-]{40,100}$/.test(segments[2]);
  if (segments.length === 0 || segments.length > 3) return false;
  const first = segments[0].toLowerCase();
  if (RESERVED_FIRST_SEGMENTS.has(first)) return false;
  if (segments.length >= 2 && ["blog", "gallery"].includes(segments[1])) {
    return segments.length === 2 || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segments[2]);
  }
  // `/<slug>/booking/<token>`: the customer's manage-booking page.
  if (segments.length === 3) return segments[1].toLowerCase() === "booking";
  if (segments.length === 2) {
    const second = segments[1].toLowerCase();
    // `/<slug>/my-bookings`: the customer's bookings with this business.
    return second === "book" || second === "my-bookings" || LOCALES.has(second);
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

/** A scheduler path in the website's language: the booking pages open in Amharic after an Amharic page. */
export function schedulerHref(path: string | null | undefined, locale: string | undefined): string {
  if (!path || !locale || locale === "en" || !path.startsWith("/schedule/")) return path || "";
  return `${path}${path.includes("?") ? "&" : "?"}lang=${encodeURIComponent(locale)}`;
}

/** The snapshot's booking paths in its own language. */
export function withBookingLanguage<T extends { locale?: string; bookingPath?: string | null; bookingPaths?: Record<string, string> }>(snapshot: T): T {
  if (!snapshot.locale || snapshot.locale === "en") return snapshot;
  const paths = Object.fromEntries(Object.entries(snapshot.bookingPaths || {}).map(([key, value]) => [key, schedulerHref(value, snapshot.locale)]));
  return { ...snapshot, bookingPath: snapshot.bookingPath ? schedulerHref(snapshot.bookingPath, snapshot.locale) : snapshot.bookingPath, bookingPaths: paths };
}
