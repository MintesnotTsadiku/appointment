import { lazy } from "react";
import { Route } from "react-router-dom";

import ErrorFallback from "./components/error-fallback";

const PublicSitePage = lazy(() => import("@/pages/public-experience/site"));
const PublicBookingPage = lazy(() => import("@/pages/public-experience/booking"));

/**
 * A business website: the landing page (and its language), `/book`, the journal and the gallery. Both the
 * full application (route.tsx) and the lean website entry (site-main.tsx) serve these routes. Static
 * routes of the full application win; the resolver fails closed for unknown slugs.
 */
export function publicSiteRoutes() {
  return (
    <>
      <Route path="/:slug/blog" element={<PublicSitePage />} errorElement={<ErrorFallback />} />
      <Route path="/:slug/blog/:contentSlug" element={<PublicSitePage />} errorElement={<ErrorFallback />} />
      <Route path="/:slug/gallery" element={<PublicSitePage />} errorElement={<ErrorFallback />} />
      <Route path="/:slug/gallery/:contentSlug" element={<PublicSitePage />} errorElement={<ErrorFallback />} />
      <Route path="/:slug/book" element={<PublicBookingPage />} errorElement={<ErrorFallback />} />
      <Route path="/:slug/:locale" element={<PublicSitePage />} errorElement={<ErrorFallback />} />
      <Route path="/:slug" element={<PublicSitePage />} errorElement={<ErrorFallback />} />
    </>
  );
}
