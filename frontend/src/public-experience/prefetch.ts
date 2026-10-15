import { prefetchInlinedPage } from "./api";
import { loadDesignFonts } from "./fonts";
import { loadChromeMessages } from "./templates/chrome";
import { loadTemplatePackage } from "./templates/registry";

/**
 * A public page whose shell inlined its published design (shell_boot.py) starts its template package,
 * its fonts and its page code at once, in parallel, before the application renders.
 */
export function prefetchPublicPage(): void {
  const snapshot = prefetchInlinedPage(loadTemplatePackage, loadDesignFonts);
  if (!snapshot) return;
  // A page in another language shows its template words from the server catalog.
  if (snapshot.locale && snapshot.locale !== "en") void loadChromeMessages(snapshot.locale);
  const page = /^\/[^/]+\/book\/?$/.test(window.location.pathname)
    ? import("@/pages/public-experience/booking")
    : import("@/pages/public-experience/site");
  page.catch(() => undefined);
}
